import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../src/lib/prisma";
import { canonicalManagerNameForSlug, isFullPersonName, normalizeCompanyName, slugify } from "../../../src/lib/reviews";
import { managerPath } from "../../../src/lib/seo";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured yet." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const managerName = cleanName(body?.managerName);
    const companyName = normalizeCompanyName(cleanName(body?.company));
    const companySlug = slugify(companyName);
    const managerSlug = slugify(canonicalManagerNameForSlug(managerName));

    if (!managerName || !companyName || !companySlug || !managerSlug) {
      return NextResponse.json({ error: "Manager name and company are required." }, { status: 400 });
    }

    if (!isFullPersonName(managerName)) {
      return NextResponse.json({ error: "Please enter the manager's first and last name." }, { status: 400 });
    }

    const existing = await prisma.manager.findFirst({
      where: { slug: managerSlug, company: { slug: companySlug } },
      include: { company: true },
    });

    if (existing) {
      return NextResponse.json({
        profilePath: managerPath(existing.company.slug, existing.slug),
        created: false,
      });
    }

    const company = await prisma.company.upsert({
      where: { slug: companySlug },
      update: {},
      create: { name: companyName, slug: companySlug },
    });

    try {
      const manager = await prisma.manager.create({
        data: {
          name: managerName,
          slug: managerSlug,
          title: "",
          companyId: company.id,
        },
      });

      return NextResponse.json(
        { profilePath: managerPath(company.slug, manager.slug), created: true },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const created = await prisma.manager.findFirst({
          where: { slug: managerSlug, company: { slug: companySlug } },
          include: { company: true },
        });
        if (created) {
          return NextResponse.json({
            profilePath: managerPath(created.company.slug, created.slug),
            created: false,
          });
        }
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create manager profile." },
      { status: 400 },
    );
  }
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}
