import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { auth } from "../../../../src/lib/auth";

// Commenting requires a signed-in account (keeps spam down and gives each
// comment a real, accountable name — blog discussion isn't anonymous the way
// manager reviews are).
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Comments aren't available yet." }, { status: 503 });
  }

  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const text = typeof body?.body === "string" ? body.body.trim().slice(0, 4000) : "";
    if (!slug) return NextResponse.json({ error: "Missing post." }, { status: 400 });
    if (text.length < 2) return NextResponse.json({ error: "Write a comment first." }, { status: 400 });

    const post = await prisma.blogPost.findFirst({ where: { slug, status: "PUBLISHED" }, select: { id: true } });
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.blogComment.count({
      where: { userId: session.user.id, createdAt: { gte: hourAgo } },
    });
    if (recent >= 10) {
      return NextResponse.json({ error: "You're commenting too fast — try again shortly." }, { status: 429 });
    }

    const authorName = (session.user.name?.trim() || session.user.email?.split("@")[0] || "Reader").slice(0, 120);
    const created = await prisma.blogComment.create({
      data: { postId: post.id, userId: session.user.id, authorName, body: text },
    });

    return NextResponse.json(
      { id: created.id, authorName, body: text, createdAt: created.createdAt.toISOString() },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not post comment." },
      { status: 400 },
    );
  }
}
