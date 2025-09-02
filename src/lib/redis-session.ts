import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

/**
 * The initialized Upstash Redis client instance.
 * Configuration is sourced from environment variables.
 */
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * The key for the Redis Set that stores all revoked session tokens (JTI).
 */
const REVOKED_SESSIONS_KEY = "revoked_sessions";
/**
 * The key used for a temporary value to check the health of the Redis connection.
 */
const REDIS_HEALTH_KEY = "redis:health";

/**
 * Checks the health of the Redis connection by performing a simple, short-lived set operation.
 * @returns A promise that resolves to `true` if the connection is healthy, or `false` if an error occurs.
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    // Attempts to set a key with a 60-second expiration. If this succeeds, the connection is considered healthy.
    await redis.set(REDIS_HEALTH_KEY, Date.now(), { ex: 60 });
    return true;
  } catch {
    // If the SET operation fails for any reason, return false.
    return false;
  }
}

/**
 * Checks if a specific session token has been revoked by checking for its existence in the `revoked_sessions` Redis Set.
 *
 * @param sessionToken The session token (JTI) to check.
 * @returns A promise that resolves to `true` if the session is revoked, `false` if it is not, or `null`.
 */
export async function isSessionRevoked(sessionToken: string): Promise<boolean | null> {
  try {
    // `sismember` checks if a member exists in a Set. It returns 1 if it exists, 0 if not.
    const isRevoked = await redis.sismember(REVOKED_SESSIONS_KEY, sessionToken);
    return isRevoked === 1;
  } catch {
    // Return null to indicate that the check failed and the revocation status is unknown.
    return null;
  }
}

/**
 * Adds one or more session tokens to the Redis blacklist. It also ensures that the blacklist key
 * has a 30-day expiration time to prevent it from growing indefinitely with old, expired tokens.
 *
 * @param sessionTokens An array of session tokens to revoke.
 * @returns A promise that resolves to `true` on success, or `false` on failure.
 */
export async function revokeSessionsInRedis(sessionTokens: string[]): Promise<boolean> {
  // If there are no tokens to revoke, the operation is trivially successful.
  if (sessionTokens.length === 0) return true;

  try {
    // `sadd` adds the specified members to the set.
    await redis.sadd(REVOKED_SESSIONS_KEY, ...(sessionTokens as [string, ...string[]]));
    // Set a 30-day expiration on the entire set.
    await redis.expire(REVOKED_SESSIONS_KEY, 30 * 24 * 60 * 60);
    return true;
  } catch (error) {
    console.error("Failed to revoke sessions in Redis:", error);
    return false;
  }
}

/**
 * Synchronizes the Redis blacklist with a provided list of all currently revoked tokens.
 * This function first deletes the existing blacklist and then repopulates it with the new list.
 *
 * @param revokedTokens The complete list of tokens that should be in the blacklist.
 * @returns A promise that resolves to `true` on success, or `false` on failure.
 */
export async function syncRevokedSessionsToRedis(revokedTokens: string[]): Promise<boolean> {
  // If the provided list is empty, simply ensure the key is deleted.
  if (revokedTokens.length === 0) {
    try {
      await redis.del(REVOKED_SESSIONS_KEY);
      return true;
    } catch (error) {
      console.error("Failed to clear revoked sessions in Redis:", error);
      return false;
    }
  }

  try {
    // Atomically delete the old key and add all new members.
    await redis.del(REVOKED_SESSIONS_KEY);
    await redis.sadd(REVOKED_SESSIONS_KEY, ...(revokedTokens as [string, ...string[]]));
    // Re-apply the 30-day expiration to the new set.
    await redis.expire(REVOKED_SESSIONS_KEY, 30 * 24 * 60 * 60);
    return true;
  } catch (error) {
    console.error("Failed to sync revoked sessions to Redis:", error);
    return false;
  }
}

/**
 * Retrieves the total number of sessions currently in the Redis revocation blacklist.
 * This can be useful for monitoring or administrative purposes.
 *
 * @returns A promise that resolves to the number of revoked sessions, or `0` if an error occurs.
 */
export async function getRevokedSessionCount(): Promise<number> {
  try {
    // `scard` returns the cardinality (number of members) of a set.
    const count = await redis.scard(REVOKED_SESSIONS_KEY);
    return count || 0;
  } catch {
    return 0;
  }
}
