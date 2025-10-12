import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { updateSessionActivity } from "@/features/account/actions/update-session-activity";

// Mock the database client to intercept update calls and simulate chainable query methods.
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
 * Test suite for the `updateSessionActivity` server action.
 */
describe("updateSessionActivity", () => {
  const mockSessionToken = "session-token-123";
  const mockDate = new Date("2025-01-01T12:00:00Z");

  // Setup fake timers and reset mocks before each test to ensure predictable timestamps and clean state.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  // Restore real timers after each test to prevent side effects in the global testing environment.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that a valid session token triggers a database update with the current time.
   */
  it("successfully updates the lastActiveAt timestamp", async () => {
    // Act: Invoke the session activity update logic with a mock token.
    const result = await updateSessionActivity(mockSessionToken);

    // Assert: Verify that the database update method was called and the action returned success.
    expect(db.update).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to verify that database exceptions result in a controlled failure response.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Force the database update method to throw an error.
    vi.mocked(db.update).mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    // Act: Attempt to update session activity.
    const result = await updateSessionActivity(mockSessionToken);

    // Assert: Verify that the function returns a failure status instead of crashing.
    expect(result).toEqual({ success: false });
  });
});
