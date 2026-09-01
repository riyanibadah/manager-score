import type { ReactNode } from "react";

/**
 * One footer for every page. Presentational only (no client hooks), so it drops
 * into both the client home app and the server-rendered profile/company/legal
 * pages. The optional disclaimer slot carries page-specific legal text above the
 * shared nav + copyright line, which keeps the chrome identical everywhere.
 */
export default function SiteFooter({ disclaimer }: { disclaimer?: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        {disclaimer ? <div className="site-footer-disclaimer">{disclaimer}</div> : null}
        <div className="site-footer-top">
          <a className="brand" href="/">
            Manager<span>Score</span>
          </a>
          <nav aria-label="Footer">
            <a href="/">Home</a>
            <a href="/blog">Blog</a>
            <a href="/#reviews">Reviews</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
        <div className="site-footer-copy">
          © {year} ManagerScore · Anonymous manager reviews. Ratings are personal opinions, not
          statements of fact.
        </div>
      </div>
    </footer>
  );
}
