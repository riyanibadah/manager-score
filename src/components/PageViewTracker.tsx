"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Sends one privacy-safe pageview beacon per path change. document.referrer only
 * carries an external host on the first load of a visit (it's same-origin after
 * that, which the server buckets as "internal"), which is exactly what we want
 * for a traffic-source breakdown. Nothing identifying is sent.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // Don't count the admin's own dashboard visits, and guard against double
    // fires for the same path (e.g. React strict-mode remounts).
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    if (last.current === pathname) return;
    last.current = pathname;

    const body = JSON.stringify({ path: pathname, referrer: document.referrer || null });
    // keepalive lets the request survive the navigation that triggered it.
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
