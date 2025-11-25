import { jwtDecrypt } from "jose";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAMES } from "@/lib/constants";

/**
 * Derives the JWE encryption key using the same HKDF parameters as `@auth/core`.
 */
async function getDerivedEncryptionKey(secret: string, salt: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      info: encoder.encode(`Auth.js Generated Encryption Key (${salt})`),
    },
    keyMaterial,
    512
  );

  return new Uint8Array(derivedBits);
}

/**
 * Reads the session cookie value, handling Auth.js's cookie-chunking.
 */
function getChunkedCookieValue(req: NextRequest, cookieName: string): string | undefined {
  // Try the un-chunked cookie first.
  const single = req.cookies.get(cookieName)?.value;
  if (single) return single;

  // Otherwise, look for numbered chunks and concatenate them.
  const chunks: string[] = [];
  for (let i = 0; ; i++) {
    const chunk = req.cookies.get(`${cookieName}.${i}`)?.value;
    if (!chunk) break;
    chunks.push(chunk);
  }

  return chunks.length > 0 ? chunks.join("") : undefined;
}

/**
 * Decrypts and returns the NextAuth v5 session JWT payload from the request cookie.
 * @param req - The incoming Next.js edge request.
 * @returns The decoded JWT payload, or `null` if no valid session exists.
 */
export async function getSessionToken(req: NextRequest): Promise<Record<string, unknown> | null> {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return null;
  }

  // Find the first session cookie (or chunked set) that has a value.
  let cookieValue: string | undefined;
  let cookieName: string | undefined;
  for (const name of SESSION_COOKIE_NAMES) {
    cookieValue = getChunkedCookieValue(req, name);
    if (cookieValue) {
      cookieName = name;
      break;
    }
  }

  if (!cookieValue || !cookieName) {
    return null;
  }

  try {
    const encryptionKey = await getDerivedEncryptionKey(secret, cookieName);
    const { payload } = await jwtDecrypt(cookieValue, encryptionKey, {
      clockTolerance: 15,
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256CBC-HS512", "A256GCM"],
    });
    return payload as Record<string, unknown>;
  } catch {
    // Token is invalid, expired, or decryption failed.
    return null;
  }
}
