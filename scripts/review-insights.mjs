/**
 * Read-only aggregate stats over the approved review corpus — the raw material
 * for a data-driven article. Writes nothing and mutates nothing.
 *
 *   node --env-file=.env.local scripts/review-insights.mjs
 *   # or: DATABASE_URL="postgres://..." node scripts/review-insights.mjs
 *
 * Every breakdown is annotated with its sample size, and anything under
 * MIN_PUBLISHABLE is marked "too small to publish". Slicing 350 reviews three
 * ways leaves subgroups that look like findings but are noise; the flag is
 * there so that distinction survives into the draft.
 */
import { PrismaClient } from "@prisma/client";

const MIN_PUBLISHABLE = 30;
const prisma = new PrismaClient();

const pct = (part, whole) => (whole ? ((part / whole) * 100).toFixed(1) : "0.0");
const mean = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function heading(text) {
  console.log(`\n${"=".repeat(64)}\n${text}\n${"=".repeat(64)}`);
}

/** Prints a labelled breakdown, flagging groups too small to draw a claim from. */
function breakdown(title, groups, total) {
  console.log(`\n${title}`);
  const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  if (!rows.length) {
    console.log("  (no data)");
    return;
  }

  for (const [label, reviews] of rows) {
    const n = reviews.length;
    const flag = n < MIN_PUBLISHABLE ? "  ⚠ too small to publish" : "";
    console.log(
      `  ${String(label).padEnd(26)} n=${String(n).padStart(4)}` +
        ` (${pct(n, total).padStart(5)}%)` +
        `  overall ${mean(reviews.map((r) => r.overall)).toFixed(2)}` +
        `  comm ${mean(reviews.map((r) => r.communication)).toFixed(2)}` +
        `  w/l ${mean(reviews.map((r) => r.worklife)).toFixed(2)}` +
        `  recog ${mean(reviews.map((r) => r.recognition)).toFixed(2)}` +
        `  again ${pct(reviews.filter((r) => r.wouldAgain).length, n)}%` +
        flag,
    );
  }
}

/** Buckets by a nullable string field, folding blanks into "(unspecified)". */
function groupBy(reviews, key) {
  const groups = new Map();
  for (const review of reviews) {
    const label = review[key]?.trim() || "(unspecified)";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(review);
  }
  return groups;
}

async function main() {
  const reviews = await prisma.review.findMany({
    where: { status: "APPROVED" },
    include: {
      tags: true,
      manager: { include: { company: true } },
    },
  });

  const total = reviews.length;
  if (!total) {
    console.log("No approved reviews found. Is DATABASE_URL pointing at production?");
    return;
  }

  heading("CORPUS");
  const managerIds = new Set(reviews.map((r) => r.managerId));
  const companyIds = new Set(reviews.map((r) => r.manager.company.id));
  console.log(`  approved reviews   ${total}`);
  console.log(`  managers covered   ${managerIds.size}`);
  console.log(`  companies covered  ${companyIds.size}`);
  console.log(`  reviews / manager  ${(total / managerIds.size).toFixed(2)} avg`);
  console.log(
    `  indexable profiles ${managerIds.size} manager pages + ${companyIds.size} company pages`,
  );

  heading("HEADLINE NUMBERS  (whole corpus — safe to publish)");
  console.log(`  overall            ${mean(reviews.map((r) => r.overall)).toFixed(2)} / 5`);
  console.log(`  communication      ${mean(reviews.map((r) => r.communication)).toFixed(2)} / 5`);
  console.log(`  work-life          ${mean(reviews.map((r) => r.worklife)).toFixed(2)} / 5`);
  console.log(`  recognition        ${mean(reviews.map((r) => r.recognition)).toFixed(2)} / 5`);
  console.log(
    `  would work again   ${pct(reviews.filter((r) => r.wouldAgain).length, total)}% of ${total}`,
  );

  // Which dimension drags the average down is the most quotable single finding
  // in the whole dataset, so surface it explicitly rather than by eyeballing.
  const dimensions = [
    ["communication", mean(reviews.map((r) => r.communication))],
    ["work-life balance", mean(reviews.map((r) => r.worklife))],
    ["recognition", mean(reviews.map((r) => r.recognition))],
  ].sort((a, b) => a[1] - b[1]);
  console.log(
    `\n  → lowest-scoring dimension: ${dimensions[0][0]} (${dimensions[0][1].toFixed(2)}), ` +
      `highest: ${dimensions[2][0]} (${dimensions[2][1].toFixed(2)})`,
  );

  heading("SCORE DISTRIBUTION");
  for (let bucket = 1; bucket <= 5; bucket++) {
    const inBucket = reviews.filter(
      (r) => r.overall >= bucket && (bucket === 5 ? r.overall <= 5 : r.overall < bucket + 1),
    );
    const bar = "█".repeat(Math.round((inBucket.length / total) * 50));
    console.log(
      `  ${bucket}–${bucket === 5 ? 5 : bucket + 1}  ${String(inBucket.length).padStart(4)}` +
        ` (${pct(inBucket.length, total).padStart(5)}%)  ${bar}`,
    );
  }

  heading("BREAKDOWNS");
  breakdown("By employment type", groupBy(reviews, "employmentType"), total);
  breakdown("By employee status", groupBy(reviews, "employeeStatus"), total);
  breakdown("By working relationship", groupBy(reviews, "workedWith"), total);
  breakdown("By reviewer role", groupBy(reviews, "reviewerRole"), total);
  breakdown(
    "By manager title",
    groupBy(
      reviews.map((r) => ({ ...r, _title: r.manager.title })),
      "_title",
    ),
    total,
  );

  heading("TAGS  (what people actually say)");
  const tagCounts = new Map();
  for (const review of reviews) {
    for (const tag of review.tags) {
      const key = `${tag.tag.toLowerCase()}|${tag.sentiment}`;
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    }
  }
  const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const sentiment of ["NEGATIVE", "POSITIVE", "NEUTRAL"]) {
    console.log(`\n  ${sentiment}`);
    const rows = sortedTags.filter(([key]) => key.endsWith(`|${sentiment}`)).slice(0, 12);
    if (!rows.length) console.log("    (none)");
    for (const [key, count] of rows) {
      console.log(
        `    ${key.split("|")[0].padEnd(26)} ${String(count).padStart(4)}` +
          `  appears in ${pct(count, total)}% of reviews`,
      );
    }
  }

  heading("COMPANIES  (per-company claims need n≥30 — most will not qualify)");
  const byCompany = groupBy(
    reviews.map((r) => ({ ...r, _company: r.manager.company.name })),
    "_company",
  );
  const companyRows = [...byCompany.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15);
  for (const [name, group] of companyRows) {
    const flag = group.length < MIN_PUBLISHABLE ? "  ⚠ directional only" : "";
    console.log(
      `  ${name.padEnd(28)} n=${String(group.length).padStart(4)}` +
        `  overall ${mean(group.map((r) => r.overall)).toFixed(2)}${flag}`,
    );
  }

  heading("VOLUME OVER TIME");
  const byMonth = new Map();
  for (const review of reviews) {
    const month = review.createdAt.toISOString().slice(0, 7);
    byMonth.set(month, (byMonth.get(month) || 0) + 1);
  }
  for (const [month, count] of [...byMonth.entries()].sort()) {
    console.log(`  ${month}  ${String(count).padStart(4)}  ${"█".repeat(Math.min(count, 50))}`);
  }

  heading("LONG-TAIL COVERAGE");
  const perManager = new Map();
  for (const review of reviews) {
    perManager.set(review.managerId, (perManager.get(review.managerId) || 0) + 1);
  }
  const counts = [...perManager.values()];
  for (const threshold of [1, 2, 3, 5, 10]) {
    const qualifying = counts.filter((count) => count >= threshold).length;
    console.log(`  managers with ≥${threshold} review(s):  ${String(qualifying).padStart(4)}`);
  }
  console.log(
    `\n  Every one of these ${managerIds.size} managers is a page that could rank for` +
      ` "<name> review". No competitor's entire sitemap exceeds 15 urls.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
