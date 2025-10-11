import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { regenerateRecoveryCodes } from "@/features/account/actions/regenerate-recovery-codes";
import { privateActionLimiter } from "@/lib/rate-limiter";
import {
  formatRecoveryCodesForDisplay,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/lib/two-factor";

// Mock the authentication module to control user session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client for handling deletion and insertion of codes.
vi.mock("@/db", () => ({
  db: {
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

// Mock the rate limiter to simulate request throttling.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock two-factor utility functions for code generation and security processing.
vi.mock("@/lib/two-factor", () => ({
  generateRecoveryCodes: vi.fn(),
  hashRecoveryCode: vi.fn(),
  formatRecoveryCodesForDisplay: vi.fn(),
}));

/**
 * Test suite for the `regenerateRecoveryCodes` server action.
 */
describe("regenerateRecoveryCodes", () => {
  const mockUserId = "user-123";
  const mockRawCodes = ["code1", "code2"];
  const mockFormattedCodes = ["code-1", "code-2"];

  // Initialize all mocks with successful default behaviors before each test case.
  beforeEach(() => {
    vi.clearAllMocks();

    (auth as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    vi.mocked(generateRecoveryCodes).mockReturnValue(mockRawCodes);
    vi.mocked(hashRecoveryCode).mockImplementation(async (code) => `hashed_${code}`);
    vi.mocked(formatRecoveryCodesForDisplay).mockReturnValue(mockFormattedCodes);
  });

  /**
   * Test case to verify that unauthenticated users cannot access the action.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the session to return null.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to regenerate codes without a session.
    const result = await regenerateRecoveryCodes();

    // Assert: Check for the unauthorized error message.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the rate limiter prevents rapid regeneration attempts.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to return a failure state.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to regenerate codes while throttled.
    const result = await regenerateRecoveryCodes();

    // Assert: Verify that a rate-limit specific error message is returned.
    expect(result).toEqual({
      error: "You are regenerating recovery codes too frequently. Please try again later.",
    });
  });

  /**
   * Test case to verify the successful workflow of generating and saving new codes.
   */
  it("successfully regenerates codes", async () => {
    // Act: Execute the regeneration server action.
    const result = await regenerateRecoveryCodes();

    // Assert: Ensure old codes are deleted before new ones are processed.
    expect(db.delete).toHaveBeenCalled();

    // Assert: Check that 16 new codes are requested from the generator.
    expect(generateRecoveryCodes).toHaveBeenCalledWith(16);

    // Assert: Verify that each raw code is hashed and inserted into the database.
    expect(hashRecoveryCode).toHaveBeenCalledTimes(mockRawCodes.length);
    expect(db.insert).toHaveBeenCalled();

    // Assert: Confirm that codes are formatted for user display and returned successfully.
    expect(formatRecoveryCodesForDisplay).toHaveBeenCalledWith(mockRawCodes);
    expect(result).toEqual({
      success: "Recovery codes have been regenerated successfully.",
      data: {
        recoveryCodes: mockFormattedCodes,
      },
    });
  });

  /**
   * Test case to verify that system or database failures are caught and logged.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Spy on the console and mock the database to throw a connection error.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.delete).mockImplementation(() => {
      throw new Error("DB Error");
    });

    // Act: Trigger the action to process the simulated failure.
    const result = await regenerateRecoveryCodes();

    // Assert: Verify the error was logged and a friendly error message was returned.
    expect(consoleSpy).toHaveBeenCalledWith(
      "REGENERATE_RECOVERY_CODES_ACTION_ERROR:",
      expect.any(Error)
    );
    expect(result).toEqual({ error: "Failed to regenerate recovery codes." });

    // Cleanup: Restore the console spy to its original state.
    consoleSpy.mockRestore();
  });
});
