import { authenticator } from "otplib";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { verifyTwoFactor } from "@/features/account/actions/verify-two-factor";
import { VerifyTwoFactorSchema } from "@/features/account/schemas/account";
import { privateActionLimiter } from "@/lib/rate-limiter";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/two-factor";

// Mock the TOTP library to simulate verification of time-based one-time passwords.
vi.mock("otplib", () => ({
  authenticator: {
    verify: vi.fn(),
  },
}));

// Mock the authentication utility to control user session state during test execution.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept queries and mutations for 2FA settings and recovery codes.
vi.mock("@/db", () => ({
  db: {
    query: {
      userTwoFactor: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

// Mock the Zod schema for input validation to simulate parsing successes and failures.
vi.mock("@/features/account/schemas/account", () => ({
  VerifyTwoFactorSchema: {
    safeParse: vi.fn(),
  },
}));

// Mock the rate limiter to simulate various request frequency scenarios.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock 2FA utilities to control the generation and hashing of backup recovery codes.
vi.mock("@/lib/two-factor", () => ({
  generateRecoveryCodes: vi.fn(),
  hashRecoveryCode: vi.fn(),
}));

/**
 * Test suite for the `verifyTwoFactor` server action.
 */
describe("verifyTwoFactor", () => {
  const mockUserId = "user-123";
  const mockSecret = "MOCK_SECRET";
  const mockToken = "123456";
  const mockRecoveryCodes = Array(16).fill("code");

  // Reset all mocks and establish default successful mock implementations before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    // Arrange: Setup a valid authenticated session for the user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    // Arrange: Default input validation to return successful parsing results.
    vi.mocked(VerifyTwoFactorSchema.safeParse).mockReturnValue({
      success: true,
      data: { secret: mockSecret, token: mockToken },
    } as unknown as ReturnType<typeof VerifyTwoFactorSchema.safeParse>);

    // Arrange: Configure the rate limiter to allow the request.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Default the TOTP verification to success and mock code generation logic.
    vi.mocked(authenticator.verify).mockReturnValue(true);
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue(undefined);
    vi.mocked(generateRecoveryCodes).mockReturnValue(mockRecoveryCodes);
    vi.mocked(hashRecoveryCode).mockImplementation(async (code) => `hashed_${code}`);
  });

  /**
   * Test case to verify that the action rejects malformed or missing input fields.
   */
  it("returns error if input validation fails", async () => {
    // Arrange: Force the schema validation to fail.
    vi.mocked(VerifyTwoFactorSchema.safeParse).mockReturnValue({
      success: false,
      error: { issues: [] },
    } as unknown as ReturnType<typeof VerifyTwoFactorSchema.safeParse>);

    // Act: Invoke the action with empty inputs.
    const result = await verifyTwoFactor({ secret: "", token: "" });

    // Assert: Verify that the expected validation error is returned.
    expect(result).toEqual({ error: "Invalid input." });
  });

  /**
   * Test case to verify that unauthenticated users cannot access the verification endpoint.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Simulate a missing session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to verify 2FA.
    const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

    // Assert: Verify that the unauthorized error is returned.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that rate limiting is enforced for 2FA verification attempts.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to trigger a restriction.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to verify 2FA.
    const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

    // Assert: Verify that the frequency error message is returned.
    expect(result).toEqual({
      error: "You are attempting to verify two-factor authentication too frequently.",
    });
  });

  /**
   * Test case to verify behavior when the provided TOTP token is mathematically invalid for the secret.
   */
  it("returns error if TOTP token is invalid", async () => {
    // Arrange: Force the TOTP verification utility to return false.
    vi.mocked(authenticator.verify).mockReturnValue(false);

    // Act: Attempt to verify with an incorrect token.
    const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

    // Assert: Verify that the verification code error message is returned.
    expect(result).toEqual({ error: "Invalid verification code." });
  });

  /**
   * Test case to verify that 2FA cannot be enabled if it is already active for the account.
   */
  it("returns error if 2FA is already enabled", async () => {
    // Arrange: Mock the database to return an existing enabled 2FA configuration.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue({
      enabled: true,
    } as unknown as Awaited<ReturnType<typeof db.query.userTwoFactor.findFirst>>);

    // Act: Attempt to verify 2FA.
    const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

    // Assert: Verify the duplicate enablement error message.
    expect(result).toEqual({
      error: "Two-factor authentication is already enabled for this account.",
    });
  });

  /**
   * Test case to verify that a new 2FA configuration is correctly inserted into the database.
   */
  it("enables 2FA (insert mode) and generates recovery codes", async () => {
    // Arrange: Ensure no existing 2FA record is found.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue(undefined);

    // Act: Execute the verification action.
    const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

    // Assert: Confirm code verification, recovery code generation, and database insertions occurred.
    expect(authenticator.verify).toHaveBeenCalledWith({ token: mockToken, secret: mockSecret });
    expect(generateRecoveryCodes).toHaveBeenCalledWith(16);
    expect(hashRecoveryCode).toHaveBeenCalledTimes(16);

    expect(db.insert).toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      success: "Two-factor authentication has been successfully enabled.",
      data: {
        recoveryCodes: mockRecoveryCodes,
      },
    });
  });

  /**
   * Test case to verify that an existing but disabled 2FA configuration is updated rather than re-inserted.
   */
  it("enables 2FA (update mode) if record exists but disabled", async () => {
    // Arrange: Mock the database to return an existing 2FA record that is currently disabled.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue({
      enabled: false,
    } as unknown as Awaited<ReturnType<typeof db.query.userTwoFactor.findFirst>>);

    // Act: Execute the verification action.
    const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

    // Assert: Verify that a database update was used for the config and a single insert for recovery codes.
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      success: "Two-factor authentication has been successfully enabled.",
      data: {
        recoveryCodes: mockRecoveryCodes,
      },
    });
  });

  /**
   * Test case to verify that internal database exceptions are caught and reported as generic errors.
   */
  it("handles unexpected database errors gracefully", async () => {
    // Arrange: Force a database lookup error and setup a console spy.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.query.userTwoFactor.findFirst).mockRejectedValue(new Error("DB Error"));

    // Act: Attempt to verify 2FA.
    const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

    // Assert: Verify that diagnostic logging was triggered and a user-facing error was returned.
    expect(consoleSpy).toHaveBeenCalledWith("VERIFY_TWO_FACTOR_ACTION_ERROR:", expect.any(Error));
    expect(result).toEqual({
      error: "Failed to verify two-factor authentication code.",
    });

    consoleSpy.mockRestore();
  });
});
