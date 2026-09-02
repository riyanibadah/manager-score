import { prisma } from "./prisma";
import { slugify } from "./reviews";

export function blogSlugify(title: string) {
  return slugify(title) || "post";
}

/** Published posts for the /blog index. */
export async function getPublishedPosts() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true, createdAt: true },
    });
    return posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverImage: p.coverImage,
      publishedAt: (p.publishedAt ?? p.createdAt).toISOString(),
    }));
  } catch (error) {
    console.error("getPublishedPosts failed:", error);
    return [];
  }
}

/** One published post with its approved comments, for /blog/[slug]. */
export async function getPostBySlug(slug: string) {
  if (!process.env.DATABASE_URL) return null;
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: {
        author: { select: { name: true } },
        comments: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "asc" },
          select: { id: true, authorName: true, body: true, createdAt: true },
        },
      },
    });
    if (!post) return null;
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      coverImage: post.coverImage,
      authorName: post.author?.name || "ManagerScore",
      publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      comments: post.comments.map((c) => ({
        id: c.id,
        authorName: c.authorName,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("getPostBySlug failed:", error);
    return null;
  }
}

/** Published slugs + lastmod, for the sitemap. */
export async function getPublishedPostRefs() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });
    return posts.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt }));
  } catch (error) {
    console.error("getPublishedPostRefs failed:", error);
    return [];
  }
}

/** Every post (draft + published) for the admin list. */
export async function getAdminPosts() {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
        _count: { select: { comments: true } },
      },
    });
    return posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
      commentCount: p._count.comments,
    }));
  } catch (error) {
    console.error("getAdminPosts failed:", error);
    return [];
  }
}

/** A single post for the admin editor. */
export async function getAdminPost(id: string) {
  try {
    const p = await prisma.blogPost.findUnique({ where: { id } });
    if (!p) return null;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      coverImage: p.coverImage ?? "",
      status: p.status,
    };
  } catch (error) {
    console.error("getAdminPost failed:", error);
    return null;
  }
}

export type BlogInput = {
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
  status: "DRAFT" | "PUBLISHED";
  slug: string;
};

/** Validate + clean admin post input. Returns { error } on any problem. */
export function normalizeBlogInput(input: unknown): BlogInput | { error: string } {
  const b = (input ?? {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 200) : "";
  const excerpt = typeof b.excerpt === "string" ? b.excerpt.trim().slice(0, 400) : "";
  const body = typeof b.body === "string" ? b.body.trim() : "";
  const coverImage = typeof b.coverImage === "string" ? b.coverImage.trim().slice(0, 600) : "";
  const status = b.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const slugRaw = typeof b.slug === "string" ? b.slug.trim() : "";

  if (!title) return { error: "Title is required." };
  if (!excerpt) return { error: "An excerpt is required — it's the preview and meta description." };
  if (body.length < 20) return { error: "Write a bit more before saving." };
  if (coverImage && !/^(https?:\/\/|\/|data:image\/)/i.test(coverImage)) return { error: "Cover image must be a URL." };

  return {
    title,
    excerpt,
    body,
    coverImage,
    status,
    slug: slugRaw ? blogSlugify(slugRaw) : "",
  };
}
