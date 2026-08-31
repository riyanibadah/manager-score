import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAdminSession } from "../../src/lib/admin";
import { getAdminMetrics } from "../../src/lib/admin-metrics";
import AdminDashboard from "../../src/components/AdminDashboard";

// Reads the session, so it can never be statically cached and handed to the
// wrong person.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  // Belt and suspenders: the page 404s for non-admins anyway, but this keeps it
  // out of any index even if that ever regressed.
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // The single gate: no admin session, no page. notFound() returns a 404, so the
  // route's existence isn't even confirmed to a non-admin.
  const session = await getAdminSession(await headers());
  if (!session) notFound();

  const metrics = await getAdminMetrics();
  const vercelUrl = process.env.VERCEL_ANALYTICS_URL || "https://vercel.com/dashboard";

  return <AdminDashboard metrics={metrics} email={session.user?.email || ""} vercelUrl={vercelUrl} />;
}
