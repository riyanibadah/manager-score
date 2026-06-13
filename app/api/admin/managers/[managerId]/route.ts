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

    const manager = await prisma.manager.update({
      where: { id: managerId },
      data: {
        name,
        slug: managerSlug,
        title,
        department: department || null,
        linkedinUrl: linkedinUrl || null,
        companyId: company.id,
      },
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
