"use client";

import { useState } from "react";

type EditorPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  body: string;
  status: "DRAFT" | "PUBLISHED";
};

export default function BlogEditor({ post }: { post?: EditorPost }) {
  const editing = Boolean(post?.id);
  const [form, setForm] = useState({
    title: post?.title || "",
    slug: post?.slug || "",
    excerpt: post?.excerpt || "",
    coverImage: post?.coverImage || "",
    body: post?.body || "",
    status: post?.status || ("DRAFT" as "DRAFT" | "PUBLISHED"),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(status: "DRAFT" | "PUBLISHED") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(editing ? `/api/admin/blog/${post!.id}` : "/api/admin/blog", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not save post.");
      window.location.href = "/admin/blog";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save post.");
      setBusy(false);
    }
  }

  return (
    <div className="blog-editor">
      <label className="blog-field">
        <span>Title</span>
        <input className="field-input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="What employees complain about most" />
      </label>

      <div className="blog-field-row">
        <label className="blog-field">
          <span>Slug <small>optional — auto from title</small></span>
          <input className="field-input" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="most-common-complaints" />
        </label>
        <label className="blog-field">
          <span>Cover image URL <small>optional</small></span>
          <input className="field-input" type="url" value={form.coverImage} onChange={(e) => set("coverImage", e.target.value)} placeholder="https://…" />
        </label>
      </div>

      <label className="blog-field">
        <span>Excerpt <small>preview + meta description</small></span>
        <textarea className="field-input" style={{ minHeight: 64 }} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="A short summary that shows in listings and search results." />
      </label>

      <label className="blog-field">
        <span>Body <small>Markdown — # heading, **bold**, *italic*, [link](url), - lists, &gt; quote, ``` code</small></span>
        <textarea className="field-input blog-body-input" value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Write your post in Markdown…" />
      </label>

      {error ? <div className="blog-editor-error">{error}</div> : null}

      <div className="blog-editor-actions">
        <button type="button" className="btn-outline-dark" onClick={() => save("DRAFT")} disabled={busy}>
          {busy ? "Saving…" : "Save draft"}
        </button>
        <button type="button" className="btn-primary" onClick={() => save("PUBLISHED")} disabled={busy}>
          {busy ? "Saving…" : editing && post?.status === "PUBLISHED" ? "Update & keep live" : "Publish"}
        </button>
      </div>
    </div>
  );
}
