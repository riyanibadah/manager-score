import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../src/lib/admin";

export const dynamic = "force-dynamic";

// Admin-only. Reports whether email can actually go out: is the key set, does
// Resend accept it, is a domain verified, and is the from-address on it. This is
// what explains "owner emails arrive but emails to other people don't".
export async function GET(request: Request) {
  const session = await getAdminSession(request.headers);
  if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const key = process.env.RESEND_API_KEY;
  const from = process.env.REPORT_NOTIFICATION_FROM || "ManagerScore <onboarding@resend.dev>";
  const usingSharedSender = /onboarding@resend\.dev/i.test(from);

  if (!key) {
    return NextResponse.json({
      keyPresent: false,
      from,
      verifiedDomains: [],
      canSendToAnyone: false,
      note: "RESEND_API_KEY is not set in this environment — no email of any kind will send.",
    });
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json({
        keyPresent: true,
        keyValid: false,
        from,
        status: res.status,
        note: data?.message || "Resend rejected the API key.",
      });
    }

    const domains: Array<{ name: string; status: string }> = (data?.data || []).map(
      (d: { name: string; status: string }) => ({ name: d.name, status: d.status }),
    );
    const verified = domains.filter((d) => d.status === "verified").map((d) => d.name);
    const canSendToAnyone = verified.length > 0 && !usingSharedSender;

    return NextResponse.json({
      keyPresent: true,
      keyValid: true,
      from,
      usingSharedSender,
      verifiedDomains: verified,
      allDomains: domains,
      canSendToAnyone,
      note:
        verified.length === 0
          ? "No verified domain. With onboarding@resend.dev, Resend only delivers to your own account email — which is why report emails to you arrive but verification emails to reviewers don't. Verify a domain in Resend and set REPORT_NOTIFICATION_FROM to an address on it."
          : usingSharedSender
            ? `You have a verified domain (${verified.join(", ")}) but REPORT_NOTIFICATION_FROM still uses onboarding@resend.dev. Change it to e.g. "ManagerScore <no-reply@${verified[0]}>".`
            : "Configured correctly — key valid, verified domain, from-address on it. Emails can reach anyone.",
    });
  } catch (error) {
    return NextResponse.json({
      keyPresent: true,
      from,
      note: error instanceof Error ? error.message : "Could not reach Resend to check.",
    });
  }
}
