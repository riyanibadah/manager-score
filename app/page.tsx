import type { Metadata } from "next";
import App from "../src/App";
import { getRecentReviews } from "../src/lib/public-data";

export const dynamic = "force-dynamic";

const HOME_TITLE = "ManagerScore — Anonymous Manager Reviews & Boss Ratings";
const HOME_DESCRIPTION =
  "Rate your manager anonymously and read honest reviews from real employees. Search managers by name or company and compare communication, support, and work-life balance ratings.";

export const metadata: Metadata = {
  // `absolute` opts out of the layout's "%s | ManagerScore" template so the
  // homepage keeps the brand up front rather than trailing it.
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  // Restated rather than inherited: the layout's openGraph block is the
  // site-wide fallback, and without these the homepage would share under the
  // generic title instead of its own.
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export default async function Home() {
  const reviews = await getRecentReviews(20);

  return <App initialReviews={reviews} />;
}
