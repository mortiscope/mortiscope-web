import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { markCurrentSession } from "@/features/account/actions/mark-current-session";

// Mock the database client with chainable update, set, and where methods.
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

/**
 * Test suite for the `markCurrentSession` server action.
 */
describe("markCurrentSession", () => {
  const mockUserId = "user-123";
  const mockSessionToken = "session-token-abc";

  // Reset all mock states before each test to ensure a clean execution environment.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action executes the two-step update process successfully.
   */
  it("successfully resets all sessions and marks the target session as current", async () => {
    // Act: Invoke the action to update session flags for the user.
    const result = await markCurrentSession(mockSessionToken, mockUserId);

    // Assert: Check that the database update was called twice (reset all, then set one).
    expect(db.update).toHaveBeenCalledTimes(2);

    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to verify that database exceptions are caught, logged, and return a failure flag.
   */
  it("handles errors gracefully and logs them", async () => {
    // Arrange: Mock a database failure and spy on the console error output.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(db.update).mockImplementationOnce(() => {
      throw new Error("Database failure");
    });

    // Act: Invoke the action while the database is failing.
    const result = await markCurrentSession(mockSessionToken, mockUserId);

    // Assert: Verify the success flag is false and error details were logged.
    expect(result).toEqual({ success: false });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error occurred:",
      expect.objectContaining({
        error: "Database failure",
        userId: mockUserId,
        sessionToken: "session-...",
      })
    );

    // Cleanup: Restore the original console error implementation.
    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that non-Error throwables are handled as "Unknown error".
   */
  it("logs 'Unknown error' when strict error object is not thrown", async () => {
    // Arrange: Force the database mock to throw a plain string instead of an Error object.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockNonError = "Network error string";

    vi.mocked(db.update).mockImplementationOnce(() => {
      throw mockNonError;
    });

    // Act: Invoke the action to trigger the non-standard error handling.
    const result = await markCurrentSession(mockSessionToken, mockUserId);

    // Assert: Verify that the log identifies the error as "Unknown error".
    expect(result).toEqual({ success: false });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error occurred:",
      expect.objectContaining({
        error: "Unknown error",
        stack: undefined,
        userId: mockUserId,
        sessionToken: "session-...",
      })
    );

    // Cleanup: Restore the original console error implementation.
    consoleSpy.mockRestore();
  });
});
