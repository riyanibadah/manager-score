import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getManagerProfile } from "../../../../src/lib/public-data";
import { managerPath, siteUrl } from "../../../../src/lib/seo";

type ManagerPageProps = {
  params: Promise<{
    companySlug: string;
    managerSlug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ManagerPageProps): Promise<Metadata> {
  const { companySlug, managerSlug } = await params;
  const profile = await getManagerProfile(companySlug, managerSlug);

  if (!profile) {
    return {
      title: "Manager Reviews | Manager Score",
      robots: { index: false, follow: false },
    };
  }

  const title = `${profile.name} at ${profile.company} Reviews | Manager Score`;
  const description = `Read anonymous employee reviews of ${profile.name}, ${profile.title} at ${profile.company}. See communication, support, and work-life ratings.`;
  const url = `${siteUrl()}${managerPath(companySlug, managerSlug)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ManagerPage({ params }: ManagerPageProps) {
  const { companySlug, managerSlug } = await params;
  const profile = await getManagerProfile(companySlug, managerSlug);

  if (!profile) notFound();

  const canonicalUrl = `${siteUrl()}${profile.profilePath}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.title,
    worksFor: {
      "@type": "Organization",
      name: profile.company,
    },
    url: canonicalUrl,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: profile.averageScore.toFixed(1),
      bestRating: "5",
      worstRating: "1",
      reviewCount: profile.reviewCount,
    },
    review: profile.reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      reviewBody: review.reviewText,
      datePublished: review.date,
      author: {
        "@type": "Person",
        name: review.reviewerRole || "Anonymous employee",
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.overall.toFixed(1),
        bestRating: "5",
        worstRating: "1",
      },
    })),
  };

  return (
    <main className="profile-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="profile-topbar">
        <a className="brand" href="/">
          Manager <span>Score</span><i />
        </a>
        <a className="btn-primary" href="/#reviews">Write review</a>
      </nav>

      <section className="profile-hero">
        <div className="profile-avatar">{initials(profile.name)}</div>
        <div>
          <p className="profile-kicker">{profile.company}</p>
          <h1>{profile.name} Reviews</h1>
          <p className="profile-subtitle">
            {profile.title}{profile.department ? ` · ${profile.department}` : ""} at {profile.company}
          </p>
        </div>
        <div className="profile-score">
          <span>{profile.averageScore.toFixed(1)}</span>
          <small>{profile.reviewCount} review{profile.reviewCount === 1 ? "" : "s"}</small>
        </div>
      </section>

      <section className="profile-stats">
        {[
          ["Communication", profile.communication.toFixed(1)],
          ["Support & Growth", profile.supportGrowth.toFixed(1)],
          ["Work-Life Balance", profile.worklife.toFixed(1)],
          ["Would Work Again", `${profile.wouldAgainPct}%`],
        ].map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      {profile.tags.length > 0 && (
        <section className="profile-section">
          <h2>Common Tags</h2>
          <div className="profile-tags">
            {profile.tags.map((tag) => (
              <span key={tag.tag} className={`profile-tag profile-tag-${tag.sentiment.toLowerCase()}`}>
                {tag.tag} <small>{tag.count}</small>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="profile-section">
        <h2>Anonymous Reviews</h2>
        <div className="profile-review-list">
          {profile.reviews.map((review) => (
            <article className="profile-review-card" key={review.id}>
              <header>
                <div>
                  <strong>{review.reviewerRole || "Anonymous employee"}</strong>
                  <p>
                    {[review.employeeStatus, review.employmentType, review.workedWith]
                      .filter(Boolean)
                      .join(" · ") || "Anonymous context"}
                  </p>
                </div>
                <span>{review.overall.toFixed(1)}</span>
              </header>
              <p>{review.reviewText}</p>
              <footer>
                <span>{new Date(review.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                <span>{review.wouldAgain ? "Would work for again" : "Would not work for again"}</span>
              </footer>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}
