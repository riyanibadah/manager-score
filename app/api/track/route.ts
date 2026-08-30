import { NextResponse } from "next/server";
import { recordPageView } from "../../../src/lib/admin-metrics";

// Public, fire-and-forget pageview beacon. Stores no cookie, no IP, no user id —
// only the path and a coarse referral source (see recordPageView). Runs from the
// client, so it naturally skips crawlers that don't execute JS.
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false });

  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body?.path === "string" && body.path ? body.path : null;
    const referrer = typeof body?.referrer === "string" ? body.referrer : null;
    if (!path) return NextResponse.json({ ok: false });

    await recordPageView({ path, referrer, siteHost: request.headers.get("host") || "" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
