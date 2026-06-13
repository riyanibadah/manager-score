import { auth } from "./auth";

export function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getAdminSession(headers: Headers) {
  const session = await auth.api.getSession({ headers }).catch(() => null);
  const email = session?.user?.email?.toLowerCase();

  if (!email || !adminEmails().has(email)) return null;
  return session;
}

export async function requireAdmin(headers: Headers) {
  const session = await getAdminSession(headers);
  if (!session) {
    throw new Response(JSON.stringify({ error: "Admin access required." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}
