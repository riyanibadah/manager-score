import { escapeHtml } from "./html";

/**
 * Minimal self-contained confirmation page for links opened straight from an
 * email client. Served as HTML from the route so the flow needs no extra page
 * and no client-side JavaScript.
 */
export function notificationResultPage({
  title,
  message,
  linkHref,
  linkLabel,
}: {
  title: string;
  message: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${escapeHtml(title)} | ManagerScore</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #f8fafc;
    color: #0f172a;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card {
    max-width: 440px;
    width: 100%;
    padding: 36px 32px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.10);
    text-align: center;
  }
  .brand { font-size: 20px; font-weight: 850; margin-bottom: 20px; }
  .brand span { color: #5b2df5; }
  h1 { font-size: 21px; font-weight: 800; margin: 0 0 10px; }
  p { font-size: 15px; line-height: 1.65; color: #64748b; margin: 0 0 22px; }
  a {
    display: inline-block;
    padding: 12px 20px;
    border-radius: 11px;
    background: linear-gradient(135deg, #5b2df5, #682df4);
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    text-decoration: none;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">Manager<span>Score</span></div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    ${linkHref ? `<a href="${escapeHtml(linkHref)}">${escapeHtml(linkLabel || "Continue")}</a>` : ""}
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
