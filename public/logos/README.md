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
press or brand kit), or a maintained set like [Simple Icons][si], which is
where `doordash.svg` came from. Don't redraw a logo by hand — a near-miss
version of a company's mark is worse than the initials fallback.

`deloitte.svg` came from Wikimedia Commons instead ([Logo of Deloitte.svg][dl]),
which carries it as public domain — the mark is a wordmark below the threshold
of originality — with the usual `trademarked` flag. Simple Icons has no Deloitte
entry.

Marks render in a square box with `object-fit: contain`, so a wide wordmark
letterboxes down to an unreadable sliver rather than stretching. Crop a brand
that only ships a wordmark to its monogram before adding it, the way
`deloitte.svg` was — same paths, recomposed on a 1:1 viewBox.

`adobe.svg` is the red "A" from Simple Icons v13.0.0, the last release that
carried it: Adobe was dropped in v14, so `simple-icons@latest` 404s on
`icons/adobe.svg` and the master data file has no Adobe entry. Pin the version
if you need to re-fetch it. Simple Icons doesn't publish a reason per removal,
but Adobe's [branding guidelines][ab] do reserve the mark, which is the same
nominative-use question the paragraph below raises — a good one to settle before
the logo set grows.

Simple Icons releases the SVG files under CC0, but that covers the files, not
the marks: each logo remains the trademark of its owner and its use is still
governed by that company's brand guidelines. Displaying a logo to identify the
company whose managers are being reviewed is ordinary nominative use, but it is
a stronger association than an initials tile — worth a look from counsel before
this scales to many companies.

[si]: https://simpleicons.org
[dl]: https://commons.wikimedia.org/wiki/File:Logo_of_Deloitte.svg
[ab]: https://developer.adobe.com/developer-distribution/creative-cloud/docs/guides/branding_guidelines
