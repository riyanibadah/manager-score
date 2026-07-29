import { companyInitials, companyLogoSrc } from "../lib/company-logo";

type CompanyLogoProps = {
  name: string;
  slug: string;
  size?: number;
  className?: string;
};

/**
 * A company's logo where one has been supplied, an initials tile everywhere
 * else. Server component: the logo lookup touches the filesystem.
 */
export default function CompanyLogo({ name, slug, size = 96, className }: CompanyLogoProps) {
  const src = companyLogoSrc(slug);
  const classes = ["company-logo", className].filter(Boolean).join(" ");

  if (src) {
    return (
      <img
        className={classes}
        src={src}
        // Decorative here: the company name is always rendered as text beside
        // it, so announcing it twice just adds noise for screen readers.
        alt=""
        // Square, matching the initials tile and every other mark. Logos are
        // expected to be square glyphs — crop a brand's wordmark down to its
        // monogram before adding it, the way deloitte.svg was built — and
        // object-fit letterboxes anything wider instead of distorting it.
        width={size}
        height={size}
        style={{ width: size, height: size }}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={`${classes} company-logo-fallback`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {companyInitials(name)}
    </span>
  );
}
