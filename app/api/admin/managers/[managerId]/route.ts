import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { requireAdmin } from "../../../../../src/lib/admin";
import { prisma } from "../../../../../src/lib/prisma";
import { canonicalManagerNameForSlug, normalizeCompanyName, slugify } from "../../../../../src/lib/reviews";
import { managerPath } from "../../../../../src/lib/seo";

type ManagerAdminRouteProps = {
  params: Promise<{ managerId: string }>;
};

export async function PATCH(request: Request, { params }: ManagerAdminRouteProps) {
  try {
    await requireAdmin(await headers());
    const { managerId } = await params;
    const body = await request.json();
    const name = clean(body?.name);
    const title = clean(body?.title);
    const department = clean(body?.department);
    const companyName = normalizeCompanyName(clean(body?.company));
    const linkedinUrl = clean(body?.linkedinUrl);

    if (!name || !companyName) {
      return NextResponse.json({ error: "Manager name and company are required." }, { status: 400 });
    }

    const companySlug = slugify(companyName);
    const managerSlug = slugify(canonicalManagerNameForSlug(name));

    if (!companySlug || !managerSlug) {
      return NextResponse.json({ error: "Manager name and company are required." }, { status: 400 });
    }

    const company = await prisma.company.upsert({
      where: { slug: companySlug },
      update: { name: companyName },
      create: { name: companyName, slug: companySlug },
    });

    const data = {
      name,
      slug: managerSlug,
      title,
      department: department || null,
      linkedinUrl: linkedinUrl || null,
      companyId: company.id,
    };

    // Correcting a misspelled name or company usually lands on the profile that
    // should have been used all along — and [companyId, slug] is unique, so the
    // plain update fails with the correct value in the box and no way forward.
    // Two rows for one person is the actual problem, so offer to merge.
    const clash = await prisma.manager.findUnique({
      where: { companyId_slug: { companyId: company.id, slug: managerSlug } },
      include: { company: true, _count: { select: { reviews: true } } },
    });

    if (clash && clash.id !== managerId) {
      if (!body?.merge) {
        // Reported rather than merged silently: collapsing two profiles moves
        // reviews and deletes a row, which the admin should choose knowingly.
        return NextResponse.json(
          {
            error: `A profile for ${clash.name} at ${clash.company.name} already exists.`,
            conflict: {
              managerId: clash.id,
              name: clash.name,
              company: clash.company.name,
              reviewCount: clash._count.reviews,
              profilePath: managerPath(clash.company.slug, clash.slug),
            },
          },
          { status: 409 },
        );
      }

      const merged = await prisma.$transaction(async (tx) => {
        // Reviews are the only rows pointing at a manager; tags, replies,
        // reports, votes and subscriptions all hang off the review, so moving
        // these carries the whole thread with them.
        await tx.review.updateMany({
          where: { managerId },
          data: { managerId: clash.id },
        });

        // The edited fields are what the admin just typed, so they win over
        // whatever the surviving row held.
        const target = await tx.manager.update({
          where: { id: clash.id },
          data,
          include: { company: true },
        });

        // Safe now that nothing references it: the cascade would otherwise
        // have taken the reviews we just moved.
        await tx.manager.delete({ where: { id: managerId } });
        return target;
      });

      return NextResponse.json({
        id: merged.id,
        merged: true,
        profilePath: managerPath(merged.company.slug, merged.slug),
      });
    }

    const manager = await prisma.manager.update({
      where: { id: managerId },
      data,
      include: { company: true },
    });

    return NextResponse.json({
      id: manager.id,
      profilePath: managerPath(manager.company.slug, manager.slug),
    });
  } catch (error) {
    return adminErrorResponse(error, "Could not update manager.");
  }
}

export async function DELETE(_request: Request, { params }: ManagerAdminRouteProps) {
  try {
    await requireAdmin(await headers());
    const { managerId } = await params;
    await prisma.manager.delete({ where: { id: managerId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error, "Could not delete manager.");
  }
}

function clean(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function adminErrorResponse(error: unknown, fallback: string) {
  if (error instanceof Response) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json(
      { error: "Another manager profile already uses that name and company." },
      { status: 409 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Manager not found." }, { status: 404 });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 400 },
  );
}
