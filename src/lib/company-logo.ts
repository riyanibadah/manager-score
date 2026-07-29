import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Company logos are optional drop-in files at public/logos/<company-slug>.<ext>,
 * matching the slug already used in the company url. Nothing registers them —
 * adding the file is the whole install step, and companies without one fall
 * back to an initials tile so every page renders complete either way.
 */
const LOGO_DIR = path.join(process.cwd(), "public", "logos");
const EXTENSIONS = ["svg", "png", "webp"] as const;

// Resolved once per slug per process: these pages are revalidated hourly, so
// re-stat-ing the filesystem on every render buys nothing.
//
// Disabled in development, where a miss would otherwise be cached for the life
// of the dev server — dropping a logo in and seeing the initials tile persist
// until restart reads exactly like the feature is broken.
const cache = new Map<string, string | null>();
const useCache = process.env.NODE_ENV === "production";

export function companyLogoSrc(companySlug: string): string | null {
  const cached = useCache ? cache.get(companySlug) : undefined;
  if (cached !== undefined) return cached;

  // Slugs come from the database and reach the filesystem here, so anything
  // outside the known-safe alphabet is rejected rather than joined to a path.
  const resolved = /^[a-z0-9-]+$/.test(companySlug)
    ? EXTENSIONS.map((extension) => `${companySlug}.${extension}`).find((file) =>
        existsSync(path.join(LOGO_DIR, file)),
      )
    : undefined;

  const src = resolved ? `/logos/${resolved}` : null;
  if (useCache) cache.set(companySlug, src);
  return src;
}

/** "DoorDash" -> "DD", "Acme" -> "AC". Used when no logo file exists. */
export function companyInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
