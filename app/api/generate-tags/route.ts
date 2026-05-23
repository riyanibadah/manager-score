import { NextResponse } from "next/server";

const POSITIVE_HINTS = [
  "supportive",
  "clear",
  "kind",
  "growth",
  "fair",
  "trust",
  "feedback",
  "mentor",
  "organized",
];
const NEGATIVE_HINTS = [
  "toxic",
  "micromanage",
  "blame",
  "unclear",
  "burnout",
  "rude",
  "chaos",
  "favoritism",
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const reviewText = typeof body.reviewText === "string" ? body.reviewText : "";

  if (reviewText.trim().length < 20) {
    return NextResponse.json({ error: "Review text is too short." }, { status: 400 });
  }

  const lower = reviewText.toLowerCase();
  const tags = [
    ...POSITIVE_HINTS.filter((word) => lower.includes(word)).map((word) => ({
      tag: label(word),
      sentiment: "positive",
    })),
    ...NEGATIVE_HINTS.filter((word) => lower.includes(word)).map((word) => ({
      tag: label(word),
      sentiment: "negative",
    })),
  ].slice(0, 5);

  return NextResponse.json({
    tags: tags.length
      ? tags
      : [
          { tag: "Communication", sentiment: "neutral" },
          { tag: "Team support", sentiment: "neutral" },
          { tag: "Career growth", sentiment: "neutral" },
        ],
  });
}

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
