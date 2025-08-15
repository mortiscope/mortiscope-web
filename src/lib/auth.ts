import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

/**
 * Interface for temporary authentication session data
 * Used during the 2FA verification process
 */
export interface AuthSession {
  userId: string;
  email: string;
  timestamp: number;
  verified: boolean;
  expiresAt: number;
  [key: string]: unknown;
}

/**
 * Configuration for auth session management
 */
const AUTH_SESSION_CONFIG = {
  cookieName: "auth-session",
  secret: new TextEncoder().encode(process.env.AUTH_SECRET || "fallback-secret"),
  maxAge: 10 * 60 * 1000,
} as const;

/**
 * Creates a temporary authentication session for 2FA verification flow.
 * This session is used to maintain state between signin steps.
 *
 * @param userId - The user's ID
 * @param email - The user's email
 * @returns Promise<void>
 */
export async function createAuthSession(userId: string, email: string): Promise<void> {
  const now = Date.now();
  const expiresAt = now + AUTH_SESSION_CONFIG.maxAge;

  const sessionData: AuthSession = {
    userId,
    email,
    timestamp: now,
    verified: false,
    expiresAt,
  };

  // Create JWT token
  const token = await new SignJWT(sessionData)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(expiresAt))
    .sign(AUTH_SESSION_CONFIG.secret);

  // Set secure HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_SESSION_CONFIG.maxAge / 1000,
    path: "/",
  });
}

/**
 * Retrieves and validates the current authentication session.
 * @returns Promise<AuthSession | null> - The session data if valid, null otherwise
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_CONFIG.cookieName)?.value;

    if (!token) {
      return null;
    }

    // Verify and decode JWT
    const { payload } = await jwtVerify(token, AUTH_SESSION_CONFIG.secret);
    const sessionData = payload as unknown as AuthSession;

    // Check if session has expired
    if (Date.now() > sessionData.expiresAt) {
      await clearAuthSession();
      return null;
    }

    return sessionData;
  } catch {
    // Invalid token or verification failed
    await clearAuthSession();
    return null;
  }
}

/**
 * Updates the verification status of the current auth session.
 * @param verified - Whether the 2FA verification was successful
 * @returns Promise<void>
 */
export async function updateAuthSessionVerification(verified: boolean): Promise<void> {
  const currentSession = await getAuthSession();
  if (!currentSession) {
    throw new Error("No active auth session found");
  }

  const updatedSession: AuthSession = {
    ...currentSession,
    verified,
    timestamp: Date.now(),
  };

  // Create new JWT with updated data
  const token = await new SignJWT(updatedSession)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(updatedSession.expiresAt))
    .sign(AUTH_SESSION_CONFIG.secret);

  // Update cookie
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor((updatedSession.expiresAt - Date.now()) / 1000),
    path: "/",
  });
}

/**
 * Clears the current authentication session.
 * @returns Promise<void>
 */
export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_CONFIG.cookieName);
}

/**
 * Checks if there's a valid authentication session.
 * @returns Promise<boolean>
 */
export async function hasValidAuthSession(): Promise<boolean> {
  const session = await getAuthSession();
  return session !== null;
}

/**
 * Checks if the current auth session is verified (2FA completed).
 * @returns Promise<boolean>
 */
export async function isAuthSessionVerified(): Promise<boolean> {
  const session = await getAuthSession();
  return session?.verified === true;
}
