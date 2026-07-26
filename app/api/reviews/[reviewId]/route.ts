import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../src/lib/prisma";
import { hashValue } from "../../../../src/lib/reviews";

type ReviewRouteProps = {
  params: Promise<{ reviewId: string }>;
};

export async function DELETE(request: Request, { params }: ReviewRouteProps) {
  try {
    const { reviewId } = await params;
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";

    if (!token || !matchesStoredToken(await storedTokenHash(reviewId), hashValue(token))) {
      return NextResponse.json(
        { error: "You can only delete a review you submitted." },
        { status: 403 },
      );
    }

    await prisma.review.delete({ where: { id: reviewId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete review." },
      { status: 400 },
    );
  }
}

async function storedTokenHash(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { deleteTokenHash: true },
  });
  return review?.deleteTokenHash ?? null;
}

function matchesStoredToken(stored: string | null, provided: string) {
  if (!stored) return false;
  const storedBuf = Buffer.from(stored);
  const providedBuf = Buffer.from(provided);
  if (storedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(storedBuf, providedBuf);
}
