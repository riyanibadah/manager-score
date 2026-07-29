import type { Metadata } from "next";
import { getReviewedCompanies } from "../../src/lib/public-data";
import CompanyLogo from "../../src/components/CompanyLogo";
import { siteUrl } from "../../src/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse Companies",
  description:
    "Browse every company with anonymous manager reviews on ManagerScore. Find your employer and see what employees say about their managers.",
  alternates: { canonical: "/companies" },
};

export default async function CompaniesPage() {
  const companies = await getReviewedCompanies();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Companies with Manager Reviews",
    url: `${siteUrl()}/companies`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: companies.length,
      itemListElement: companies.map((company, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl()}${company.companyPath}`,
        name: company.name,
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
        <a className="btn-primary" href="/?review=1">Write review</a>
      </nav>

      <section className="profile-hero company-hero">
        <div>
          <p className="profile-kicker">Directory</p>
          <h1>Companies with Manager Reviews</h1>
          <p className="profile-subtitle">
            {companies.length} compan{companies.length === 1 ? "y" : "ies"} reviewed anonymously by
            employees
          </p>
        </div>
      </section>

      <section className="profile-section">
        {companies.length ? (
          <div className="company-grid">
            {companies.map((company) => (
              <a className="company-card" key={company.slug} href={company.companyPath}>
                <CompanyLogo name={company.name} slug={company.slug} size={40} />
                <strong>{company.name}</strong>
                <small>
                  {company.managerCount} manager{company.managerCount === 1 ? "" : "s"}
                </small>
              </a>
            ))}
          </div>
        ) : (
          <div className="profile-empty-state">
            <strong>No companies reviewed yet</strong>
            <p>Be the first to add an anonymous review of your manager.</p>
            <a className="btn-primary" href="/?review=1">Write an anonymous review →</a>
          </div>
        )}
      </section>
    </main>
  );
}
