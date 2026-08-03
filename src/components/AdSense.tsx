const AD_CLIENT = "ca-pub-7754556104842569";

/**
 * Loads the AdSense script, and only where there is something to read.
 *
 * This used to sit in the root layout, which requested ads on every url —
 * including the ~44k manager profiles that have no reviews yet, and the locked
 * view of the ones that do, whose review cards render as empty placeholder
 * elements. Both are "screens without publisher-content" under AdSense policy,
 * and the account was rejected for exactly that.
 *
 * So each page decides for itself and states why, rather than a layout deciding
 * silently for all of them. A page must show real, readable content *to this
 * visitor* before it may render this.
 *
 * Not an indexing control. Pages that skip ads are still crawled, indexed and
 * ranked as before — the ad tag is the only thing being withheld.
 */
export default function AdSense() {
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
