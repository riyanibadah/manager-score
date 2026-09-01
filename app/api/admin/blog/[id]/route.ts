import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { requireAdmin } from "../../../../../src/lib/admin";
import { prisma } from "../../../../../src/lib/prisma";
import { blogSlugify, normalizeBlogInput } from "../../../../../src/lib/blog";

type BlogRouteProps = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: BlogRouteProps) {
  try {
    await requireAdmin(await headers());
    const { id } = await params;
    const fields = normalizeBlogInput(await request.json().catch(() => ({})));
    if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });

    const existing = await prisma.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });
    if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const updated = await prisma.blogPost.update({
      where: { id },
      data: {
        slug: fields.slug || blogSlugify(fields.title),
        title: fields.title,
        excerpt: fields.excerpt,
        body: fields.body,
        coverImage: fields.coverImage || null,
        status: fields.status,
        // Stamp the first publish; keep the original date on re-publish; clear on unpublish.
        publishedAt: fields.status === "PUBLISHED" ? existing.publishedAt ?? new Date() : null,
      },
    });

    return NextResponse.json({ id: updated.id, slug: updated.slug });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A post with that slug already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save post." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: BlogRouteProps) {
  try {
    await requireAdmin(await headers());
    const { id } = await params;
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete post." }, { status: 400 });
  }
}
