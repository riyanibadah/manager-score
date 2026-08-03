import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { siteUrl } from "../src/lib/seo";
import "../src/App.css";

const SITE_NAME = "ManagerScore";
const DEFAULT_DESCRIPTION =
  "Read and write anonymous manager reviews. Rate your boss on communication, support for growth, and work-life balance — and see what employees say before you take the job.";

export const metadata: Metadata = {
  // Resolves every relative canonical/OG url on the site against the live
  // origin. Without it Next falls back to localhost in metadata output.
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — Anonymous Manager Reviews`,
    // Page-level titles supply only their own part; the brand suffix is
    // appended here so it stays consistent across routes.
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      // Deliberately not -1 (unlimited). Crawlers are served the gated review
      // text so it can be indexed, and an unbounded snippet would print that
      // text straight into the results page for people who never contributed.
      // The gated regions also carry data-nosnippet; this is the backstop.
      "max-snippet": 160,
    },
  },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    title: `${SITE_NAME} — Anonymous Manager Reviews`,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — Anonymous Manager Reviews`,
    description: DEFAULT_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/*
        No AdSense script here. Loading it from the layout requested ads on
        every url, including profiles with no reviews and the locked view of
        the ones that have them — screens with no publisher content, which is
        what the account was rejected over. Pages that have something to show
        render <AdSense /> themselves; see src/components/AdSense.tsx.
      */}
      <body>
        {/*
          Site-level entity markup. No SearchAction/sitelinks searchbox: search
          is client-side on the homepage with no shareable results url, and
          declaring a target that renders nothing is invalid markup.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${siteUrl()}/#organization`,
                  name: SITE_NAME,
                  url: siteUrl(),
                  description: DEFAULT_DESCRIPTION,
                },
                {
                  "@type": "WebSite",
                  "@id": `${siteUrl()}/#website`,
                  name: SITE_NAME,
                  url: siteUrl(),
                  description: DEFAULT_DESCRIPTION,
                  publisher: { "@id": `${siteUrl()}/#organization` },
                  inLanguage: "en-US",
                },
              ],
            }),
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
