import { promises as dns } from "dns";

/**
 * Verified search-crawler detection, used to serve gated review content to
 * indexers without exposing it to visitors who haven't contributed a review.
 *
 * The user agent alone is worthless here: anyone can set it to Googlebot and
 * read the whole corpus. Every hit is confirmed by the reverse-then-forward DNS
 * check Google documents for exactly this purpose — resolve the client IP to a
 * hostname, require it under a crawler-owned domain, then resolve that hostname
 * back and require it to return the original IP. Spoofing that needs control of
 * Google's DNS.
 *
 * Serving this content to crawlers only is what Google's paywalled-content
 * guidance permits, *provided* the page also carries the isAccessibleForFree
 * markup declaring the gap. The two must ship together: without the markup this
 * is cloaking.
 */

// Suffixes are matched with a leading dot so "notgooglebot.com" can't pass.
const CRAWLER_DOMAINS = [".googlebot.com", ".google.com", ".search.msn.com"];

const CRAWLER_UA = /googlebot|google-inspectiontool|storebot-google|bingbot|adidxbot/i;

// Verification costs two DNS round trips, and a crawl hits many urls from a
// small pool of IPs. Cache per IP so only the first request in a window pays.
const CACHE_TTL_MS = 60 * 60 * 1000;
const verdicts = new Map<string, { verified: boolean; expiresAt: number }>();

function clientIpFrom(headerList: Headers) {
  // x-forwarded-for is a client-to-proxy chain; the left-most entry is the
  // origin. Trusting the right-most would resolve to the platform's own edge.
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip")?.trim() || null;
}

async function verifyIp(ip: string) {
  const cached = verdicts.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.verified;

  let verified = false;
  try {
    const hostnames = await dns.reverse(ip);
    const hostname = hostnames.find((name) =>
      CRAWLER_DOMAINS.some((domain) => name.toLowerCase().endsWith(domain)),
    );

    if (hostname) {
      // Forward-confirm: a PTR record is set by whoever controls the IP block,
      // so the reverse lookup on its own proves nothing without this step.
      const resolved = await dns.resolve(hostname).catch(() => [] as string[]);
      verified = resolved.includes(ip);
    }
  } catch {
    // NXDOMAIN, timeout, or no resolver — fail closed. A missed crawler costs
    // one uncrawled page; a false positive hands out the whole corpus.
    verified = false;
  }

  verdicts.set(ip, { verified, expiresAt: Date.now() + CACHE_TTL_MS });
  return verified;
}

/**
 * True only for a crawler whose IP forward-and-reverse resolves to a known
 * search engine. Returns false for every human visitor and every spoofed agent.
 */
export async function isVerifiedCrawler(headerList: Headers) {
  const userAgent = headerList.get("user-agent") || "";
  // Cheap gate first so normal traffic never triggers a DNS lookup.
  if (!CRAWLER_UA.test(userAgent)) return false;

  const ip = clientIpFrom(headerList);
  if (!ip) return false;

  return verifyIp(ip);
}
