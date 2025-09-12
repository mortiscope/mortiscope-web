import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { verifyEmailChange } from "@/features/account/actions/verify-email-change";
import { verification } from "@/features/auth/actions/verification";
import { getVerificationTokenByToken } from "@/features/auth/tokens/verification-token";
import { sendWelcomeEmail } from "@/lib/mail";

// Define hoisted mocks to handle database method chaining and ensure availability during import.
const dbMocks = vi.hoisted(() => ({
  where: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  deleteFn: vi.fn(),
}));

// Mock the user data retrieval module.
vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

// Mock the verification token retrieval module.
vi.mock("@/features/auth/tokens/verification-token", () => ({
  getVerificationTokenByToken: vi.fn(),
}));

// Mock the email service module.
vi.mock("@/lib/mail", () => ({
  sendWelcomeEmail: vi.fn(),
}));

// Mock the separate action for handling email changes.
vi.mock("@/features/account/actions/verify-email-change", () => ({
  verifyEmailChange: vi.fn(),
}));

// Mock the database instance using the hoisted mock functions.
vi.mock("@/db", () => ({
  db: {
    update: dbMocks.update,
    delete: dbMocks.deleteFn,
  },
}));

/**
 * Test suite for the verification Server Action.
 */
describe("verification Server Action", () => {
  const validToken = "valid-token-123";
  const validEmail = "mortiscope@example.com";

  // Initialize mock behaviors to represent a successful verification scenario before each test.
  beforeEach(() => {
    dbMocks.where.mockReturnValue(Promise.resolve());
    dbMocks.set.mockReturnValue({ where: dbMocks.where });
    dbMocks.update.mockReturnValue({ set: dbMocks.set });
    dbMocks.deleteFn.mockReturnValue({ where: dbMocks.where });

    vi.mocked(getVerificationTokenByToken).mockResolvedValue({
      identifier: validEmail,
      token: validToken,
      expires: new Date(Date.now() + 3600000),
    });

    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: validEmail,
      name: "Mortiscope Account",
      emailVerified: null,
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    vi.mocked(verifyEmailChange).mockResolvedValue({
      status: "success",
      message: "Email changed",
    });

    vi.mocked(sendWelcomeEmail).mockResolvedValue(undefined);
  });

  // Clear all mocks after each test to ensure test isolation.
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that an error is returned if the token is missing.
   */
  it("returns error if token is missing", async () => {
    // Act: Call the verification action with a null token.
    const result = await verification(null, undefined);

    // Assert: Check for the specific error message indicating an incomplete link.
    expect(result).toEqual({
      status: "error",
      message: "Verification link incomplete. Use the link from your email.",
    });
  });

  /**
   * Test case to verify that the request is routed to verifyEmailChange when the type indicates an email change.
   */
  it("routes to verifyEmailChange if type is 'email-change'", async () => {
    // Act: Call the verification action with the specific type parameter.
    const result = await verification("token", "email-change");

    // Assert: Ensure the email change handler is called and the token lookup is skipped.
    expect(verifyEmailChange).toHaveBeenCalledWith("token");
    expect(result).toEqual({ status: "success", message: "Email changed" });
    expect(getVerificationTokenByToken).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned if the token is invalid or not found in the database.
   */
  it("returns error if token is invalid or missing in DB", async () => {
    // Arrange: Mock the token retrieval to return null.
    vi.mocked(getVerificationTokenByToken).mockResolvedValue(null);

    // Act: Call the verification action with an invalid token.
    const result = await verification("invalid-token", null);

    // Assert: Check for the invalid token error message.
    expect(result).toEqual({
      status: "error",
      message: "Invalid or used verification link. Please request a new one if needed.",
    });
  });

  /**
   * Test case to verify that the token is deleted and an error is returned if the token has expired.
   */
  it("deletes token and returns error if token is expired", async () => {
    // Arrange: Mock the token retrieval to return an expired token.
    vi.mocked(getVerificationTokenByToken).mockResolvedValue({
      identifier: validEmail,
      token: validToken,
      expires: new Date(Date.now() - 10000),
    });

    // Act: Call the verification action with the expired token.
    const result = await verification(validToken, null);

    // Assert: Verify the expiration error message and ensure the token is deleted.
    expect(result).toEqual({ status: "error", message: "This verification link has expired." });
    expect(db.delete).toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned if the user associated with the token does not exist.
   */
  it("returns error if user associated with token does not exist", async () => {
    // Arrange: Mock the user retrieval to return null.
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    // Act: Call the verification action.
    const result = await verification(validToken, null);

    // Assert: Check for the user not found error message.
    expect(result).toEqual({
      status: "error",
      message: "User for this verification link not found.",
    });
  });

  /**
   * Test case to verify that the process handles already verified users gracefully by cleaning up the token.
   */
  it("returns success and cleans up token if user is already verified", async () => {
    // Arrange: Mock the user to have an existing verification date.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: validEmail,
      emailVerified: new Date(),
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // Act: Call the verification action.
    const result = await verification(validToken, null);

    // Assert: Verify success message and ensure token is deleted without redundant updates.
    expect(result).toEqual({ status: "success", message: "Your email is already verified." });
    expect(db.delete).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a valid request updates the user, deletes the token, and sends a welcome email.
   */
  it("verifies user, deletes token, and sends welcome email on success", async () => {
    // Act: Call the verification action with valid parameters.
    const result = await verification(validToken, null);

    // Assert: Verify database update for email verification, token deletion, and email delivery.
    expect(db.update).toHaveBeenCalled();
    expect(dbMocks.set).toHaveBeenCalledWith({ emailVerified: expect.any(Date) });
    expect(db.delete).toHaveBeenCalled();
    expect(sendWelcomeEmail).toHaveBeenCalledWith(validEmail, "Mortiscope Account");
    expect(result).toEqual({ status: "success", message: "Email successfully verified." });
  });

  /**
   * Test case to verify that unexpected errors are caught and handled gracefully.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Mock the database operation to fail and spy on console error.
    dbMocks.where.mockReturnValueOnce(Promise.reject(new Error("DB Error")));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Call the verification action.
    const result = await verification(validToken, null);

    // Assert: Check for the generic error message and restore the console spy.
    expect(result).toEqual({
      status: "error",
      message: "Verification failed due to an unexpected error.",
    });

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that errors during token cleanup (expired token) are logged but do not crash the request.
   */
  it("logs error if token cleanup fails (expired token)", async () => {
    // Arrange: Mock the token retrieval to return an expired token.
    vi.mocked(getVerificationTokenByToken).mockResolvedValue({
      identifier: validEmail,
      token: validToken,
      expires: new Date(Date.now() - 10000),
    });

    // Arrange: Mock db.delete to fail.
    dbMocks.where.mockReturnValueOnce(Promise.reject(new Error("Delete Error")));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Call the verification action.
    const result = await verification(validToken, null);

    // Assert: Verify the expected error return for expired token.
    expect(result).toEqual({ status: "error", message: "This verification link has expired." });
    // Assert: Verify that the error was logged to the console.
    expect(consoleSpy).toHaveBeenCalledWith(expect.objectContaining({ message: "Delete Error" }));

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that errors during token cleanup are logged but do not crash the request.
   */
  it("logs error if token cleanup fails (already verified user)", async () => {
    // Arrange: Mock the user to have an existing verification date.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: validEmail,
      emailVerified: new Date(),
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // Arrange: Mock db.delete to fail.
    dbMocks.where.mockReturnValueOnce(Promise.reject(new Error("Cleanup Error")));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Call the verification action.
    const result = await verification(validToken, null);

    // Assert: Verify success message despite cleanup failure.
    expect(result).toEqual({ status: "success", message: "Your email is already verified." });
    // Assert: Verify that the error was logged.
    expect(consoleSpy).toHaveBeenCalledWith(expect.objectContaining({ message: "Cleanup Error" }));

    consoleSpy.mockRestore();
  });
});
