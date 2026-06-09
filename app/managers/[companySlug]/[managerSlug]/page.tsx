import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getManagerProfile } from "../../../../src/lib/public-data";
import { managerPath, siteUrl } from "../../../../src/lib/seo";
import { auth } from "../../../../src/lib/auth";
import { prisma } from "../../../../src/lib/prisma";

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
      title: "Manager Reviews | ManagerScore",
      robots: { index: false, follow: false },
    };
  }

  const title = `${profile.name} at ${profile.company} Reviews | ManagerScore`;
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

  const cookieStore = await cookies();
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const userUnlock = session?.user?.id
    ? await prisma.userUnlock.findUnique({ where: { userId: session.user.id } })
    : null;
  const unlocked = cookieStore.get("rmm_unlocked")?.value === "true" || Boolean(userUnlock);
  const canonicalUrl = `${siteUrl()}${profile.profilePath}`;
  const reviewHref = `/?review=1&manager=${encodeURIComponent(profile.name)}&company=${encodeURIComponent(profile.company)}`;
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
    ...(unlocked && profile.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: profile.averageScore.toFixed(1),
            bestRating: "5",
            worstRating: "1",
            reviewCount: profile.reviewCount,
          },
        }
      : {}),
    ...(unlocked
      ? {
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
        }
      : {}),
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

      <section className="profile-hero">
        <div className="profile-avatar">{initials(profile.name)}</div>
        <div>
          <p className="profile-kicker">{profile.company}</p>
          <h1>{profile.name} Reviews</h1>
          <p className="profile-subtitle">
            {[profile.title, profile.department].filter(Boolean).join(" · ")}
            {profile.title || profile.department ? " at " : ""}
            {profile.company}
          </p>
        </div>
        <div className={`profile-score${!unlocked || profile.reviewCount === 0 ? " profile-score-empty" : ""}`}>
          {unlocked && profile.reviewCount > 0 ? (
            <>
              <span>{profile.averageScore.toFixed(1)}</span>
              <small>{profile.reviewCount} review{profile.reviewCount === 1 ? "" : "s"}</small>
            </>
          ) : profile.reviewCount > 0 ? (
            <>
              <span className="profile-score-skeleton" aria-label="Score locked" />
              <small>{profile.reviewCount} anonymous review{profile.reviewCount === 1 ? "" : "s"}</small>
            </>
          ) : (
            <>
              <span>—</span>
              <small>Profile requested</small>
            </>
          )}
        </div>
      </section>

      <section className="profile-stats">
        {(unlocked
          ? [
              ["Communication", profile.communication.toFixed(1)],
              ["Support & Growth", profile.supportGrowth.toFixed(1)],
              ["Work-Life Balance", profile.worklife.toFixed(1)],
              ["Would Work Again", `${profile.wouldAgainPct}%`],
            ]
          : [
              ["Communication", ""],
              ["Support & Growth", ""],
              ["Work-Life Balance", ""],
              ["Would Work Again", ""],
            ]).map(([label, value]) => (
          <div key={label} className={!unlocked ? "profile-stat-locked" : undefined}>
            {unlocked ? <strong>{value}</strong> : <strong aria-label={`${label} locked`} />}
            <span>{label}</span>
          </div>
        ))}
      </section>

      {unlocked && profile.tags.length > 0 && (
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
        {!unlocked && (
          <div className="profile-empty-state profile-lock-state">
            <strong>Unlock this profile with one anonymous review</strong>
            <p>
              See the full rating breakdown, employee context, tags, and anonymous review text after
              contributing your own review.
            </p>
            <a className="btn-primary" href={reviewHref}>Write an anonymous review to unlock →</a>
          </div>
        )}
        {unlocked && profile.reviews.length === 0 && (
          <div className="profile-empty-state">
            <p>No one has reviewed {profile.name} yet. Be the first to anonymously share what it&apos;s like to work with them.</p>
            <a className="btn-primary" href={reviewHref}>Write the first anonymous review →</a>
          </div>
        )}
        {!unlocked && profile.reviewCount > 0 && (
          <div className="profile-review-list" aria-hidden="true">
            {Array.from({ length: Math.min(profile.reviewCount, 3) }).map((_, index) => (
              <article className="profile-review-card profile-review-card-locked" key={index}>
                <header>
                  <div>
                    <strong aria-label="Reviewer locked" />
                    <p aria-label="Employee context locked" />
                  </div>
                  <span aria-label="Review score locked" />
                </header>
                <p aria-label="Review text locked" />
                <footer>
                  <span aria-label="Review date locked" />
                  <span aria-label="Work-again answer locked" />
                </footer>
              </article>
            ))}
          </div>
        )}
        {unlocked && <div className="profile-review-list">
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
        </div>}
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
