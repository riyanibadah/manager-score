import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { requireAdmin } from "../../../../src/lib/admin";
import { prisma } from "../../../../src/lib/prisma";
import { blogSlugify, normalizeBlogInput } from "../../../../src/lib/blog";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin(await headers());
    const fields = normalizeBlogInput(await request.json().catch(() => ({})));
    if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });

    const created = await prisma.blogPost.create({
      data: {
        slug: fields.slug || blogSlugify(fields.title),
        title: fields.title,
        excerpt: fields.excerpt,
        body: fields.body,
        coverImage: fields.coverImage || null,
        status: fields.status,
        authorId: session.user?.id,
        publishedAt: fields.status === "PUBLISHED" ? new Date() : null,
      },
    });

    return NextResponse.json({ id: created.id, slug: created.slug }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A post with that slug already exists — change the title or slug." }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save post." }, { status: 400 });
  }
}
