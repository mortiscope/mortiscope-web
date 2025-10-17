import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAccountProfile } from "@/features/account/actions/get-account-profile";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

/**
 * Integration test suite for the `getAccountProfile` server action.
 */
describe("getAccountProfile (integration)", () => {
  // Store the created user object for reference in tests.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and default mock configurations before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear all mock history and implementations.
    vi.clearAllMocks();

    // Arrange: Create a unique user with a complete profile in the database.
    const uniqueId = Math.random().toString(36).substring(7);
    const email = `test-user-${uniqueId}@example.com`;

    const [user] = await db
      .insert(users)
      .values({
        email,
        name: `Test User ${uniqueId}`,
        image: "https://example.com/avatar.jpg",
        professionalTitle: "Professional Title",
        institution: "Institution",
        locationRegion: "Region 1",
        locationProvince: "Province 1",
        locationCity: "City 1",
        locationBarangay: "Barangay 1",
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
   * Test case to verify that all user profile fields are correctly retrieved.
   */
  it("successfully returns user profile data", async () => {
    // Act: Invoke the server action to fetch the profile.
    const result = await getAccountProfile();

    // Assert: Verify the success state and that the returned data matches the `users` table record.
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(testUser.id);
    expect(result.data?.name).toBe(testUser.name);
    expect(result.data?.email).toBe(testUser.email);
    expect(result.data?.image).toBe(testUser.image);
    expect(result.data?.professionalTitle).toBe(testUser.professionalTitle);
    expect(result.data?.institution).toBe(testUser.institution);
    expect(result.data?.locationRegion).toBe(testUser.locationRegion);
    expect(result.data?.locationProvince).toBe(testUser.locationProvince);
    expect(result.data?.locationCity).toBe(testUser.locationCity);
    expect(result.data?.locationBarangay).toBe(testUser.locationBarangay);
  });

  /**
   * Test case to verify that the action fails when no session is found.
   */
  it("fails if not authenticated (no session)", async () => {
    // Arrange: Simulate a missing authentication session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to fetch the profile without a session.
    const result = await getAccountProfile();

    // Assert: Verify the authentication error response.
    expect(result).toEqual({
      success: false,
      error: "Not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify that a session missing a user identifier is rejected.
   */
  it("fails if session has no user ID", async () => {
    // Arrange: Simulate a session object that lacks the `id` property.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: {},
      expires: new Date().toISOString(),
    });

    // Act: Attempt to fetch the profile with an invalid session.
    const result = await getAccountProfile();

    // Assert: Verify the authentication error response.
    expect(result).toEqual({
      success: false,
      error: "Not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify that the action handles valid sessions for missing database records.
   */
  it("fails if user not found in database", async () => {
    // Arrange: Mock a valid session for a user that does not exist in the `users` table.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: "non-existent-user-id" },
      expires: new Date().toISOString(),
    });

    // Act: Attempt to fetch a non-existent profile.
    const result = await getAccountProfile();

    // Assert: Verify the user not found error response.
    expect(result).toEqual({
      success: false,
      error: "User not found",
      data: null,
    });
  });

  /**
   * Test case to verify that internal errors are caught and masked.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Suppress console error logging and force the auth service to throw.
    vi.spyOn(console, "error").mockImplementation(() => {});
    (vi.mocked(auth) as unknown as Mock).mockRejectedValueOnce(new Error("Auth service error"));

    // Act: Attempt to fetch the profile during a service failure.
    const result = await getAccountProfile();

    // Assert: Verify the generic failure response.
    expect(result).toEqual({
      success: false,
      error: "Failed to fetch profile data",
      data: null,
    });
  });

  /**
   * Test case to verify that the action correctly handles optional fields.
   */
  it("returns profile for user with minimal data", async () => {
    // Arrange: Create a user in the database with only mandatory fields populated.
    const uniqueId = Math.random().toString(36).substring(7);
    const [minimalUser] = await db
      .insert(users)
      .values({
        email: `minimal-${uniqueId}@example.com`,
        name: `Minimal User ${uniqueId}`,
        emailVerified: new Date(),
      })
      .returning();

    // Arrange: Set the session to point to the minimal test user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: minimalUser.id },
      expires: new Date().toISOString(),
    });

    // Act: Fetch the minimal profile.
    const result = await getAccountProfile();

    // Assert: Verify that defined fields match and optional fields are `undefined`.
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(minimalUser.id);
    expect(result.data?.name).toBe(minimalUser.name);
    expect(result.data?.email).toBe(minimalUser.email);
    expect(result.data?.professionalTitle).toBeUndefined();
    expect(result.data?.institution).toBeUndefined();
  });
});
