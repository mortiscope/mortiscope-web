import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

// Initializes the Redis client using type-safe environment variables
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * A rate limiter for general, public-facing actions like sign-in and sign-up.
 * It's based on the user's IP address to prevent brute-force or spam from a single source.
 *
 * @config Allows 5 requests per 10 seconds from a single IP.
 */
export const publicActionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
  analytics: true,
  prefix: "ratelimit:public",
});

/**
 * A rate limiter for sensitive actions that trigger an email, like password resets or email change requests.
 * It's often based on the target identifier (email or user ID) to prevent spamming a specific user's inbox.
 *
 * @config Allows 1 request per 60 seconds for a given identifier.
 */
export const emailActionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, "60 s"),
  analytics: true,
  prefix: "ratelimit:email",
});

/**
 * A rate limiter for actions performed by authenticated users, like changing a password.
 * It's based on the user's ID to prevent a single compromised or malicious account from disrupting the service.
 *
 * @config Allows 10 requests per 10 seconds for a given user ID.
 */
export const privateActionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "ratelimit:private",
});
