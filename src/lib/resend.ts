import { Resend } from "resend";

import { env } from "@/lib/env";

/**
 * A private, module-level variable to cache the singleton Resend client instance.
 */
let _resend: Resend | undefined;

/**
 * A lazy initializer function for the Resend client.
 * @returns The singleton `Resend` client instance.
 */
function getResend(): Resend {
  // Perform the check and assignment in a single, atomic-like operation.
  return (_resend ??= new Resend(env.RESEND_API_KEY));
}

/**
 * The exported, lazily-initialized singleton Resend client for the application.
 */
export const resend: Resend = new Proxy({} as Resend, {
  /**
   * The `get` trap intercepts any property access on the `resend` object.
   */
  get(_, prop) {
    // Ensure the singleton instance is created and available by calling the getter.
    const target = getResend();
    // Retrieve the requested property (e.g., the 'emails' object) from the actual client instance.
    const value = (target as unknown as Record<string | symbol, unknown>)[prop];
    // If the retrieved property is a function, bind `this` to the actual client instance before returning it.
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});
