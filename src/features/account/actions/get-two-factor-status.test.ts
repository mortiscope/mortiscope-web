import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { userTwoFactor } from "@/db/schema";
import { getTwoFactorStatus } from "@/features/account/actions/get-two-factor-status";

// Mock the authentication module to control session availability in tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client specifically for the two-factor authentication table.
vi.mock("@/db", () => ({
  db: {
    query: {
      userTwoFactor: {
        findFirst: vi.fn(),
      },
    },
  },
}));

/**
 * Test suite for the `getTwoFactorStatus` server action.
 */
describe("getTwoFactorStatus", () => {
  const mockUserId = "user-123";
  const mockDate = new Date();

  // Reset all mocks and provide a default authenticated user session before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
  });

  /**
   * Test case to verify that unauthenticated requests return an unauthorized error.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the authentication function to return a null session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to retrieve the two-factor status.
    const result = await getTwoFactorStatus();

    // Assert: Check for the expected unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify default return values when no 2FA record is found in the database.
   */
  it("returns default values (false/null) if no 2FA record exists", async () => {
    // Arrange: Mock the database query to return undefined.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue(undefined);

    // Act: Retrieve the two-factor status.
    const result = await getTwoFactorStatus();

    // Assert: Verify that the response contains default disabled flags and a null date.
    expect(result).toEqual({
      success: true,
      data: {
        enabled: false,
        backupCodesGenerated: false,
        enabledAt: null,
      },
    });
  });

  /**
   * Test case to verify that an active 2FA record is correctly mapped to the response.
   */
  it("returns correct status when 2FA is enabled", async () => {
    // Arrange: Mock a database record where two-factor is enabled.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue({
      enabled: true,
      backupCodesGenerated: true,
      createdAt: mockDate,
    } as unknown as typeof userTwoFactor.$inferSelect);

    // Act: Retrieve the two-factor status.
    const result = await getTwoFactorStatus();

    // Assert: Verify that all enabled flags and dates are correctly populated.
    expect(result).toEqual({
      success: true,
      data: {
        enabled: true,
        backupCodesGenerated: true,
        enabledAt: mockDate,
      },
    });
  });

  /**
   * Test case to verify behavior when a record exists but the enabled flag is false.
   */
  it("returns correct status when record exists but is disabled", async () => {
    // Arrange: Mock a database record where the `enabled` field is set to false.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue({
      enabled: false,
      createdAt: mockDate,
    } as unknown as typeof userTwoFactor.$inferSelect);

    // Act: Retrieve the two-factor status.
    const result = await getTwoFactorStatus();

    // Assert: Verify that the response reflects a disabled state while preserving the date.
    expect(result).toEqual({
      success: true,
      data: {
        enabled: false,
        backupCodesGenerated: false,
        enabledAt: mockDate,
      },
    });
  });

  /**
   * Test case to verify that database exceptions are caught and logged appropriately.
   */
  it("handles unexpected database errors gracefully", async () => {
    // Arrange: Spy on the console and mock the database query to throw an error.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.query.userTwoFactor.findFirst).mockRejectedValue(new Error("DB Error"));

    // Act: Attempt to retrieve status during a database failure.
    const result = await getTwoFactorStatus();

    // Assert: Verify that the error was logged and a generic error message was returned.
    expect(consoleSpy).toHaveBeenCalledWith(
      "GET_TWO_FACTOR_STATUS_ACTION_ERROR:",
      expect.any(Error)
    );
    expect(result).toEqual({
      error: "Failed to get two-factor authentication status.",
    });

    // Cleanup: Restore the console spy to its original state.
    consoleSpy.mockRestore();
  });
});
