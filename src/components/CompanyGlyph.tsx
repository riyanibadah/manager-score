/**
 * Stand-in mark for a company whose name yields no initials — a blank or
 * punctuation-only name typed into the review form.
 *
 * Previously that case rendered a literal "?", which reads as an error rather
 * than a company. An office glyph says the same thing calmly and sits in the
 * same tile as the initials it replaces.
 *
 * Presentational only, so both the server-rendered CompanyLogo and the client
 * search dropdown can use it.
 */
export default function CompanyGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      // The company name is always rendered as text beside this, so announcing
      // it again would only add noise.
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 21h18" />
      <path d="M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16" />
      <path d="M14 21V10h5a1 1 0 0 1 1 1v10" />
      <path d="M8 8h2M8 12h2M8 16h2M17 14h.01M17 17h.01" />
    </svg>
  );
}
