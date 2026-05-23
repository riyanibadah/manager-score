import App from "../src/App";
import { getRecentReviews } from "../src/lib/public-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const reviews = await getRecentReviews(20);

  return <App initialReviews={reviews} />;
}
