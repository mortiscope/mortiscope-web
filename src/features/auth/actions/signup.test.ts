import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { signUp } from "@/features/auth/actions/signup";
import { sendEmailVerification } from "@/lib/mail";
import { publicActionLimiter } from "@/lib/rate-limiter";
import { generateVerificationToken } from "@/lib/tokens";

// Define hoisted mocks to ensure the database mock is available before imports.
const dbMocks = vi.hoisted(() => {
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));
  return {
    insert,
    values,
  };
});

// Mock bcryptjs for password hashing operations.
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

// Mock Next.js headers to simulate request IP retrieval.
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock user data retrieval function.
vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

// Mock email service for sending verification emails.
vi.mock("@/lib/mail", () => ({
  sendEmailVerification: vi.fn(),
}));

// Mock rate limiter to control request limits.
vi.mock("@/lib/rate-limiter", () => ({
  publicActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock token generation utility.
vi.mock("@/lib/tokens", () => ({
  generateVerificationToken: vi.fn(),
}));

// Mock the database instance using the hoisted mock functions.
vi.mock("@/db", () => ({
  db: {
    insert: dbMocks.insert,
  },
}));

/**
 * Test suite for the signUp Server Action.
 */
describe("signUp Server Action", () => {
  const validFormData = {
    firstName: "Mortiscope",
    lastName: "Account",
    email: "mortiscope@example.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  // Set up default successful mock behaviors before each test.
  beforeEach(() => {
    // Arrange: Simulate successful rate limit check.
    vi.mocked(publicActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 0,
      pending: Promise.resolve(),
    });

    // Arrange: Simulate request headers returning a valid IP.
    vi.mocked(headers).mockResolvedValue({
      get: () => "127.0.0.1",
    } as unknown as Headers);

    // Arrange: Simulate successful token generation.
    vi.mocked(generateVerificationToken).mockResolvedValue({
      identifier: "mortiscope@example.com",
      token: "mock-token",
      expires: new Date(),
    });

    // Arrange: Simulate successful password hashing.
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);
  });

  // Clear all mocks after each test to ensure test isolation.
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action returns an error when the rate limit is exceeded.
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

    // Act: Attempt to sign up.
    const result = await signUp(validFormData);

    // Assert: Check for the rate limit error and ensure no user lookup occurred.
    expect(result).toEqual({ error: "Too many requests. Please try again in a moment." });
    expect(getUserByEmail).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that validation fails when passwords do not match.
   */
  it("returns error if validation fails (password mismatch)", async () => {
    // Arrange: Create form data with mismatched passwords.
    const invalidData = { ...validFormData, confirmPassword: "MismatchPassword" };

    // Act: Attempt to sign up with invalid data.
    const result = await signUp(invalidData);

    // Assert: Check for an error property and ensure no database insertion occurred.
    expect(result).toHaveProperty("error");
    expect(db.insert).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned if the email is already registered and verified.
   */
  it("returns error if email is already registered and verified", async () => {
    // Arrange: Mock `getUserByEmail` to return an existing verified user.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "1",
      email: "mortiscope@example.com",
      emailVerified: new Date(),
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // Act: Attempt to sign up.
    const result = await signUp(validFormData);

    // Assert: Check for the duplicate registration error.
    expect(result).toEqual({ error: "This email is already registered." });
    expect(db.insert).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the verification email is resent if the account exists but is unverified.
   */
  it("resends verification email if account exists but is not verified", async () => {
    // Arrange: Mock `getUserByEmail` to return an existing unverified user.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "1",
      email: "mortiscope@example.com",
      emailVerified: null,
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // Act: Attempt to sign up.
    const result = await signUp(validFormData);

    // Assert: Check that a new token is generated and emailed.
    expect(generateVerificationToken).toHaveBeenCalledWith("mortiscope@example.com");
    expect(sendEmailVerification).toHaveBeenCalledWith("mortiscope@example.com", "mock-token");

    // Assert: Ensure no new user record is inserted.
    expect(db.insert).not.toHaveBeenCalled();

    // Assert: Check for the specific success message indicating a resend.
    expect(result).toEqual({
      success: "An account already exists with this email but not verified.",
    });
  });

  /**
   * Test case to verify that a new user is created and a verification email is sent for valid new registration.
   */
  it("creates new user and sends verification email for valid new registration", async () => {
    // Arrange: Mock `getUserByEmail` to return null (user does not exist).
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    // Act: Attempt to sign up with valid data.
    const result = await signUp(validFormData);

    // Assert: Verify password hashing with correct salt rounds.
    expect(bcrypt.hash).toHaveBeenCalledWith("Password123!", 10);

    // Assert: Verify that the user is inserted into the database with hashed password.
    expect(db.insert).toHaveBeenCalled();
    expect(dbMocks.values).toHaveBeenCalledWith({
      name: "Mortiscope Account",
      email: "mortiscope@example.com",
      password: "hashed-password",
    });

    // Assert: Verify token generation and email sending.
    expect(generateVerificationToken).toHaveBeenCalledWith("mortiscope@example.com");
    expect(sendEmailVerification).toHaveBeenCalledWith("mortiscope@example.com", "mock-token");

    // Assert: Check for the success message.
    expect(result).toEqual({ success: "Email verification sent." });
  });

  /**
   * Test case to verify that unexpected database errors are handled gracefully.
   */
  it("returns generic error if database operation fails", async () => {
    // Arrange: Mock `getUserByEmail` to return null.
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    // Arrange: Mock the database insert to throw an error.
    dbMocks.values.mockImplementation(() => {
      throw new Error("DB Connection Failed");
    });

    // Arrange: Spy on console.error to suppress expected error logs during test.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Attempt to sign up.
    const result = await signUp(validFormData);

    // Assert: Check for the generic error message.
    expect(result).toEqual({ error: "An unexpected error occurred." });

    // Assert: Restore the console spy.
    consoleSpy.mockRestore();
  });
});
