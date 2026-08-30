"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";

export default function ManagerFollowButton({
  managerId,
  initialFollowing,
  signedIn,
}: {
  managerId: string;
  initialFollowing: boolean;
  /** Notifications go to the login address, so following requires an account. */
  signedIn: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!signedIn) {
      // Send them through Google and back here so they can follow once signed in.
      await authClient.signIn.social({
        provider: "google",
        callbackURL: typeof window !== "undefined" ? window.location.href : undefined,
      });
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/managers/${managerId}/follow`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not update notifications.");
      setFollowing(Boolean(data?.following));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="manager-follow">
      <button
        type="button"
        className={`manager-follow-btn${following ? " is-following" : ""}`}
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {following ? "Notifications on" : "Notify me about new reviews"}
      </button>
      {error && <span className="manager-follow-error">{error}</span>}
    </div>
  );
}
