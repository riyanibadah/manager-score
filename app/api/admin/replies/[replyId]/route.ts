import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { requireAdmin } from "../../../../../src/lib/admin";
import { prisma } from "../../../../../src/lib/prisma";

type ReplyAdminRouteProps = {
  params: Promise<{ replyId: string }>;
};

export async function PATCH(request: Request, { params }: ReplyAdminRouteProps) {
  try {
    await requireAdmin(await headers());
    const { replyId } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body?.status === "string" ? body.status.toUpperCase() : "HIDDEN";

    if (!["APPROVED", "HIDDEN", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid reply status." }, { status: 400 });
    }

    await prisma.reviewReply.update({
      where: { id: replyId },
      data: { status: status as "APPROVED" | "HIDDEN" | "REJECTED" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error, "Could not update reply.");
  }
}

export async function DELETE(_request: Request, { params }: ReplyAdminRouteProps) {
  try {
    await requireAdmin(await headers());
    const { replyId } = await params;
    await prisma.reviewReply.delete({ where: { id: replyId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error, "Could not delete reply.");
  }
}

function adminErrorResponse(error: unknown, fallback: string) {
  if (error instanceof Response) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Reply not found." }, { status: 404 });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 400 },
  );
}
