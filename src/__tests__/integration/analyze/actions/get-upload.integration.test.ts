"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { uploads, users } from "@/db/schema";
import { getUpload } from "@/features/analyze/actions/get-upload";

// Mock the authentication module to control user session behavior.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Define a type for the mocked authentication function for type consistency.
type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getUpload` server action.
 */
describe("getUpload (integration)", () => {
  /**
   * Cleans the database environment and seeds a primary user before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Reset mock state and clear the in-memory database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the `users` table with the primary test user.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying authentication-related constraints.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated users receive an error response.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Force the `auth` function to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to fetch uploads without an active session.
      const result = await getUpload();

      // Assert: Verify the failure status and unauthorized error message.
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    /**
     * Test case to verify that sessions missing user IDs are treated as unauthorized.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Force the `auth` function to return a session with an empty user object.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to fetch uploads with an incomplete session.
      const result = await getUpload();

      // Assert: Verify the failure status and unauthorized error message.
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });
  });

  /**
   * Test suite for verifying successful data retrieval and ownership filtering.
   */
  describe("successful fetch", () => {
    /**
     * Establishes a valid authentication session before success path tests.
     */
    beforeEach(() => {
      // Arrange: Mock a successful authentication session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that the user only retrieves their own uploads in descending order.
     */
    it("returns uploads for the authenticated user", async () => {
      // Arrange: Define dates for verifying chronological sorting.
      const firstDate = new Date("2024-01-01");
      const secondDate = new Date("2024-01-02");

      // Arrange: Insert two uploads for the primary user and one for a different user.
      await db.insert(uploads).values([
        {
          id: "upload-1",
          userId: mockUsers.primaryUser.id,
          name: "image-1.jpg",
          key: "uploads/image-1.jpg",
          url: "https://example.com/image-1.jpg",
          size: 1000,
          type: "image/jpeg",
          width: 800,
          height: 600,
          createdAt: firstDate,
        },
        {
          id: "upload-2",
          userId: mockUsers.primaryUser.id,
          name: "image-2.jpg",
          key: "uploads/image-2.jpg",
          url: "https://example.com/image-2.jpg",
          size: 1000,
          type: "image/jpeg",
          width: 800,
          height: 600,
          createdAt: secondDate,
        },
      ]);

      await db.insert(uploads).values({
        id: "upload-other",
        userId: "other-user",
        name: "image-other.jpg",
        key: "uploads/image-other.jpg",
        url: "https://example.com/image-other.jpg",
        size: 1000,
        type: "image/jpeg",
        width: 800,
        height: 600,
        createdAt: new Date(),
      });

      // Act: Fetch the uploads for the current user.
      const result = await getUpload();

      // Assert: Verify only primary user records are returned, ordered by date descending.
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      expect(result.data).toBeDefined();
      const data = result.data!;
      expect(data[0].id).toBe("upload-2");
      expect(data[1].id).toBe("upload-1");
    });

    /**
     * Test case to verify that an empty array is returned if no uploads belong to the user.
     */
    it("returns empty array when no uploads found", async () => {
      // Act: Attempt to fetch uploads for a user with no database records.
      const result = await getUpload();

      // Assert: Verify success status and empty data array.
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  /**
   * Test suite for verifying system resilience during database or unknown failures.
   */
  describe("error handling", () => {
    /**
     * Sets up a valid session prior to testing error scenarios.
     */
    beforeEach(() => {
      // Arrange: Mock a successful authentication session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that database exceptions are caught and logged appropriately.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Spy on `console.error` and force the database query to reject.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findMany").mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act: Attempt to fetch uploads during the simulated failure.
      const result = await getUpload();

      // Assert: Verify failure response containing the specific error message.
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to fetch uploads");
      expect(result.error).toContain("Database connection failed");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    /**
     * Test case to verify behavior when an unstructured unknown error occurs.
     */
    it("handles unknown errors gracefully", async () => {
      // Arrange: Suppress console output and force an unstructured rejection.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findMany").mockRejectedValue("Unknown error");

      // Act: Attempt to fetch uploads triggering the unknown error.
      const result = await getUpload();

      // Assert: Verify that a generic error message is returned.
      expect(result.success).toBe(false);
      expect(result.error).toContain("An unknown error occurred");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
