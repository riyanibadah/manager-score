"use client";

import { useEffect, useRef, useState } from "react";

type ShareReviewButtonProps = {
  /** Absolute, anchored URL for this review (e.g. https://…/managers/acme/jane#review-abc). */
  url: string;
  /** Short text used as the post title / message body on networks that take one. */
  title: string;
};

export default function ShareReviewButton({ url, title }: ShareReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Feature-detect after mount: navigator is unavailable during SSR, and reading
  // it during render would desync the server and client markup.
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    setCopied(false);
  }

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Clipboard API is unavailable on insecure origins and older browsers;
        // fall back to selecting the visible field and using the legacy command.
        inputRef.current?.select();
        document.execCommand("copy");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copying failed (permission denied) — leave the field selected so the
      // reader can copy it by hand.
      inputRef.current?.select();
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: title, url });
      close();
    } catch {
      // Share sheet dismissed — keep the menu open so another option can be used.
    }
  }

  const messageBody = `${title} ${url}`;
  const targets = [
    {
      key: "message",
      label: "Message",
      // `?&body=` is the form both iOS and Android SMS handlers accept.
      href: `sms:?&body=${encodeURIComponent(messageBody)}`,
      external: false,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.77 1.46 5.24 3.75 6.86-.16 1.35-.72 2.6-1.62 3.62-.2.23-.06.6.25.58 2.06-.14 3.9-.9 5.32-2.06.75.14 1.52.21 2.3.21 5.52 0 10-3.94 10-8.8S17.52 2 12 2z" />
        </svg>
      ),
    },
    {
      key: "reddit",
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      external: true,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M24 11.78a2.6 2.6 0 0 0-4.4-1.86 12.75 12.75 0 0 0-6.96-2.22l1.19-5.6 3.88.83a1.86 1.86 0 1 0 .21-1.11L13.6.9a.56.56 0 0 0-.66.43l-1.33 6.27a12.76 12.76 0 0 0-7.05 2.22 2.6 2.6 0 1 0-2.87 4.26 5.1 5.1 0 0 0-.06.79c0 4.02 4.68 7.29 10.45 7.29s10.45-3.27 10.45-7.29c0-.26-.02-.53-.06-.79A2.6 2.6 0 0 0 24 11.78zM6.19 13.64a1.86 1.86 0 1 1 3.72 0 1.86 1.86 0 0 1-3.72 0zm10.4 4.92c-1.27 1.27-3.7 1.37-4.41 1.37-.71 0-3.14-.1-4.41-1.37a.48.48 0 0 1 .68-.68c.8.8 2.52 1.09 3.73 1.09s2.92-.29 3.73-1.09a.48.48 0 1 1 .68.68zm-.3-3.06a1.86 1.86 0 1 1 0-3.72 1.86 1.86 0 0 1 0 3.72z" />
        </svg>
      ),
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      external: true,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c-.02-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <button
        type="button"
        className="share-review-link"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Share
      </button>

      {open && (
        <div className="modal-backdrop share-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="modal-card share-modal" role="dialog" aria-modal="true" aria-label="Share this review">
            <button className="modal-close" onClick={close} aria-label="Close">×</button>

            <h2 className="share-modal-title">Share this review</h2>
            <p className="share-modal-subtitle">
              Anyone with this link lands directly on this anonymous review.
            </p>

            <div className="share-targets">
              {targets.map((target) => (
                <a
                  key={target.key}
                  className={`share-target share-target-${target.key}`}
                  href={target.href}
                  {...(target.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  onClick={close}
                >
                  {target.icon}
                  <span>{target.label}</span>
                </a>
              ))}
              {canNativeShare && (
                <button type="button" className="share-target share-target-more" onClick={nativeShare}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                  <span>More</span>
                </button>
              )}
            </div>

            <div className="share-copy-row">
              <input
                ref={inputRef}
                className="share-copy-input"
                value={url}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Review link"
              />
              <button type="button" className="share-copy-btn" onClick={copyLink}>
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
