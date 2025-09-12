import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signIn as authSignIn } from "@/auth";
import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { signIn } from "@/features/auth/actions/signin";
import { createAuthSession } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { sendAccountDeletionCancelled, sendEmailVerification } from "@/lib/mail";
import { publicActionLimiter } from "@/lib/rate-limiter";
import { generateVerificationToken } from "@/lib/tokens";

/**
 * Define hoisted mocks for database operations to ensure consistent reference across module imports.
 */
const dbMocks = vi.hoisted(() => {
  // Mocks for db.update().set().where()
  const where = vi.fn();
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));

  // Mocks for `db.query.userTwoFactor.findFirst()`
  const findFirst = vi.fn();
  const userTwoFactor = { findFirst };
  const query = { userTwoFactor };

  return {
    update,
    set,
    where,
    query,
    findFirst,
  };
});

/**
 * Define hoisted mocks for bcrypt to ensure the spy instance is identical
 * whether accessed via static import or dynamic import in the action.
 */
const bcryptMocks = vi.hoisted(() => ({
  compare: vi.fn(),
}));

// Mock NextAuth error class to simulate authentication failures.
vi.mock("next-auth", () => {
  return {
    AuthError: class extends Error {
      type: string;
      constructor(type: string) {
        super(type);
        this.type = type;
        this.name = "AuthError";
      }
    },
  };
});

// Mock Next.js headers to simulate request metadata like IP addresses.
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock bcryptjs to control password comparison logic.
vi.mock("bcryptjs", () => ({
  compare: bcryptMocks.compare,
  default: {
    compare: bcryptMocks.compare,
  },
}));

// Mock internal application modules.

// Mock NextAuth configuration export.
vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

// Mock user data retrieval function.
vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

// Mock session creation utility.
vi.mock("@/lib/auth", () => ({
  createAuthSession: vi.fn(),
}));

// Mock email service for notification testing.
vi.mock("@/lib/mail", () => ({
  sendAccountDeletionCancelled: vi.fn(),
  sendEmailVerification: vi.fn(),
}));

// Mock rate limiter to control success/failure states.
vi.mock("@/lib/rate-limiter", () => ({
  publicActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock token generation utility.
vi.mock("@/lib/tokens", () => ({
  generateVerificationToken: vi.fn(),
}));

// Mock logging utilities.
vi.mock("@/lib/logger", () => ({
  authLogger: {},
  emailLogger: { info: vi.fn() },
  logError: vi.fn(),
  logUserAction: vi.fn(),
}));

// Mock database instance using the hoisted functions.
vi.mock("@/db", () => ({
  db: {
    update: dbMocks.update,
    query: dbMocks.query,
  },
}));

/**
 * Test suite for the signIn Server Action.
 */
describe("signIn Server Action", () => {
  // Define standard valid credentials for use in tests.
  const validCredentials = {
    email: "mortiscope@example.com",
    password: "Password123!",
  };

  /**
   * Initialize default mock behaviors to represent a valid login scenario before each test.
   */
  beforeEach(() => {
    // Rate Limit: Simulate success response.
    vi.mocked(publicActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 0,
      pending: Promise.resolve(),
    });

    // IP Address: Simulate a localhost IP.
    vi.mocked(headers).mockResolvedValue({
      get: () => "127.0.0.1",
    } as unknown as Headers);

    // User: Simulate an existing, verified user with no scheduled deletion.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      name: "Mortiscope Account",
      email: "mortiscope@example.com",
      password: "hashed-password",
      emailVerified: new Date(),
      deletionScheduledAt: null,
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // 2FA: Simulate disabled state by default.
    dbMocks.findFirst.mockResolvedValue(null);

    // Password: Simulate valid password.
    bcryptMocks.compare.mockResolvedValue(true as never);
  });

  // Reset all mocks after each test to ensure isolation.
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action prevents sign-in when rate limits are exceeded.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to return a failure response.
    vi.mocked(publicActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 0,
      remaining: 0,
      reset: 0,
      pending: Promise.resolve(),
    });

    // Act: Call the signIn action.
    const result = await signIn(validCredentials);

    // Assert: Check for the specific rate limit error message.
    expect(result).toEqual({ error: "Too many requests. Please try again in a moment." });
    expect(getUserByEmail).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that input validation blocks invalid data formats.
   */
  it("returns error if schema validation fails", async () => {
    // Arrange: Create invalid credential data.
    const invalidData = { email: "not-an-email", password: "123" };

    // Act: Call the signIn action with invalid data.
    const result = await signIn(invalidData);

    // Assert: Verify that a credential error is returned.
    expect(result).toEqual({ error: "Invalid credentials provided." });
  });

  /**
   * Test case to verify that a generic error is returned for non-existent users.
   */
  it("returns generic error if user does not exist", async () => {
    // Arrange: Mock the user lookup to return null.
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    // Act: Call the signIn action.
    const result = await signIn(validCredentials);

    // Assert: Check for the generic invalid credential message.
    expect(result).toEqual({ error: "Invalid email or password." });
  });

  /**
   * Test case to verify that users without passwords cannot sign in via credentials.
   */
  it("returns generic error if user has no password (e.g., OAuth user)", async () => {
    // Arrange: Mock a user record with no password set.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: "mortiscope@example.com",
      password: null,
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // Act: Call the signIn action.
    const result = await signIn(validCredentials);

    // Assert: Confirm that the generic error message is returned.
    expect(result).toEqual({ error: "Invalid email or password." });
  });

  /**
   * Test case to verify that signing in cancels a scheduled account deletion.
   */
  it("cancels account deletion and sends notification if user is in recovery period", async () => {
    // Arrange: Mock a user with a future deletion date.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      name: "Mortiscope Account",
      email: "mortiscope@example.com",
      password: "hashed-password",
      emailVerified: new Date(),
      deletionScheduledAt: new Date(),
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // Act: Attempt to sign in.
    await signIn(validCredentials);

    // Assert: Verify the database update clears the deletion date.
    expect(db.update).toHaveBeenCalled();
    expect(dbMocks.set).toHaveBeenCalledWith({ deletionScheduledAt: null });

    // Assert: Verify that a cancellation email notification is sent.
    expect(sendAccountDeletionCancelled).toHaveBeenCalledWith(
      "mortiscope@example.com",
      "Mortiscope Account"
    );
  });

  /**
   * Test case to verify that unverified users are blocked and sent a new verification email.
   */
  it("returns error and sends verification email if user is not verified", async () => {
    // Arrange: Mock a user with a null verification date.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: "mortiscope@example.com",
      password: "hashed-password",
      emailVerified: null,
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    vi.mocked(generateVerificationToken).mockResolvedValue({
      identifier: "mortiscope@example.com",
      token: "new-token",
      expires: new Date(),
    });

    // Act: Attempt to sign in.
    const result = await signIn(validCredentials);

    // Assert: Check for the verification required error.
    expect(result).toEqual({ error: "Please verify the email before signing in." });

    // Assert: Verify that a new token is generated and emailed.
    expect(generateVerificationToken).toHaveBeenCalledWith("mortiscope@example.com");
    expect(sendEmailVerification).toHaveBeenCalledWith("mortiscope@example.com", "new-token");
  });

  /**
   * Test case to verify that 2FA is not attempted if the password is incorrect.
   */
  it("returns error if 2FA is enabled but password is incorrect", async () => {
    // Arrange: Enable 2FA in the database mock.
    dbMocks.findFirst.mockResolvedValue({ enabled: true });

    // Arrange: Mock bcrypt to fail the password comparison.
    bcryptMocks.compare.mockResolvedValue(false as never);

    // Act: Attempt to sign in.
    const result = await signIn(validCredentials);

    // Assert: Check for the generic error.
    expect(result).toEqual({ error: "Invalid email or password." });
    // Assert: Ensure no temporary session is created.
    expect(createAuthSession).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the 2FA flow is initiated for valid credentials when enabled.
   */
  it("initiates 2FA flow if enabled and password is correct", async () => {
    // Arrange: Enable 2FA in the database mock.
    dbMocks.findFirst.mockResolvedValue({ enabled: true });

    // Arrange: Password comparison succeeds (default behavior from beforeEach).

    // Act: Attempt to sign in.
    const result = await signIn(validCredentials);

    // Assert: Verify a temporary authentication session is created.
    expect(createAuthSession).toHaveBeenCalledWith("user-123", "mortiscope@example.com");

    // Assert: Check that the result indicates 2FA is required.
    expect(result).toEqual({
      success: "Password verified. Please complete two-factor authentication.",
      requiresTwoFactor: true,
    });

    // Assert: Ensure the final sign-in process is halted pending 2FA.
    expect(authSignIn).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that standard authentication proceeds when 2FA is disabled.
   */
  it("calls authSignIn with credentials if 2FA is disabled", async () => {
    // Arrange: 2FA is disabled (default behavior).

    // Act: Call the signIn action.
    await signIn(validCredentials);

    // Assert: Verify authSignIn is called with the correct credentials.
    expect(authSignIn).toHaveBeenCalledWith("credentials", {
      email: "mortiscope@example.com",
      password: "Password123!",
      redirectTo: expect.any(String),
    });
  });

  /**
   * Test case to verify that NextAuth credential errors are mapped to user-friendly messages.
   */
  it("maps CredentialsSignin error to user-friendly message", async () => {
    // Arrange: Mock authSignIn to reject with a CredentialsSignin error.
    const authError = new AuthError("CredentialsSignin");
    authError.type = "CredentialsSignin";
    vi.mocked(authSignIn).mockRejectedValue(authError);

    // Act: Call the signIn action.
    const result = await signIn(validCredentials);

    // Assert: Check that the error is transformed into a generic message.
    expect(result).toEqual({ error: "Invalid email or password." });
  });

  /**
   * Test case to verify that account linking errors are handled correctly.
   */
  it("maps OAuthAccountNotLinked error to user-friendly message", async () => {
    // Arrange: Mock authSignIn to reject with an OAuthAccountNotLinked error.
    const authError = new AuthError("OAuthAccountNotLinked");
    authError.type = "OAuthAccountNotLinked";
    vi.mocked(authSignIn).mockRejectedValue(authError);

    // Act: Call the signIn action.
    const result = await signIn(validCredentials);

    // Assert: Check for the specific linking error message.
    expect(result).toEqual({ error: "This email is already linked with another service." });
  });

  /**
   * Test case to verify that unexpected errors are re-thrown.
   */
  it("throws unexpected errors (not instance of AuthError)", async () => {
    // Arrange: Mock authSignIn to throw a generic system error.
    const genericError = new Error("Something exploded");
    vi.mocked(authSignIn).mockRejectedValue(genericError);

    // Act & Assert: Expect the signIn action to throw the error.
    await expect(signIn(validCredentials)).rejects.toThrow("Something exploded");
  });

  /**
   * Test case to verify that account deletion cancellation proceeds even if the email notification fails.
   */
  it("logs error but proceeds if account deletion cancellation email fails", async () => {
    // Arrange: Mock a user with a future deletion date.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: "mortiscope@example.com",
      password: "hashed-password",
      emailVerified: new Date(),
      deletionScheduledAt: new Date(),
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // Arrange: Mock the email service to fail.
    const emailError = new Error("Email Service Down");
    vi.mocked(sendAccountDeletionCancelled).mockRejectedValue(emailError);

    // Act: Attempt to sign in.
    await signIn(validCredentials);

    // Assert: Verify that the error was logged.
    expect(logError).toHaveBeenCalledWith(
      expect.anything(),
      "Failed to send account deletion cancellation email, but account was recovered successfully",
      emailError,
      expect.anything()
    );

    // Assert: Verify that the regular sign-in process still attempted to proceed.
    expect(authSignIn).toHaveBeenCalled();
  });

  /**
   * Test case to verify mapping of Verification error.
   */
  it("maps Verification error to user-friendly message", async () => {
    const authError = new AuthError("Verification");
    authError.type = "Verification";
    vi.mocked(authSignIn).mockRejectedValue(authError);
    const result = await signIn(validCredentials);
    expect(result).toEqual({ error: "Please verify the email before signing in." });
  });

  /**
   * Test case to verify mapping of EmailSignInError.
   */
  it("maps EmailSignInError to user-friendly message", async () => {
    const authError = new AuthError("EmailSignInError");
    authError.type = "EmailSignInError";
    vi.mocked(authSignIn).mockRejectedValue(authError);
    const result = await signIn(validCredentials);
    expect(result).toEqual({ error: "Failed to send the sign-in email." });
  });

  /**
   * Test case to verify mapping of OAuthCallbackError.
   */
  it("maps OAuthCallbackError to user-friendly message", async () => {
    const authError = new AuthError("OAuthCallbackError");
    authError.type = "OAuthCallbackError";
    vi.mocked(authSignIn).mockRejectedValue(authError);
    const result = await signIn(validCredentials);
    expect(result).toEqual({ error: "There was an error with social login provider." });
  });

  /**
   * Test case to verify mapping of WebAuthnVerificationError.
   */
  it("maps WebAuthnVerificationError to user-friendly message", async () => {
    const authError = new AuthError("WebAuthnVerificationError");
    authError.type = "WebAuthnVerificationError";
    vi.mocked(authSignIn).mockRejectedValue(authError);
    const result = await signIn(validCredentials);
    expect(result).toEqual({ error: "Failed to verify passkey." });
  });

  /**
   * Test case to verify default error handling for unknown AuthErrors.
   */
  it("maps unknown AuthError to generic message", async () => {
    const authError = new AuthError("UnknownType");
    // Override the generic type safely for testing purposes
    Object.assign(authError, { type: "UnknownType" });
    vi.mocked(authSignIn).mockRejectedValue(authError);
    const result = await signIn(validCredentials);
    expect(result).toEqual({ error: "An unexpected error occurred." });
  });
});
