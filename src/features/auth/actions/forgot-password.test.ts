import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserByEmail } from "@/data/user";
import { forgotPassword } from "@/features/auth/actions/forgot-password";
import { sendForgotPassword } from "@/lib/mail";
import { emailActionLimiter } from "@/lib/rate-limiter";
import { generateForgotPasswordToken } from "@/lib/tokens";

// Mock the user data layer to control user retrieval results.
vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

// Mock the mail service to prevent actual emails from being sent during testing.
vi.mock("@/lib/mail", () => ({
  sendForgotPassword: vi.fn(),
}));

// Mock the rate limiter to test throttling logic.
vi.mock("@/lib/rate-limiter", () => ({
  emailActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock token generation to ensure deterministic token values.
vi.mock("@/lib/tokens", () => ({
  generateForgotPasswordToken: vi.fn(),
}));

/**
 * Test suite for the forgotPassword server action, handling validation, rate limiting, and email dispatch.
 */
describe("forgotPassword Server Action", () => {
  const validEmail = "mortiscope@example.com";
  const validFormData = { email: validEmail };

  // Set up default mock behaviors before each test to establish a baseline "happy path".
  beforeEach(() => {
    vi.mocked(emailActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 0,
      pending: Promise.resolve(),
    });

    vi.mocked(generateForgotPasswordToken).mockResolvedValue({
      identifier: validEmail,
      token: "mock-reset-token",
      expires: new Date(),
    });

    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: validEmail,
      password: "hashed-password",
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);
  });

  // Ensure mocks are reset after each test to prevent state leakage.
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action returns an error when an invalid email format is provided.
   */
  it("returns error if email validation fails", async () => {
    // Act: Invoke the action with an invalid email string.
    const result = await forgotPassword({ email: "invalid-email" });

    // Assert: Verify that a validation error is returned and no external services were called.
    expect(result).toEqual({ error: "Invalid email address provided." });
    expect(emailActionLimiter.limit).not.toHaveBeenCalled();
    expect(getUserByEmail).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns an error when the rate limit is exceeded.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to return a failure status.
    vi.mocked(emailActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 0,
      remaining: 0,
      reset: 0,
      pending: Promise.resolve(),
    });

    // Act: Invoke the action with valid form data.
    const result = await forgotPassword(validFormData);

    // Assert: Verify that the rate limit error is returned and the database was not queried.
    expect(result).toEqual({ error: "Too many requests. Please wait a minute before retrying." });
    expect(getUserByEmail).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns a success message even if the user does not exist to prevent email enumeration.
   */
  it("returns success message but does nothing if user does not exist (enumeration protection)", async () => {
    // Arrange: Mock the user retrieval to return null.
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    // Act: Invoke the action with an email that does not exist in the system.
    const result = await forgotPassword(validFormData);

    // Assert: Verify generic success message is returned but no token was generated or email sent.
    expect(result).toEqual({ success: "A password reset link has been sent." });

    expect(generateForgotPasswordToken).not.toHaveBeenCalled();
    expect(sendForgotPassword).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns a success message but sends no email if the user has no password (e.g., OAuth users).
   */
  it("returns success message but does nothing if user has no password (OAuth user)", async () => {
    // Arrange: Mock the user retrieval to return a user object without a password.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: validEmail,
      password: null,
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // Act: Invoke the action with the OAuth user's email.
    const result = await forgotPassword(validFormData);

    // Assert: Verify generic success message is returned but no token was generated or email sent.
    expect(result).toEqual({ success: "A password reset link has been sent." });

    expect(generateForgotPasswordToken).not.toHaveBeenCalled();
    expect(sendForgotPassword).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action generates a token and sends an email for a valid user with a password.
   */
  it("generates token and sends email for valid user with password", async () => {
    // Act: Invoke the action with valid data (Arrange phase handled by beforeEach).
    const result = await forgotPassword(validFormData);

    // Assert: Verify that the token was generated and the email service was called with the correct parameters.
    expect(generateForgotPasswordToken).toHaveBeenCalledWith(validEmail);

    expect(sendForgotPassword).toHaveBeenCalledWith(validEmail, "mock-reset-token");

    expect(result).toEqual({ success: "A password reset link has been sent." });
  });

  /**
   * Test case to verify that unexpected errors during execution are handled gracefully.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Force the database lookup to throw an error and spy on console.error.
    vi.mocked(getUserByEmail).mockRejectedValue(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Invoke the action.
    const result = await forgotPassword(validFormData);

    // Assert: Verify that a generic error message is returned and restore the console mock.
    expect(result).toEqual({ error: "An unexpected error occurred. Please try again." });

    consoleSpy.mockRestore();
  });
});
