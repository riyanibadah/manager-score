import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../src/lib/admin";
import { getAdminMetrics } from "../../../../src/lib/admin-metrics";

export const dynamic = "force-dynamic";

// Powers the dashboard's date-range selector. Admin-gated like the page; a
// non-admin gets a 404 rather than a hint that the endpoint exists.
export async function GET(request: Request) {
  const session = await getAdminSession(request.headers);
  if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const daysParam = new URL(request.url).searchParams.get("days");
  const days =
    daysParam === "all" ? null : [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;

  return NextResponse.json(await getAdminMetrics(days));
}
