import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { twoFactorRecoveryCodes, users } from "@/db/schema";
import { getRecoveryCodes } from "@/features/account/actions/get-recovery-codes";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

/**
 * Integration test suite for the `getRecoveryCodes` server action.
 */
describe("getRecoveryCodes (integration)", () => {
  // Store the created user object for reference in tests.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and default mock configurations before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear all mock history and implementations.
    vi.clearAllMocks();

    // Arrange: Generate unique credentials and hash the password.
    const uniqueId = Math.random().toString(36).substring(7);
    const email = `test-user-${uniqueId}@example.com`;
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    // Arrange: Insert a standard user into the database to act as the test subject.
    const [user] = await db
      .insert(users)
      .values({
        email,
        name: `Test User ${uniqueId}`,
        password: hashedPassword,
        emailVerified: new Date(),
      })
      .returning();

    testUser = user;

    // Arrange: Configure auth to return the authenticated test user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: user.id },
      expires: new Date().toISOString(),
    });
  });

  /**
   * Test case to verify the response structure when no recovery codes exist for the user.
   */
  it("returns recovery codes status for user with no codes", async () => {
    // Act: Invoke the server action to retrieve recovery code status.
    const result = await getRecoveryCodes();

    // Assert: Verify that the success message is returned and counters are zeroed.
    expect(result.success).toBe("Recovery codes status retrieved successfully.");
    expect(result.data).toBeDefined();
    expect(result.data?.totalCodes).toBe(0);
    expect(result.data?.usedCount).toBe(0);
    expect(result.data?.unusedCount).toBe(0);
    expect(result.data?.hasRecoveryCodes).toBe(false);
    expect(result.data?.codeStatus).toHaveLength(16);
    expect(result.data?.codeStatus.every((s) => s === false)).toBe(true);
  });

  /**
   * Test case to verify the status counts when only unused codes are present in the database.
   */
  it("returns recovery codes status for user with unused codes", async () => {
    // Arrange: Populate the `twoFactorRecoveryCodes` table with five unused records for the user.
    for (let i = 0; i < 5; i++) {
      await db
        .insert(twoFactorRecoveryCodes)
        .values({
          userId: testUser.id,
          code: `CODE-${i}`,
          used: false,
        })
        .returning();
    }

    // Act: Invoke the server action to retrieve status.
    const result = await getRecoveryCodes();

    // Assert: Verify that counts correctly reflect five unused codes.
    expect(result.success).toBe("Recovery codes status retrieved successfully.");
    expect(result.data?.totalCodes).toBe(5);
    expect(result.data?.usedCount).toBe(0);
    expect(result.data?.unusedCount).toBe(5);
    expect(result.data?.hasRecoveryCodes).toBe(true);
    expect(result.data?.codeStatus.filter((s) => s === true)).toHaveLength(5);
  });

  /**
   * Test case to verify correct categorization of used versus unused recovery codes.
   */
  it("returns recovery codes status with mix of used and unused codes", async () => {
    // Arrange: Seed the database with three unused and two used recovery codes.
    for (let i = 0; i < 3; i++) {
      await db
        .insert(twoFactorRecoveryCodes)
        .values({
          userId: testUser.id,
          code: `UNUSED-${i}`,
          used: false,
        })
        .returning();
    }

    for (let i = 0; i < 2; i++) {
      await db
        .insert(twoFactorRecoveryCodes)
        .values({
          userId: testUser.id,
          code: `USED-${i}`,
          used: true,
        })
        .returning();
    }

    // Act: Invoke the server action to retrieve status.
    const result = await getRecoveryCodes();

    // Assert: Verify that the totals and status arrays correctly partition used and unused codes.
    expect(result.success).toBe("Recovery codes status retrieved successfully.");
    expect(result.data?.totalCodes).toBe(5);
    expect(result.data?.usedCount).toBe(2);
    expect(result.data?.unusedCount).toBe(3);
    expect(result.data?.hasRecoveryCodes).toBe(true);
    expect(result.data?.codeStatus.filter((s) => s === true)).toHaveLength(3);
  });

  /**
   * Test case to verify that the action fails when the user is not authenticated.
   */
  it("fails if unauthorized", async () => {
    // Arrange: Simulate a missing authentication session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to retrieve recovery codes without a session.
    const result = await getRecoveryCodes();

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that sessions missing a user ID are rejected.
   */
  it("fails if session has no user ID", async () => {
    // Arrange: Simulate a session object that lacks the `id` property.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: {},
      expires: new Date().toISOString(),
    });

    // Act: Attempt to retrieve status with an invalid session.
    const result = await getRecoveryCodes();

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that unexpected database errors are caught and masked.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Suppress console error logging for this test case.
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Arrange: Force a failure when the query builder attempts to find recovery codes.
    const dbModule = await import("@/db");
    vi.spyOn(dbModule.db.query.twoFactorRecoveryCodes, "findMany").mockRejectedValueOnce(
      new Error("Database error")
    );

    // Act: Attempt to retrieve recovery codes status triggering the mocked error.
    const result = await getRecoveryCodes();

    // Assert: Check for the specific failure error message.
    expect(result).toEqual({ error: "Failed to retrieve recovery codes status." });
  });
});
