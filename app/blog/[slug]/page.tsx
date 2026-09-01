import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPostBySlug } from "../../../src/lib/blog";
import { renderMarkdown } from "../../../src/lib/markdown";
import { getAdminSession } from "../../../src/lib/admin";
import { siteUrl } from "../../../src/lib/seo";
import SiteFooter from "../../../src/components/SiteFooter";
import BlogComments from "../../../src/components/BlogComments";
import AdSense from "../../../src/components/AdSense";

// Reads the session to decide whether to show admin comment controls.
export const dynamic = "force-dynamic";

type PostPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found", robots: { index: false, follow: false } };

  const url = `${siteUrl()}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: "article",
      images: post.coverImage ? [post.coverImage] : undefined,
    },
    twitter: {
      card: post.coverImage ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const isAdmin = Boolean(await getAdminSession(await headers()));
  const html = renderMarkdown(post.body);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "ManagerScore", url: siteUrl() },
    publisher: { "@type": "Organization", name: "ManagerScore", url: siteUrl() },
    mainEntityOfPage: `${siteUrl()}/blog/${post.slug}`,
    ...(post.coverImage ? { image: post.coverImage } : {}),
  };

  return (
    <main className="blog-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AdSense />
      <nav className="profile-topbar">
        <a className="brand" href="/">
          Manager<span>Score</span>
          <i />
        </a>
        <a className="btn-primary" href="/blog">← Blog</a>
      </nav>

      <article className="blog-article">
        <p className="profile-kicker">
          {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          {" · "}
          {post.authorName}
        </p>
        <h1>{post.title}</h1>
        <p className="blog-article-excerpt">{post.excerpt}</p>
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="blog-article-cover" src={post.coverImage} alt="" />
        ) : null}
        <div className="blog-article-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      <div className="blog-comments-wrap">
        <BlogComments slug={post.slug} initialComments={post.comments} isAdmin={isAdmin} />
      </div>

      <SiteFooter />
    </main>
  );
}
