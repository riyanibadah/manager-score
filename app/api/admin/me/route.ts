import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../src/lib/admin";

// Reveals only the caller's own admin status — used to decide whether to render
// the dashboard toggle. Never returns the admin list itself.
export async function GET(request: Request) {
  const session = await getAdminSession(request.headers);
  return NextResponse.json({ isAdmin: Boolean(session) });
}
