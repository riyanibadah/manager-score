import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { requireAdmin } from "../../../../../src/lib/admin";
import { prisma } from "../../../../../src/lib/prisma";

// Remove a blog comment (moderation). Admin-only.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(await headers());
    const { id } = await params;
    await prisma.blogComment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete comment." }, { status: 400 });
  }
}
