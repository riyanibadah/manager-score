import { hashValue } from "./reviews";
import { generateNotificationToken } from "./replies";

export const VOTER_COOKIE = "rmm_voter";
export const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

export type VoteValue = 1 | -1 | 0;

/**
 * Stable-ish identity for one voter. A signed-in user keys off their account so
 * the vote follows them across devices; everyone else keys off a long-lived
 * random cookie. Clearing cookies buys another anonymous vote — the same
 * trade-off the unlock tokens already make, and the counters aren't worth a
 * heavier identity check.
 */
export function voterKeyFor({ userId, voterToken }: { userId?: string; voterToken?: string }) {
  if (userId) return hashValue(`voter:user:${userId}`);
  if (voterToken) return hashValue(`voter:anon:${voterToken}`);
  return undefined;
}

export function newVoterToken() {
  return generateNotificationToken();
}

export function normalizeVoteValue(value: unknown): VoteValue | undefined {
  if (value === 1 || value === -1 || value === 0) return value;
  return undefined;
}
