import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { requireAdmin } from "../../../../../src/lib/admin";
import { prisma } from "../../../../../src/lib/prisma";

type ReviewAdminRouteProps = {
  params: Promise<{ reviewId: string }>;
};

export async function PATCH(request: Request, { params }: ReviewAdminRouteProps) {
  try {
    await requireAdmin(await headers());
    const { reviewId } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body?.status === "string" ? body.status.toUpperCase() : "HIDDEN";

    if (!["APPROVED", "HIDDEN", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid review status." }, { status: 400 });
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { status: status as "APPROVED" | "HIDDEN" | "REJECTED" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error, "Could not update review.");
  }
}

export async function DELETE(_request: Request, { params }: ReviewAdminRouteProps) {
  try {
    await requireAdmin(await headers());
    const { reviewId } = await params;
    await prisma.review.delete({ where: { id: reviewId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error, "Could not delete review.");
  }
}

function adminErrorResponse(error: unknown, fallback: string) {
  if (error instanceof Response) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 400 },
  );
}
