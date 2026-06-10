import type { Metadata } from "next";
import { siteUrl } from "../../src/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Service | ManagerScore",
  description: "The terms that govern your use of ManagerScore, including rules for submitting and reading anonymous manager reviews.",
  alternates: { canonical: `${siteUrl()}/terms` },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "June 6, 2026";
const EFFECTIVE_DATE = "June 6, 2026";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <nav className="legal-topbar">
        <a className="brand" href="/">Manager<span>Score</span><i /></a>
        <a className="btn-outline-dark" href="/">← Back to ManagerScore</a>
      </nav>

      <article className="legal-content">
        <h1>Terms of Service</h1>
        <p className="legal-meta">Last updated: {LAST_UPDATED} · Effective: {EFFECTIVE_DATE}</p>

        <p>
          These Terms of Service ("Terms") form a binding agreement between you and ManagerScore
          ("ManagerScore," "we," "us," or "our"), the operator of managerscore.io (the
          "Service"). By accessing or using the Service, you agree to these Terms and to our{" "}
          <a href="/privacy">Privacy Policy</a>, which is incorporated by reference. If you do
          not agree, do not use the Service.
        </p>

        <h2>1. Eligibility</h2>
        <p>
          You must be at least 18 years old, or the age of legal majority where you live,
          whichever is greater, to use the Service. By using the Service, you represent that you
          meet this requirement and that you are using the Service in compliance with all
          applicable laws, including any workplace, confidentiality, or non-disparagement
          obligations you may owe to an employer.
        </p>

        <h2>2. What ManagerScore Is — and Isn't</h2>
        <p>
          ManagerScore lets people anonymously share and read first-person opinions and
          experiences about managers they have worked with. Reviews and aggregate scores
          displayed on the Service:
        </p>
        <ul>
          <li>Reflect the personal opinions and experiences of individual contributors, not verified facts and not the views of ManagerScore;</li>
          <li>Are not professional, legal, employment, or HR advice and should not be relied on as the sole basis for any decision about a person; and</li>
          <li>Have not been independently fact-checked for accuracy, though they are screened against our content guidelines (Section 4) before publication.</li>
        </ul>
        <p>
          You are solely responsible for evaluating the reliability of any content on the
          Service.
        </p>

        <h2>3. Your Account and Submissions</h2>
        <p>
          The Service is designed so reviews can be submitted and read without creating a public,
          named profile. You do not need to provide your real name to submit a review, and we do
          not publish reviewer names alongside reviews. You are responsible for safeguarding any
          access to the Service on your device (for example, clearing local browser storage on
          shared devices), and for all activity that occurs through your use of the Service.
        </p>

        <h2>4. Content Guidelines</h2>
        <p>When you submit a review or any other content, you agree that it will:</p>
        <ul>
          <li>Be based on your own first-hand experience working with or alongside the manager described;</li>
          <li>Be truthful to the best of your knowledge and not contain statements you know to be false;</li>
          <li>Focus on workplace conduct and management style, not on protected characteristics (such as race, religion, sex, national origin, disability, age, or similar);</li>
          <li>Not contain harassment, threats, hate speech, or content that incites violence;</li>
          <li>Not disclose confidential, proprietary, or trade-secret information belonging to any employer, or any third party's personal information (including names, contact details, or identifying details about coworkers other than the manager being reviewed);</li>
          <li>Not be defamatory — that is, not state as fact something false and damaging about an identifiable person; opinions should be expressed as opinions and supported by your actual experience; and</li>
          <li>Not violate any law or any agreement you have with a third party (including confidentiality or non-disparagement agreements).</li>
        </ul>
        <p>
          You agree not to misuse the Service, including by: submitting content on behalf of
          someone else or about a fictitious person or company; submitting multiple or
          coordinated reviews to manipulate scores; scraping, harvesting, or bulk-downloading
          content; attempting to identify anonymous reviewers; interfering with or disrupting the
          Service or its infrastructure; or using the Service to violate any applicable law.
        </p>

        <h2>5. Anonymity — What We Do, and Its Limits</h2>
        <p>
          We do not require reviewer names, do not display them publicly, and use salted,
          one-way hashing of technical identifiers as described in our{" "}
          <a href="/privacy">Privacy Policy</a> to limit what we retain. That said, we cannot
          guarantee absolute or perfect anonymity in every circumstance — for example, the
          specific details you choose to include in a review (such as a unique role, project, or
          timeframe) could make you identifiable to people who know the situation, and we may be
          legally compelled to disclose information in response to valid legal process. Please
          write reviews with this in mind, and avoid including details that could unintentionally
          identify you or others.
        </p>

        <h2>6. Moderation, Removal, and Reporting</h2>
        <p>
          Submitted reviews are placed in a pending state and screened against these Terms before
          they are published. We reserve the right, but do not assume the obligation, to review,
          edit, refuse to publish, hide, or remove any content, at any time and for any reason,
          including content we believe violates these Terms, is unlawful, or creates risk for
          ManagerScore or others — with or without notice.
        </p>
        <p>
          If you believe a review about you is false, defamatory, or violates these Terms, you
          may report it using the "Report review" link shown under any review, or by emailing{" "}
          <a href="mailto:legal@managerscore.io">legal@managerscore.io</a> with the manager and
          company name, the URL of the profile, and a specific, good-faith explanation of why the
          content should be reviewed. We will assess reports against these Terms and applicable
          law and may remove, retain, or request more information about reported content. Filing
          a report does not guarantee removal, and submitting knowingly false reports is itself a
          violation of these Terms.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          The Service, including its design, branding, text, graphics, and underlying software,
          is owned by ManagerScore or its licensors and is protected by intellectual property
          laws. Subject to these Terms, we grant you a limited, revocable, non-exclusive,
          non-transferable license to access and use the Service for your own personal,
          non-commercial purposes.
        </p>
        <p>
          By submitting a review or other content, you grant ManagerScore a worldwide,
          royalty-free, perpetual, irrevocable, sublicensable license to host, store, reproduce,
          publish, display, distribute, and create aggregate or derivative statistics (such as
          average scores) from that content in connection with operating and promoting the
          Service. You retain ownership of the content you submit; this license simply lets us do
          the things the Service is designed to do — like showing your review to other people. You
          represent that you have the right to grant this license and that your submission does
          not infringe anyone else's rights.
        </p>

        <h2>8. Disclaimers</h2>
        <p>
          THE SERVICE AND ALL CONTENT ON IT ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT
          WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR
          AVAILABILITY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
          SECURE, OR THAT ANY CONTENT IS ACCURATE, COMPLETE, OR RELIABLE. YOUR USE OF THE SERVICE
          AND RELIANCE ON ANY CONTENT IS AT YOUR OWN RISK.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, MANAGERSCORE AND ITS OPERATOR WILL NOT BE LIABLE
          FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR
          ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM
          OR RELATED TO YOUR USE OF, OR INABILITY TO USE, THE SERVICE OR ANY CONTENT ON IT — EVEN
          IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. TO THE EXTENT ANY LIABILITY CANNOT BE
          DISCLAIMED UNDER APPLICABLE LAW, OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIM RELATED TO
          THE SERVICE WILL NOT EXCEED FIFTY U.S. DOLLARS (USD $50) OR THE AMOUNT YOU PAID US, IF
          ANY, IN THE TWELVE MONTHS BEFORE THE CLAIM AROSE, WHICHEVER IS GREATER.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations on liability, so some of the above
          limitations may not apply to you. In that case, our liability will be limited to the
          fullest extent permitted by applicable law.
        </p>

        <h2>10. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless ManagerScore and its operator from
          and against any claims, liabilities, damages, losses, and expenses (including
          reasonable attorneys' fees) arising out of or in any way connected with: your access to
          or use of the Service; content you submit; your violation of these Terms; or your
          violation of any law or the rights of a third party (including any defamation, privacy,
          or contractual claim arising from a review you submitted).
        </p>

        <h2>11. Termination</h2>
        <p>
          We may suspend or terminate your access to the Service at any time, with or without
          notice, for conduct that we believe violates these Terms, creates risk or legal
          exposure for us or others, or for any other reason at our discretion. You may stop
          using the Service at any time. Sections of these Terms that by their nature should
          survive termination (including Sections 7 through 10 and 13) will survive.
        </p>

        <h2>12. Changes to the Service or These Terms</h2>
        <p>
          We may modify or discontinue the Service, in whole or in part, at any time. We may also
          revise these Terms from time to time; if we make material changes, we will update the
          "Last updated" date above and, where appropriate, provide additional notice. Your
          continued use of the Service after changes take effect constitutes acceptance of the
          revised Terms.
        </p>

        <h2>13. Governing Law and Disputes</h2>
        <p>
          These Terms are governed by the laws of the State of Tennessee, United States, without
          regard to its conflict-of-laws principles. You agree that any dispute arising out of or
          relating to these Terms or the Service will be brought exclusively in the state or
          federal courts located in Tennessee, and you consent to the personal jurisdiction of
          those courts. Nothing in this section limits any non-waivable consumer-protection right
          you may have under the mandatory laws of your country or state of residence.
        </p>

        <h2>14. Miscellaneous</h2>
        <p>
          These Terms, together with our <a href="/privacy">Privacy Policy</a>, are the entire
          agreement between you and ManagerScore regarding the Service and supersede any prior
          agreements. If any provision of these Terms is found unenforceable, the remaining
          provisions will remain in full effect, and the unenforceable provision will be modified
          to the minimum extent necessary to make it enforceable. Our failure to enforce any
          right or provision will not be a waiver of that right or provision. You may not assign
          these Terms without our written consent; we may assign them in connection with a
          merger, acquisition, or sale of assets.
        </p>

        <h2>15. Contact Us</h2>
        <p>
          Questions about these Terms, legal notices, or content reports can be sent to{" "}
          <a href="mailto:legal@managerscore.io">legal@managerscore.io</a>. Privacy-related
          questions or requests can be sent to{" "}
          <a href="mailto:privacy@managerscore.io">privacy@managerscore.io</a> — see our{" "}
          <a href="/privacy">Privacy Policy</a> for details.
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
