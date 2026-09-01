import type { Metadata } from "next";
import { getPublishedPosts } from "../../src/lib/blog";
import { siteUrl } from "../../src/lib/seo";
import SiteFooter from "../../src/components/SiteFooter";

// Cacheable: the index has no per-visitor content. Revalidates so a new post
// shows up within a few minutes without a rebuild.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const url = `${siteUrl()}/blog`;
  const description =
    "Guides and original data on managers, workplace culture, and how to size up your next boss — from the team behind ManagerScore.";
  return {
    title: "Blog",
    description,
    alternates: { canonical: url },
    openGraph: { title: "ManagerScore Blog", description, url, type: "website" },
    twitter: { card: "summary", title: "ManagerScore Blog", description },
  };
}

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <main className="blog-page">
      <nav className="profile-topbar">
        <a className="brand" href="/">
          Manager<span>Score</span>
          <i />
        </a>
        <a className="btn-primary" href="/">← Reviews</a>
      </nav>

      <header className="blog-hero">
        <p className="profile-kicker">ManagerScore</p>
        <h1>The Blog</h1>
        <p>Guides and data on managers, workplace culture, and evaluating your next boss.</p>
      </header>

      <section className="blog-grid">
        {posts.length === 0 ? (
          <p className="admin-empty">No posts yet — check back soon.</p>
        ) : (
          posts.map((p) => (
            <a className="blog-card" key={p.slug} href={`/blog/${p.slug}`}>
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="blog-card-cover" src={p.coverImage} alt="" loading="lazy" />
              ) : null}
              <div className="blog-card-body">
                <h2>{p.title}</h2>
                <p>{p.excerpt}</p>
                <span className="blog-card-date">
                  {new Date(p.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </a>
          ))
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
