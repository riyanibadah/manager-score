import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAdminSession } from "../../../../src/lib/admin";
import { getAdminPost } from "../../../../src/lib/blog";
import BlogEditor from "../../../../src/components/BlogEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit post", robots: { index: false, follow: false } };

export default async function EditBlogPost({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(await headers());
  if (!session) notFound();

  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  return (
    <main className="admin-dash">
      <nav className="admin-dash-topbar">
        <a className="brand" href="/">
          Manager<span>Score</span>
          <i />
        </a>
        <div className="admin-dash-topbar-actions">
          <span className="admin-dash-badge">Admin</span>
          {post.status === "PUBLISHED" ? (
            <a className="btn-outline-dark" href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">View ↗</a>
          ) : null}
          <a className="btn-outline-dark" href="/admin/blog">← Blog</a>
        </div>
      </nav>
      <header className="admin-dash-head">
        <div>
          <h1>Edit post</h1>
        </div>
      </header>
      <section className="admin-report-list">
        <div className="admin-panel-card">
          <BlogEditor post={post} />
        </div>
      </section>
    </main>
  );
}
