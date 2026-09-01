import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAdminSession } from "../../../src/lib/admin";
import { getAdminPosts } from "../../../src/lib/blog";
import AdminBlogRowActions from "../../../src/components/AdminBlogRowActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog admin", robots: { index: false, follow: false } };

export default async function AdminBlogPage() {
  const session = await getAdminSession(await headers());
  if (!session) notFound();

  const posts = await getAdminPosts();

  return (
    <main className="admin-dash">
      <nav className="admin-dash-topbar">
        <a className="brand" href="/">
          Manager<span>Score</span>
          <i />
        </a>
        <div className="admin-dash-topbar-actions">
          <span className="admin-dash-badge">Admin</span>
          <a className="btn-outline-dark" href="/admin">← Dashboard</a>
        </div>
      </nav>

      <header className="admin-dash-head">
        <div>
          <h1>Blog</h1>
          <p>{posts.length} post{posts.length === 1 ? "" : "s"}.</p>
        </div>
        <a className="btn-primary" href="/admin/blog/new">+ New post</a>
      </header>

      <section className="admin-report-list">
        {posts.length === 0 ? (
          <div className="admin-panel-card">
            <p className="admin-empty">No posts yet — write your first one.</p>
          </div>
        ) : (
          posts.map((p) => (
            <article className="admin-panel-card admin-blog-row" key={p.id}>
              <div>
                <div className="admin-blog-title">
                  <a href={`/admin/blog/${p.id}`}>{p.title}</a>
                  <span className={`admin-blog-status admin-blog-status-${p.status.toLowerCase()}`}>
                    {p.status === "PUBLISHED" ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="admin-report-meta">
                  /blog/{p.slug} · {p.commentCount} comment{p.commentCount === 1 ? "" : "s"} · updated{" "}
                  {new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <AdminBlogRowActions id={p.id} />
            </article>
          ))
        )}
      </section>
    </main>
  );
}
