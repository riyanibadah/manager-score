import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompanyProfile } from "../../../src/lib/public-data";
import CompanyLogo from "../../../src/components/CompanyLogo";
import { companyPath, siteUrl } from "../../../src/lib/seo";

type CompanyPageProps = {
  params: Promise<{ companySlug: string }>;
};

// No cookies or session are read here, so unlike the manager profile this page
// can be cached and served from the edge. Hourly is well inside how fast a new
// manager shows up for a company.
export const revalidate = 3600;

export async function generateMetadata({ params }: CompanyPageProps): Promise<Metadata> {
  const { companySlug } = await params;
  const company = await getCompanyProfile(companySlug);

  if (!company) {
    return {
      title: "Company Manager Reviews",
      robots: { index: false, follow: false },
    };
  }

  const title = `${company.name} Manager Reviews`;
  const description = `Anonymous employee reviews of ${company.managerCount} manager${
    company.managerCount === 1 ? "" : "s"
  } at ${company.name}. Read what employees say about communication, support for growth, and work-life balance.`;
  const url = `${siteUrl()}${companyPath(company.slug)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ManagerScore`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | ManagerScore`,
      description,
    },
  };
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { companySlug } = await params;
  const company = await getCompanyProfile(companySlug);

  if (!company) notFound();

  const reviewHref = `/?review=1&company=${encodeURIComponent(company.name)}`;

  // ItemList of profile links only. Ratings are intentionally absent: they sit
  // behind the unlock wall, and marking up a score the page doesn't render
  // would be structured-data spam.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${company.name} Manager Reviews`,
    url: `${siteUrl()}${company.companyPath}`,
    about: {
      "@type": "Organization",
      name: company.name,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: company.managerCount,
      itemListElement: company.managers.map((manager, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl()}${manager.profilePath}`,
        name: `${manager.name}, ${manager.title} at ${company.name}`,
      })),
    },
  };

  return (
    <main className="profile-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="profile-topbar">
        <a className="brand" href="/">
          Manager<span>Score</span><i />
        </a>
        <a className="btn-primary" href={reviewHref}>Write review</a>
      </nav>

      <section className="profile-hero company-hero company-hero-with-logo">
        <CompanyLogo name={company.name} slug={company.slug} size={80} />
        <div>
          <p className="profile-kicker">Company</p>
          <h1>{company.name} Manager Reviews</h1>
          <p className="profile-subtitle">
            {company.managerCount} manager{company.managerCount === 1 ? "" : "s"} reviewed
            {" · "}
            {company.reviewCount} anonymous review{company.reviewCount === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      <section className="profile-summary">
        <p>
          Employees have anonymously reviewed {company.managerCount} manager
          {company.managerCount === 1 ? "" : "s"} at {company.name}, covering communication, support
          for growth, and work-life balance. Open a profile to see the full rating breakdown.
        </p>
      </section>

      <section className="profile-section">
        <h2>Managers at {company.name}</h2>
        <div className="profile-review-list">
          {company.managers.map((manager) => (
            <a
              className="profile-review-card company-manager-card"
              key={manager.id}
              href={manager.profilePath}
            >
              <header>
                <div>
                  <strong>{manager.name}</strong>
                  <p>
                    {manager.title}
                    {manager.department ? ` · ${manager.department}` : ""}
                  </p>
                </div>
                <span className="company-manager-count">
                  {manager.reviewCount} review{manager.reviewCount === 1 ? "" : "s"}
                </span>
              </header>
            </a>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-empty-state">
          <strong>Worked with a manager at {company.name}?</strong>
          <p>
            Add an anonymous review to help the next person decide — and unlock the full ratings
            across every profile.
          </p>
          <a className="btn-primary" href={reviewHref}>Write an anonymous review →</a>
        </div>
      </section>

      {/* Shorter than the profile-page version: this page ranks managers by
          score, so it needs the same "opinions, not facts" framing and the
          same trademark line, but the subject-specific redress route belongs
          on the individual's own page. */}
      <section className="profile-disclaimer" data-nosnippet>
        <p>
          Ratings and rankings on this page come from anonymous employee reviews — personal
          opinions, not verified statements of fact, and not the views of ManagerScore. They
          reflect only the people who chose to submit a review.
        </p>
        <p>
          ManagerScore is not affiliated with, endorsed by, or sponsored by {company.name}. Company
          names and logos are trademarks of their respective owners, used to identify the workplace
          a review refers to. See our <a href="/terms">Terms of Service</a>.
        </p>
      </section>
    </main>
  );
}
