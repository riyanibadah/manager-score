import { createHash } from "node:crypto";
import type { TagSentiment } from "@prisma/client";

export type IncomingReview = {
  managerName?: string;
  managerTitle?: string;
  company?: string;
  department?: string;
  reviewerRole?: string;
  workedWith?: string;
  employmentType?: string;
  employeeStatus?: string;
  communication?: number;
  worklife?: number;
  recognition?: number;
  wouldAgain?: boolean;
  reviewText?: string;
  traits?: Array<{ tag?: string; sentiment?: string }>;
};

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function hashValue(value: string) {
  const salt = process.env.REVIEW_HASH_SALT || "dev-review-salt";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function normalizeReview(input: IncomingReview) {
  const managerName = cleanRequired(input.managerName, "Manager name");
  const managerTitle = cleanRequired(input.managerTitle, "Manager title");
  const company = cleanRequired(input.company, "Company");
  const reviewText = cleanRequired(input.reviewText, "Review");

  if (reviewText.length < 80) {
    throw new Error("Review must be at least 80 characters.");
  }

  const review = {
    managerName,
    managerTitle,
    company,
    department: cleanOptional(input.department),
    reviewerRole: cleanOptional(input.reviewerRole),
    workedWith: allowedOptional(input.workedWith, [
      "Less than 6 months",
      "6-12 months",
      "1-2 years",
      "2+ years",
    ]),
    employmentType: allowedOptional(input.employmentType, [
      "Full-time",
      "Part-time",
      "Intern",
      "Contractor",
    ]),
    employeeStatus: allowedOptional(input.employeeStatus, [
      "Current employee",
      "Former employee",
    ]),
    communication: rating(input.communication, "Communication"),
    worklife: rating(input.worklife, "Work-life balance"),
    recognition: rating(input.recognition, "Recognition"),
    wouldAgain: typeof input.wouldAgain === "boolean" ? input.wouldAgain : null,
    reviewText,
    traits: (input.traits || [])
      .map((trait) => ({
        tag: cleanOptional(trait.tag),
        sentiment: toSentiment(trait.sentiment),
      }))
      .filter((trait): trait is { tag: string; sentiment: TagSentiment } => Boolean(trait.tag))
      .slice(0, 8),
  };

  if (review.wouldAgain === null) {
    throw new Error("Would-work-again answer is required.");
  }

  return {
    ...review,
    overall: Math.round(((review.communication + review.worklife + review.recognition) / 3) * 10) / 10,
  } as typeof review & { wouldAgain: boolean; overall: number };
}

function cleanRequired(value: unknown, label: string) {
  const cleaned = cleanOptional(value);
  if (!cleaned) throw new Error(`${label} is required.`);
  return cleaned;
}

function cleanOptional(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned || undefined;
}

function rating(value: unknown, label: string) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
    throw new Error(`${label} rating must be between 1 and 5.`);
  }
  return numeric;
}

function allowedOptional(value: unknown, allowed: string[]) {
  const cleaned = cleanOptional(value);
  if (!cleaned) return undefined;
  return allowed.includes(cleaned) ? cleaned : undefined;
}

function toSentiment(value: unknown): TagSentiment {
  if (typeof value !== "string") return "NEUTRAL";
  const upper = value.toUpperCase();
  if (upper === "POSITIVE" || upper === "NEGATIVE" || upper === "NEUTRAL") return upper;
  return "NEUTRAL";
}
