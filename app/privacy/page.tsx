import type { Metadata } from "next";
import { siteUrl } from "../../src/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy | ManagerScore",
  description: "How ManagerScore collects, uses, and protects information when you read or submit anonymous manager reviews.",
  alternates: { canonical: `${siteUrl()}/privacy` },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "June 6, 2026";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <nav className="legal-topbar">
        <a className="brand" href="/">Manager<span>Score</span><i /></a>
        <a className="btn-outline-dark" href="/">← Back to ManagerScore</a>
      </nav>

      <article className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-meta">Last updated: {LAST_UPDATED}</p>

        <p>
          ManagerScore ("ManagerScore," "we," "us," or "our") operates managerscore.io (the
          "Service"), a platform where employees can anonymously read and share reviews of
          managers they have worked with. This Privacy Policy explains what information we
          collect, how we use it, and the choices you have. By using the Service, you agree to
          the practices described here.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Content you submit</h3>
        <p>
          When you write a review, you may provide a manager's name and title, a company name,
          your role and tenure relative to that manager, ratings, written feedback, and optional
          tags. <strong>We do not require or display your name, employer-issued identifiers, or
          contact details alongside a published review.</strong> Reviews are published
          anonymously and are not attributed to an identifiable individual.
        </p>
        <p>
          Please do not include your own name, the names of coworkers, or other personal
          information about third parties in the body of a review — doing so could compromise
          your anonymity or someone else's privacy, and we may remove content that does.
        </p>

        <h3>1.2 Technical information used to prevent abuse</h3>
        <p>
          To deter spam, fraudulent submissions, and duplicate or coordinated reviews, our
          servers process your IP address at the moment you submit a review. We do not store
          your IP address in plain text. Instead, it is immediately passed through a one-way,
          salted cryptographic hash (SHA-256) before being saved, alongside a similarly hashed
          fingerprint of the submission itself (company, manager, and review text). These hashed
          values cannot practically be reversed back into your original IP address or used to
          identify you, and are never displayed publicly or shared with the subjects of reviews.
          We use them solely to detect duplicate submissions and patterns of abuse.
        </p>

        <h3>1.3 Information stored on your device</h3>
        <p>
          ManagerScore uses your browser's local storage (not cookies) to keep the Service
          working smoothly on your device. Specifically, we may store: (a) a local cache of
          reviews you've viewed or submitted, so the app loads faster on return visits, and (b)
          a flag indicating that you've unlocked full access to manager profiles by submitting a
          review. This information stays on your device, is not transmitted to our servers as
          tracking data, and can be cleared at any time by clearing your browser's site data.
        </p>

        <h3>1.4 Sign-in or verification prompts</h3>
        <p>
          Before unlocking certain content, the Service may ask you to confirm you're a real
          visitor by continuing with Google or entering an email address. As of the date above,
          any email address entered through this prompt is used only, in your browser, to
          continue past that prompt — it is not transmitted to or retained on our servers, and
          we do not build profiles or mailing lists from it. If this changes (for example, if we
          introduce real account sign-in), we will update this Policy first and describe exactly
          what is collected, why, and how it's protected.
        </p>

        <h3>1.5 What we do not do</h3>
        <ul>
          <li>We do not use third-party advertising trackers or ad networks.</li>
          <li>We do not use analytics cookies or cross-site tracking technologies.</li>
          <li>We do not sell, rent, or trade personal information to anyone, ever.</li>
          <li>We do not ask reviewers to identify themselves publicly, and published reviews are not bylined with reviewer names.</li>
        </ul>

        <h2>2. How We Use Information</h2>
        <p>We use the limited information described above to:</p>
        <ul>
          <li>Operate, maintain, and improve the Service, including displaying anonymous reviews and aggregate manager scores;</li>
          <li>Screen submissions for spam, abuse, harassment, defamation, and policy violations before they are published;</li>
          <li>Detect and prevent duplicate, fraudulent, or coordinated submissions;</li>
          <li>Respond to legal process, enforce our <a href="/terms">Terms of Service</a>, and protect the rights, safety, and property of ManagerScore, its users, and the public; and</li>
          <li>Comply with applicable laws and regulations.</li>
        </ul>

        <h2>3. How We Share Information</h2>
        <p>We do not sell personal information. We may share limited information only when:</p>
        <ul>
          <li><strong>Service providers:</strong> with infrastructure providers (such as our hosting platform and database provider) who process information on our behalf under confidentiality obligations, solely to operate the Service;</li>
          <li><strong>Legal compliance:</strong> when required to comply with a valid legal request (such as a subpoena or court order), or to protect the rights, property, or safety of ManagerScore, our users, or others, after reasonable legal review; and</li>
          <li><strong>Business transfers:</strong> in connection with a merger, acquisition, financing, or sale of assets, in which case we will provide notice before personal information is transferred or becomes subject to a different privacy policy.</li>
        </ul>
        <p>
          Because reviews are published anonymously and we do not collect reviewer names or
          employer-issued identifiers, we generally have very little personal information capable
          of identifying a reviewer to share in the first place.
        </p>

        <h2>4. Data Retention</h2>
        <p>
          We retain published review content for as long as it remains relevant to the Service,
          subject to our moderation and removal policies described in our{" "}
          <a href="/terms">Terms of Service</a>. We retain hashed identifiers (described in
          Section 1.2) only for as long as reasonably necessary to prevent abuse and duplicate
          submissions, and we periodically review and delete data we no longer need for that
          purpose.
        </p>

        <h2>5. Your Rights and Choices</h2>
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>Request access to, correction of, or deletion of personal information we hold about you;</li>
          <li>Object to or restrict certain processing, or withdraw consent where processing is based on consent;</li>
          <li>Request a copy of your information in a portable format; and</li>
          <li>Lodge a complaint with your local data protection authority.</li>
        </ul>
        <p>
          <strong>Residents of the European Economic Area, the UK, and Switzerland (GDPR):</strong>{" "}
          where we process personal information, our legal bases include legitimate interests
          (operating and securing the Service and preventing abuse), compliance with legal
          obligations, and, where applicable, your consent.
        </p>
        <p>
          <strong>California residents (CCPA/CPRA):</strong> we do not sell or share personal
          information for cross-context behavioral advertising, and we do not use sensitive
          personal information beyond what is necessary to operate the Service. You may still
          exercise your rights to know, delete, and correct personal information by contacting us
          below.
        </p>
        <p>
          Because published reviews are anonymous and we retain very limited personal
          information, we may not always be able to locate information tied to a specific
          individual; we will make reasonable, good-faith efforts to honor verifiable requests.
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:privacy@managerscore.io">privacy@managerscore.io</a>.
        </p>

        <h2>6. Children's Privacy</h2>
        <p>
          The Service is intended for working adults and is not directed to children. We do not
          knowingly collect personal information from anyone under the age of 16. If you believe
          a child has provided us with personal information, please contact us at{" "}
          <a href="mailto:privacy@managerscore.io">privacy@managerscore.io</a> so we can delete it.
        </p>

        <h2>7. International Data Transfers</h2>
        <p>
          ManagerScore is operated from the United States, and the infrastructure providers we
          use may process and store information in the United States or other countries. By
          using the Service, you understand that information may be transferred to, stored, and
          processed in a country other than your own, which may have different data protection
          laws than your country of residence.
        </p>

        <h2>8. Security</h2>
        <p>
          We use reasonable technical and organizational measures designed to protect
          information — including one-way salted hashing of identifiers described in Section
          1.2 and access controls on our database and infrastructure. However, no method of
          transmission or storage is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices
          or for legal, operational, or regulatory reasons. We will post the updated policy on
          this page with a revised "Last updated" date, and where changes are material, we will
          provide additional notice (such as a notice on the Service).
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have questions, concerns, or requests regarding this Privacy Policy or your
          information, please contact us at{" "}
          <a href="mailto:privacy@managerscore.io">privacy@managerscore.io</a>. For legal notices,
          abuse reports, or content-removal requests, see our{" "}
          <a href="/terms">Terms of Service</a> or write to{" "}
          <a href="mailto:legal@managerscore.io">legal@managerscore.io</a>.
        </p>
      </article>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} ManagerScore. All rights reserved.</span>
        <nav>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/">Home</a>
        </nav>
      </footer>
    </main>
  );
}
