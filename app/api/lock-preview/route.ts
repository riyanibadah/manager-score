import { NextResponse } from "next/server";

export function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const redirectUrl = new URL(next.startsWith("/") ? next : "/", url.origin);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("rmm_unlocked", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  return response;
}
