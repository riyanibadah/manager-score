import { randomBytes } from "node:crypto";

export const REPLY_MIN_LENGTH = 5;
export const REPLY_MAX_LENGTH = 1500;
const AUTHOR_ROLE_MAX_LENGTH = 60;

export type IncomingReply = {
  body?: string;
  authorRole?: string;
};

export function normalizeReply(input: IncomingReply) {
  const body = cleanMultiline(input.body);
  if (!body) throw new Error("Reply is required.");
  if (body.length < REPLY_MIN_LENGTH) {
    throw new Error(`Reply must be at least ${REPLY_MIN_LENGTH} characters.`);
  }
  if (body.length > REPLY_MAX_LENGTH) {
    throw new Error(`Reply must be ${REPLY_MAX_LENGTH} characters or fewer.`);
  }

  return {
    body,
    authorRole: cleanSingleLine(input.authorRole)?.slice(0, AUTHOR_ROLE_MAX_LENGTH),
  };
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().toLowerCase();
  // Deliberately permissive: the confirmation email is the real validation, so
  // this only rejects input that could never be an address.
  if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(cleaned)) return undefined;
  if (cleaned.length > 254) return undefined;
  return cleaned;
}

export function generateNotificationToken() {
  return randomBytes(24).toString("hex");
}

function cleanMultiline(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanSingleLine(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned || undefined;
}
