# Company logos

Drop a file named after the company slug — the same slug that appears in the
url at `/companies/<slug>`:

    public/logos/doordash.svg    ->  /companies/doordash
    public/logos/acme-corp.png   ->  /companies/acme-corp

`.svg`, `.png`, and `.webp` are resolved, in that order. Nothing needs to be
registered; the file existing is the whole install step. Companies without a
logo render an initials tile instead, so no page depends on one being present.

Square assets with transparent padding look best — they're rendered at 80px on
the company page and 40px in the directory grid.

A note on sourcing: use the company's own official brand asset (most publish a
press or brand kit). Don't redraw a logo by hand — a near-miss version of a
company's mark is worse than the initials fallback.
