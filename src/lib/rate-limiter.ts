import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

/**
 * A private, module-level variable to cache the singleton Redis client instance.
 */
let _redis: Redis | undefined;

/**
 * A lazy initializer function for the Redis client.
 * @returns The singleton `Redis` client instance.
 */
function getRedis(): Redis {
  // Perform the check and assignment in a single, atomic-like operation.
  return (_redis ??= new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  }));
}

let _publicActionLimiter: Ratelimit | undefined;
let _emailActionLimiter: Ratelimit | undefined;
let _privateActionLimiter: Ratelimit | undefined;

/**
 * A rate limiter for general, public-facing actions like sign-in and sign-up.
 * It's based on the user's IP address to prevent brute-force or spam from a single source.
 *
 * @config Allows 5 requests per 10 seconds from a single IP.
 */
export const publicActionLimiter: Ratelimit = new Proxy({} as Ratelimit, {
  get(_, prop) {
    const target = (_publicActionLimiter ??= new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "10 s"),
      analytics: true,
      prefix: "ratelimit:public",
    }));
    const value = (target as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});

/**
 * A rate limiter for sensitive actions that trigger an email, like password resets or email change requests.
 * It's often based on the target identifier (email or user ID) to prevent spamming a specific user's inbox.
 *
 * @config Allows 1 request per 60 seconds for a given identifier.
 */
export const emailActionLimiter: Ratelimit = new Proxy({} as Ratelimit, {
  get(_, prop) {
    const target = (_emailActionLimiter ??= new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(1, "60 s"),
      analytics: true,
      prefix: "ratelimit:email",
    }));
    const value = (target as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});

/**
 * A rate limiter for actions performed by authenticated users, like changing a password.
 * It's based on the user's ID to prevent a single compromised or malicious account from disrupting the service.
 *
 * @config Allows 10 requests per 10 seconds for a given user ID.
 */
export const privateActionLimiter: Ratelimit = new Proxy({} as Ratelimit, {
  get(_, prop) {
    const target = (_privateActionLimiter ??= new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      analytics: true,
      prefix: "ratelimit:private",
    }));
    const value = (target as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});
