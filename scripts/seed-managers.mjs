/**
 * Bulk-import manager profiles from collected JSON into Company/Manager rows.
 *
 *   node --env-file=.env.local scripts/seed-managers.mjs --data ./managers_data
 *   node --env-file=.env.local scripts/seed-managers.mjs --data ./managers_data --commit
 *
 * DRY RUN BY DEFAULT. Without --commit it connects read-only, resolves every
 * row against what is already in the database, and prints exactly what would
 * change. Nothing is written until you pass --commit.
 *
 * Input is any JSON file (or directory of them) holding an array of
 *   { name, company, position, linkedin, manager_id }
 *
 * Only ever creates. Managers that already exist are left untouched rather
 * than having their title or linkedinUrl overwritten, so a re-run can never
 * clobber data edited through the admin UI. That also makes this idempotent:
 * running it twice imports nothing the second time.
 *
 * Ratings are deliberately not imported. Nothing in the source carries a real
 * score (every rating field is 0.0), and a manager's score is derived from
 * Review rows, so these arrive as profiles with no reviews.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Kept byte-identical to slugify / canonicalManagerNameForSlug / isFullPersonName
// in src/lib/reviews.ts. A seeded slug that disagrees with the one the app
// generates on submission would fork a manager into two profiles, so if those
// helpers change, change these too.
function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function canonicalManagerNameForSlug(value) {
  const parts = value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part.replace(/(^[^A-Za-z0-9]+|[^A-Za-z0-9.]+$)/g, ""))
    .filter(Boolean);

  const withoutSuffix = parts.filter((part, index) => {
    const normalized = part.toLowerCase().replace(/\./g, "");
    const isLast = index === parts.length - 1;
    return !(isLast && ["jr", "sr", "ii", "iii", "iv", "v"].includes(normalized));
  });

  return withoutSuffix
    .filter((part, index) => {
      const normalized = part.replace(/\./g, "");
      const isMiddle = index > 0 && index < withoutSuffix.length - 1;
      return !(isMiddle && /^[A-Za-z]$/.test(normalized));
    })
    .join(" ");
}

function isFullPersonName(value) {
  return value
    .trim()
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part)).length >= 2;
}

function parseArgs(argv) {
  const dataPaths = [];
  let commit = false;

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--data") dataPaths.push(argv[++i]);
    else if (argv[i] === "--commit") commit = true;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }

  if (!dataPaths.length) throw new Error("pass at least one --data <file-or-dir>");
  return { dataPaths, commit };
}

/** Collects every .json file under the given files/directories, recursively. */
function collectJsonFiles(path, found = []) {
  const info = statSync(path);
  if (info.isDirectory()) {
    for (const entry of readdirSync(path)) collectJsonFiles(join(path, entry), found);
  } else if (extname(path) === ".json") {
    found.push(path);
  }
  return found;
}

function loadRecords(dataPaths) {
  const records = [];

  for (const path of dataPaths) {
    for (const file of collectJsonFiles(path)) {
      let parsed;
      try {
        parsed = JSON.parse(readFileSync(file, "utf8"));
      } catch {
        continue; // not one of ours (cursor state, config, ...)
      }
      if (!Array.isArray(parsed)) continue;
      for (const row of parsed) {
        if (row && row.name && row.company) records.push(row);
      }
    }
  }

  return records;
}

async function main() {
  const { dataPaths, commit } = parseArgs(process.argv.slice(2));

  const records = loadRecords(dataPaths);
  console.log(`Loaded ${records.length} records from ${dataPaths.join(", ")}`);
  if (!records.length) return;

  const skipped = { partialName: 0, noTitle: 0 };
  // companySlug -> { name, managers: Map<slug, row> }
  const companies = new Map();
  let collapsed = 0;

  for (const row of records) {
    const name = String(row.name).trim();
    const title = String(row.position || "").trim();

    // Same gate the submission API applies, so seeded profiles can't be shaped
    // differently from ones created through the app.
    if (!isFullPersonName(name)) {
      skipped.partialName += 1;
      continue;
    }
    if (!title) {
      skipped.noTitle += 1;
      continue;
    }

    const companyName = String(row.company).trim();
    const companySlug = slugify(companyName);
    const managerSlug = slugify(canonicalManagerNameForSlug(name));
    if (!companySlug || !managerSlug) {
      skipped.partialName += 1;
      continue;
    }

    if (!companies.has(companySlug)) {
      companies.set(companySlug, { name: companyName, managers: new Map() });
    }
    const company = companies.get(companySlug);

    // [companyId, slug] is unique, so two distinct people who share a name at
    // the same company necessarily become one profile. Count it rather than
    // letting the insert throw.
    if (company.managers.has(managerSlug)) {
      collapsed += 1;
      continue;
    }

    company.managers.set(managerSlug, {
      name,
      slug: managerSlug,
      title,
      linkedinUrl: String(row.linkedin || "").trim() || null,
    });
  }

  console.log(
    `Skipped ${skipped.partialName} partial names, ${skipped.noTitle} without a title; ` +
      `${collapsed} duplicate name+company collapsed`
  );

  let created = 0;
  let existing = 0;
  let companiesCreated = 0;

  for (const [companySlug, company] of companies) {
    const known = await prisma.company.findUnique({ where: { slug: companySlug } });

    if (!known) companiesCreated += 1;

    // In a dry run there is no company row to hang managers off, so every
    // manager under a brand-new company is by definition a create.
    const existingSlugs = known
      ? new Set(
          (
            await prisma.manager.findMany({
              where: { companyId: known.id },
              select: { slug: true },
            })
          ).map((m) => m.slug)
        )
      : new Set();

    const toCreate = [...company.managers.values()].filter((m) => !existingSlugs.has(m.slug));
    created += toCreate.length;
    existing += company.managers.size - toCreate.length;

    console.log(
      `  ${company.name.padEnd(12)} ${String(toCreate.length).padStart(6)} new, ` +
        `${String(company.managers.size - toCreate.length).padStart(6)} already present` +
        `${known ? "" : "  (new company)"}`
    );

    if (!commit) continue;

    const companyId =
      known?.id ??
      (
        await prisma.company.create({
          data: { name: company.name, slug: companySlug },
        })
      ).id;

    // skipDuplicates keeps a concurrent submission from breaking the batch.
    for (let i = 0; i < toCreate.length; i += 500) {
      const batch = toCreate.slice(i, i + 500);
      await prisma.manager.createMany({
        data: batch.map((m) => ({ ...m, companyId })),
        skipDuplicates: true,
      });
    }
  }

  console.log("=".repeat(52));
  console.log(`Companies: ${companiesCreated} new, ${companies.size - companiesCreated} existing`);
  console.log(`Managers:  ${created} to create, ${existing} already present`);

  if (commit) {
    console.log("\nCommitted.");
  } else {
    console.log("\nDRY RUN - nothing written. Re-run with --commit to apply.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
