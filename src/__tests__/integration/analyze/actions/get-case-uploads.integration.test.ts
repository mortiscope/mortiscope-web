"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, uploads, users } from "@/db/schema";
import { getCaseUploads } from "@/features/analyze/actions/get-case-uploads";

// Mock the authentication module to control user identity during tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Define a type for the mocked authentication function to facilitate type casting.
type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getCaseUploads` server action.
 */
describe("getCaseUploads (integration)", () => {
  // Define a constant identifier for the target case.
  const validCaseId = mockCases.firstCase.id;

  /**
   * Cleans the testing environment and seeds a primary user before each test case.
   */
  beforeEach(async () => {
    // Arrange: Reset all mocks and clear the database state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Insert the primary test user into the `users` table.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying authentication and authorization rules.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated requests return an error.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Force the `auth` function to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to fetch uploads without an active session.
      const result = await getCaseUploads(validCaseId);

      // Assert: Verify the failure status and the presence of an unauthorized error message.
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    /**
     * Test case to verify that sessions missing user identifiers are rejected.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Force the `auth` function to return a session with an empty user object.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to fetch uploads with an invalid session.
      const result = await getCaseUploads(validCaseId);

      // Assert: Verify the failure status and unauthorized error.
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });
  });

  /**
   * Test suite for verifying successful data retrieval scenarios.
   */
  describe("successful fetch", () => {
    /**
     * Configures a valid session for the primary user before success path tests.
     */
    beforeEach(() => {
      // Arrange: Mock a successful authentication session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that uploads are correctly filtered and sorted.
     */
    it("returns uploads for the specified case in descending order", async () => {
      // Arrange: Seed an active case record into the `cases` table.
      await db.insert(cases).values({
        id: validCaseId,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      // Arrange: Define dates to verify descending order logic.
      const firstDate = new Date("2024-01-01");
      const secondDate = new Date("2024-01-02");

      // Arrange: Insert two uploads for the test case and one upload belonging to a different user.
      await db.insert(uploads).values([
        {
          id: "upload-1",
          caseId: validCaseId,
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
          caseId: validCaseId,
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
        caseId: validCaseId,
        userId: "other-user",
        name: "image-3.jpg",
        key: "uploads/image-3.jpg",
        url: "https://example.com/image-3.jpg",
        size: 1000,
        type: "image/jpeg",
        width: 800,
        height: 600,
        createdAt: new Date(),
      });

      // Act: Fetch the uploads for the specific `validCaseId`.
      const result = await getCaseUploads(validCaseId);

      // Assert: Verify only primary user uploads are returned and they are sorted by date descending.
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      const data = result.data!;
      expect(data[0].id).toBe("upload-2");
      expect(data[1].id).toBe("upload-1");
    });

    /**
     * Test case to verify behavior when a case has no associated uploads.
     */
    it("returns empty array when no uploads found for case", async () => {
      // Act: Attempt to fetch uploads for an empty case.
      const result = await getCaseUploads(validCaseId);

      // Assert: Verify the success status and the return of an empty array.
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  /**
   * Test suite for verifying graceful degradation during error conditions.
   */
  describe("error handling", () => {
    /**
     * Configures a valid session before testing error responses.
     */
    beforeEach(() => {
      // Arrange: Mock a successful authentication session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify handling of explicit database exceptions.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Suppress console output and force the database query to reject.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findMany").mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act: Attempt to fetch uploads during the simulated outage.
      const result = await getCaseUploads(validCaseId);

      // Assert: Verify the failure status and that the specific error message is bubbled up.
      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to fetch uploads");
      expect(result.error).toContain("Database connection failed");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    /**
     * Test case to verify behavior when the system encounters an unstructured error.
     */
    it("handles unknown errors gracefully", async () => {
      // Arrange: Suppress console output and force an unstructured rejection.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findMany").mockRejectedValue("Unknown error");

      // Act: Attempt to fetch uploads and trigger the unknown error.
      const result = await getCaseUploads(validCaseId);

      // Assert: Verify the generic fallback error message is returned.
      expect(result.success).toBe(false);
      expect(result.error).toContain("An unknown error occurred");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
