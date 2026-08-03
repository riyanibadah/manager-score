import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import {
  getManagerProfile,
  getProfileContext,
  getVoterVotes,
  hasLiveReviewForUser,
  hasLiveUnlockToken,
} from "../../../../src/lib/public-data";
import AdSense from "../../../../src/components/AdSense";
import { VOTER_COOKIE, voterKeyFor } from "../../../../src/lib/votes";
import { isVerifiedCrawler } from "../../../../src/lib/crawler";
import { managerPath, siteUrl } from "../../../../src/lib/seo";
import { auth } from "../../../../src/lib/auth";
import { prisma } from "../../../../src/lib/prisma";
import ReportReviewButton from "../../../../src/components/ReportReviewButton";
import ShareReviewButton from "../../../../src/components/ShareReviewButton";
import VoteButtons from "../../../../src/components/VoteButtons";
import NotifyReviewButton from "../../../../src/components/NotifyReviewButton";
import ReviewReplies from "../../../../src/components/ReviewReplies";
import { adminEmails } from "../../../../src/lib/admin";
import { AdminProfileControls, AdminReviewControls } from "../../../../src/components/AdminProfileControls";

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
      title: "Manager Reviews",
      robots: { index: false, follow: false },
    };
  }

  // The layout's title template appends "| ManagerScore"; keep it out of the
  // page-level string so the brand isn't repeated twice in the tab/SERP title.
  const title = `${profile.name} at ${profile.company} Reviews`;
  // openGraph/twitter titles bypass the layout template, so they need the
  // brand spelled out to match what search and social actually display.
  const sharedTitle = `${title} | ManagerScore`;
  const description = `Read anonymous employee reviews of ${profile.name}, ${profile.title} at ${profile.company}. See communication, support, and work-life ratings.`;
  const url = `${siteUrl()}${managerPath(companySlug, managerSlug)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: sharedTitle,
      description,
      url,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: sharedTitle,
      description,
    },
  };
}

export default async function ManagerPage({ params }: ManagerPageProps) {
  const { companySlug, managerSlug } = await params;
  const profile = await getManagerProfile(companySlug, managerSlug);

  if (!profile) notFound();

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders }).catch(() => null);

  // Legacy grants issued before per-review unlock tracking existed: honored
  // permanently since neither can be tied back to the review that earned
  // them, so there's nothing to revoke if that review is later removed.
  const legacyCookieUnlocked = cookieStore.get("rmm_unlocked")?.value === "true";
  const legacyUserUnlock = session?.user?.id
    ? await prisma.userUnlock.findUnique({ where: { userId: session.user.id } })
    : null;

  // Unlock granted by a review submitted after that tracking landed: only
  // counts while the review that earned it is still live, so moderation
  // removing it revokes access.
  const unlockTokens = parseUnlockTokens(cookieStore.get("rmm_unlock_tokens")?.value);
  const [tokenUnlocked, userReviewUnlocked] = await Promise.all([
    hasLiveUnlockToken(unlockTokens),
    session?.user?.id ? hasLiveReviewForUser(session.user.id) : Promise.resolve(false),
  ]);

  const humanUnlocked =
    legacyCookieUnlocked || Boolean(legacyUserUnlock) || tokenUnlocked || userReviewUnlocked;

  // Indexers are shown the full profile so the review corpus can rank; the wall
  // is unchanged for every human who hasn't contributed. This is only legitimate
  // because the page also emits isAccessibleForFree markup declaring the gap —
  // see the jsonLd below. Removing that markup turns this into cloaking.
  //
  // Safe only while this route stays force-dynamic: a cached crawler render
  // served to visitors would leak the whole corpus.
  const crawlerUnlocked = await isVerifiedCrawler(requestHeaders);
  const unlocked = humanUnlocked || crawlerUnlocked;

  const isAdmin = Boolean(session?.user?.email && adminEmails().has(session.user.email.toLowerCase()));
  // The cookie is issued by the vote endpoint, so a first-time visitor simply
  // has no votes to pre-select here. Locked profiles render no vote controls,
  // so there's nothing to look up either. Keyed off the human gate: a crawler
  // has no voter cookie and never renders vote controls.
  const myVotes = humanUnlocked
    ? await getVoterVotes(
        voterKeyFor({
          userId: session?.user?.id,
          voterToken: cookieStore.get(VOTER_COOKIE)?.value,
        }),
        {
          reviewIds: profile.reviews.map((review) => review.id),
          replyIds: profile.reviews.flatMap((review) => review.replies.map((reply) => reply.id)),
        },
      )
    : {};
  const hasReviews = profile.reviewCount > 0;
  // Whether this visitor can read this manager's reviews. When they can't —
  // no reviews yet, or still behind the wall — the page falls back to company
  // and role context so it isn't a bare name with a locked panel.
  const reviewsReadable = unlocked && hasReviews;
  const context = reviewsReadable
    ? null
    : await getProfileContext(companySlug, profile.id, profile.title);
  const profileScoreTone = scoreToneClass(profile.averageScore);
  const canonicalUrl = `${siteUrl()}${profile.profilePath}`;
  const reviewHref = `/?review=1&manager=${encodeURIComponent(profile.name)}&company=${encodeURIComponent(profile.company)}`;
  const roleAtCompany = [profile.title, profile.company].filter(Boolean).join(" at ");
  // Person carries the ratings, but it isn't a CreativeWork, so it can't hold
  // the paywall properties Google looks for. The ProfilePage wrapper does, and
  // mainEntity keeps the Person as the thing the page is actually about.
  const personLd = {
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.title,
    worksFor: {
      "@type": "Organization",
      name: profile.company,
    },
    url: canonicalUrl,
    ...(unlocked && hasReviews
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: canonicalUrl,
    name: `${profile.name} Reviews`,
    mainEntity: personLd,
    // Declares that ratings and review text sit behind a contribution wall.
    // This is what separates "serving crawlers the gated content" from
    // cloaking, so it must stay in lockstep with crawlerUnlocked above.
    isAccessibleForFree: false,
    hasPart: [
      {
        "@type": "WebPageElement",
        isAccessibleForFree: false,
        // Class selectors only, per Google's spec. Both regions are rendered
        // with these classes on the gated parts of the page below.
        cssSelector: ".profile-gated-ratings",
      },
      {
        "@type": "WebPageElement",
        isAccessibleForFree: false,
        cssSelector: ".profile-gated-reviews",
      },
    ],
  };

  return (
    <main className="profile-page">
      {/*
        Ads only where this page actually says something: the reviews are
        readable, or the context section below stands in for them. A profile
        with neither is a bare name, so it carries no ad tag. Indexing is
        untouched either way — only the ad request is withheld.
      */}
      {(reviewsReadable || context) && <AdSense />}
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
        {isAdmin && (
          <AdminProfileControls
            manager={{
              id: profile.id,
              name: profile.name,
              title: profile.title,
              department: profile.department,
              company: profile.company,
              linkedinUrl: profile.linkedinUrl,
            }}
          />
        )}
        <div className="profile-avatar">{initials(profile.name)}</div>
        <div>
          <p className="profile-kicker">{profile.company}</p>
          <h1>{profile.name} Reviews</h1>
          <p className="profile-subtitle">
            {[profile.title, profile.department].filter(Boolean).join(" · ")}
            {profile.title || profile.department ? " at " : ""}
            {profile.company}
          </p>
          {profile.linkedinUrl && (
            <a
              className="profile-linkedin"
              href={profile.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
              </svg>
              <span>View LinkedIn profile</span>
            </a>
          )}
        </div>
        <div className="profile-side-actions">
          <div className={`profile-score ${unlocked && hasReviews ? profileScoreTone : "profile-score-empty"}`}>
            {unlocked ? (
              hasReviews ? (
                <>
                  <span>{profile.averageScore.toFixed(1)}</span>
                  <small>{profile.reviewCount} review{profile.reviewCount === 1 ? "" : "s"}</small>
                </>
              ) : (
                <>
                  <span>—</span>
                  <small>No reviews yet</small>
                </>
              )
            ) : (
              // A visitor who hasn't left a review must never be able to tell an
              // empty profile from a populated one: always show the locked
              // skeleton, and only reveal a count when there actually is one.
              <>
                <span className="profile-score-skeleton" aria-label="Score locked" />
                <small>
                  {hasReviews
                    ? `${profile.reviewCount} anonymous review${profile.reviewCount === 1 ? "" : "s"}`
                    : "Anonymous reviews"}
                </small>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="profile-stats profile-gated-ratings" data-nosnippet>
        {(hasReviews && unlocked
          ? [
              ["Communication", formatRating(profile.communication)],
              ["Support & Growth", formatRating(profile.supportGrowth)],
              ["Work-Life Balance", formatRating(profile.worklife)],
              ["Would Work Again", `${profile.wouldAgainPct}%`],
            ]
          : !unlocked
            ? [
              ["Communication", ""],
              ["Support & Growth", ""],
              ["Work-Life Balance", ""],
              ["Would Work Again", ""],
            ]
            : [
              ["Communication", "First review"],
              ["Support & Growth", "First review"],
              ["Work-Life Balance", "First review"],
              ["Would Work Again", "First review"],
            ]).map(([label, value]) => (
          <div
            key={label}
            className={!unlocked ? "profile-stat-locked" : !hasReviews ? "profile-stat-empty" : undefined}
          >
            {hasReviews && unlocked ? <strong>{value}</strong> : !unlocked ? <strong aria-label={`${label} locked`} /> : <strong>—</strong>}
            <span>{label}</span>
            {unlocked && !hasReviews && <small>{value}</small>}
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
        {unlocked && !hasReviews && (
          <div className="profile-empty-state profile-first-review-state">
            <strong>Profile found. No reviews yet.</strong>
            <p>
              Be the first to anonymously share what it&apos;s like to work with {profile.name}
              {profile.company ? ` at ${profile.company}` : ""}.
            </p>
            <a className="btn-primary" href={reviewHref}>Write the first anonymous review →</a>
          </div>
        )}
        {!unlocked && (
          <div className="profile-review-list" aria-hidden="true">
            {Array.from({ length: Math.max(2, Math.min(profile.reviewCount, 3)) }).map((_, index) => (
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
        {/*
          Stands in for the reviews this visitor can't read. Names, titles and
          counts only — the same things the company page already publishes — so
          a profile that would otherwise be a bare name has something worth
          landing on, without spending the review text people unlock for.
        */}
        {context && (
          <section className="profile-context">
            <h2>
              {context.peersAreSameRole && context.roleTitle
                ? `Other ${context.roleTitle}s at ${context.companyName}`
                : `Reviewed managers at ${context.companyName}`}
            </h2>
            <p className="profile-context-lede">
              {hasReviews
                ? `${profile.name}'s reviews are unlocked by contributing one of your own.`
                : `No one has reviewed ${profile.name} yet.`}{" "}
              Employees have left {context.reviewCount} anonymous review
              {context.reviewCount === 1 ? "" : "s"} across {context.reviewedManagerCount} manager
              {context.reviewedManagerCount === 1 ? "" : "s"} at {context.companyName}
              {context.peersAreSameRole && context.roleTitle
                ? `, including ${context.roleManagerCount} other ${context.roleTitle}${context.roleManagerCount === 1 ? "" : "s"}`
                : ""}
              .
            </p>
            <div className="profile-review-list">
              {context.peers.map((peer) => (
                <a
                  className="profile-review-card company-manager-card"
                  key={peer.id}
                  href={peer.profilePath}
                >
                  <header>
                    <div>
                      <strong>{peer.name}</strong>
                      <p>{peer.title}</p>
                    </div>
                    <span>
                      {peer.reviewCount} review{peer.reviewCount === 1 ? "" : "s"}
                    </span>
                  </header>
                </a>
              ))}
            </div>
            <a className="profile-context-more" href={context.companyPath}>
              See all managers at {context.companyName} →
            </a>
          </section>
        )}
        {/*
          data-nosnippet on the container, not the paragraph: it also covers
          reviewer context, scores, and reply threads, so no gated text can
          surface in a search snippet where a non-contributor would read it.
        */}
        {unlocked && hasReviews && <div className="profile-review-list profile-gated-reviews" data-nosnippet>
          {profile.reviews.map((review) => (
            <article className="profile-review-card" key={review.id} id={`review-${review.id}`}>
              <header>
                <div>
                  <strong>{review.reviewerRole || "Anonymous employee"}</strong>
                  <p>
                    {[review.employeeStatus, review.employmentType, review.workedWith]
                      .filter(Boolean)
                      .join(" · ") || "Anonymous context"}
                  </p>
                </div>
                <span className={`profile-review-score ${scoreToneClass(review.overall)}`}>{review.overall.toFixed(1)}</span>
              </header>
              <p>{review.reviewText}</p>
              <footer>
                <span className="profile-review-meta">
                  <span>{new Date(review.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  <span>{review.wouldAgain ? "Would work for again" : "Would not work for again"}</span>
                </span>
                <div className="profile-review-actions">
                  <VoteButtons
                    target={{ reviewId: review.id }}
                    upvotes={review.upvotes}
                    downvotes={review.downvotes}
                    myVote={myVotes[review.id] || 0}
                  />
                  <ShareReviewButton
                    url={`${canonicalUrl}#review-${review.id}`}
                    title={`Anonymous review of ${profile.name}${roleAtCompany ? `, ${roleAtCompany}` : ""} on ManagerScore`}
                  />
                  <NotifyReviewButton reviewId={review.id} sessionEmail={session?.user?.email} />
                  <ReportReviewButton reviewId={review.id} />
                  {isAdmin && <AdminReviewControls reviewId={review.id} />}
                </div>
              </footer>
              <ReviewReplies
                reviewId={review.id}
                replies={review.replies}
                isAdmin={isAdmin}
                myVotes={myVotes}
              />
            </article>
          ))}
        </div>}
      </section>

      <p className="profile-seo-summary">
        Anonymous employee reviews for {profile.name} at {profile.company} cover communication, support for
        growth, work-life balance, and whether reviewers would work with this manager again.
      </p>

      {/* This page carries ratings about a named individual, and most people
          reach it straight from a search result without ever passing the terms.
          So the framing lives here rather than only at /terms: what the content
          is, what it isn't, and how the subject can push back. data-nosnippet
          keeps it out of search snippets, where it would crowd out the page's
          actual summary. */}
      <section className="profile-disclaimer" data-nosnippet>
        <h2>About this profile</h2>
        <p>
          Reviews here are the personal opinions and first-hand experiences of individual
          contributors. They are not statements of fact, are not verified by ManagerScore, and are
          not our views. Ratings reflect only the people who chose to submit one, so they may not
          be representative of {profile.name}&rsquo;s work or of anyone else&rsquo;s experience.
        </p>
        <p>
          ManagerScore is not affiliated with, endorsed by, or sponsored by {profile.company}.
          Company names and logos are trademarks of their respective owners, used only to identify
          the workplace a review refers to.
        </p>
        <p>
          If you are {profile.name} and believe something on this page is inaccurate or breaches
          our <a href="/terms">Terms of Service</a>, use the Report control on any review, or see{" "}
          <a href="/terms">our moderation and removal policy</a>.
        </p>
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

/**
 * Category ratings are whole numbers per review, so a single-review profile
 * showing "4.0" implies a precision that was never collected — it reads as a
 * measurement when it is just a 4.
 *
 * Averaging several reviews genuinely can land between whole numbers, though,
 * and rounding 4.5 to 4 or 5 would misstate it. So a whole number prints whole
 * and everything else keeps its decimal. The headline score stays toFixed(1)
 * regardless: it is an average of averages and rarely lands on an integer.
 */
function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function scoreToneClass(score: number) {
  if (score >= 4) return "profile-score-good";
  if (score >= 3) return "profile-score-average";
  return "profile-score-bad";
}

function parseUnlockTokens(raw: string | undefined) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((token): token is string => typeof token === "string") : [];
  } catch {
    return [];
  }
}
