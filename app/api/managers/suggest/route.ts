import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { companyInitials, companyLogoSrc } from "../../../../src/lib/company-logo";
import { normalizeCompanyName, slugify } from "../../../../src/lib/reviews";
import { managerPath } from "../../../../src/lib/seo";

/**
 * Typeahead behind the hero search box.
 *
 * Deliberately not /api/search: that endpoint only returns managers who already
 * have an approved review, which is right for a results page and wrong here —
 * the whole point of suggesting is to find the profile before there is anything
 * on it. This one matches names first and lets unreviewed profiles through.
 *
 *   GET /api/managers/suggest?q=jane%20do&company=amazon
 */

// Two characters is where the result set stops being everyone.
const MIN_QUERY = 2;
const LIMIT = 6;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const company = searchParams.get("company")?.trim() ?? "";

  if (q.length < MIN_QUERY || !process.env.DATABASE_URL) {
    return NextResponse.json({ managers: [], company: null });
  }

  try {
    const managers = await prisma.manager.findMany({
      where: {
        // Name only. Matching titles here would answer "engineering manager"
        // with a hundred unrelated people, which is not what someone typing a
        // person's name is looking for.
        name: { contains: q, mode: "insensitive" },
        ...(company ? { company: { name: { contains: company, mode: "insensitive" } } } : {}),
      },
      // Profiles with reviews are the ones worth reading, so they surface
      // above the long tail of imported names that share a prefix.
      orderBy: [{ reviews: { _count: "desc" } }, { name: "asc" }],
      take: LIMIT,
      include: { company: true },
    });

    return NextResponse.json({
      company: await resolveCompany(company),
      managers: managers.map((manager) => ({
        id: manager.id,
        name: manager.name,
        title: manager.title,
        company: manager.company.name,
        profilePath: managerPath(manager.company.slug, manager.slug),
        // Resolved server-side: the lookup stats the filesystem, so the client
        // gets a url or a null and renders the initials tile itself.
        logoSrc: companyLogoSrc(manager.company.slug),
        initials: companyInitials(manager.company.name),
      })),
    });
  } catch {
    // A dead suggest endpoint must not break typing. Fall back to no results.
    return NextResponse.json({ managers: [], company: null });
  }
}

/**
 * The company the typed text names, if it is one we know.
 *
 * Resolved through normalizeCompanyName and slugify — the same pair the
 * profile route uses — so "AWS", "Twitch" and "amazon" all land on the company
 * whose profile the client would actually navigate to. Falling back to a plain
 * name match keeps companies that predate the alias list reachable.
 */
async function resolveCompany(input: string) {
  if (!input) return null;

  const slug = slugify(normalizeCompanyName(input));
  const company =
    (slug ? await prisma.company.findUnique({ where: { slug } }) : null) ??
    (await prisma.company.findFirst({ where: { name: { equals: input, mode: "insensitive" } } }));

  if (!company) return null;

  return {
    name: company.name,
    slug: company.slug,
    logoSrc: companyLogoSrc(company.slug),
    initials: companyInitials(company.name),
  };
}
