"use server";

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { updateProfile } from "@/features/account/actions/update-profile";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the rate limiter to control request limits during testing.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

/**
 * Integration test suite for `updateProfile` server action.
 */
describe("updateProfile (integration)", () => {
  const mockUserId = "test-user-id";
  const mockUserEmail = "test@example.com";

  /**
   * Sets up a fresh test user and default mock configurations before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Configure auth to return an authenticated test user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    // Arrange: Configure the rate limiter to allow requests by default.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Seed the `users` table with a test user record.
    await db.insert(users).values({
      id: mockUserId,
      email: mockUserEmail,
      name: "MortiScope Account",
      emailVerified: new Date(),
    });
  });

  /**
   * Test suite for session validation and rate limiting.
   */
  describe("authentication and authorization", () => {
    /**
     * Test case to verify that the action fails when the session is null.
     */
    it("returns unauthorized error when session is missing", async () => {
      // Arrange: Simulate an unauthenticated session.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

      // Act: Attempt to update the profile without a session.
      const result = await updateProfile({ name: "New Name" });

      // Assert: Verify the unauthorized error message.
      expect(result.error).toBe("Unauthorized.");
    });

    /**
     * Test case to verify that the action fails when the user ID is missing from the session.
     */
    it("returns unauthorized when session has no user id", async () => {
      // Arrange: Simulate a session lacking a user identifier.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
        user: {},
      });

      // Act: Attempt to update the profile with an incomplete session.
      const result = await updateProfile({ name: "New Name" });

      // Assert: Verify the unauthorized error message.
      expect(result.error).toBe("Unauthorized.");
    });

    /**
     * Test case to verify that the action respects rate limit exhaustion.
     */
    it("returns rate limit error when limit exceeded", async () => {
      // Arrange: Mock the rate limiter to return a failure status.
      vi.mocked(privateActionLimiter.limit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now(),
        pending: Promise.resolve(),
      });

      // Act: Attempt to update the profile when rate limited.
      const result = await updateProfile({ name: "New Name" });

      // Assert: Verify the specific rate limit error message.
      expect(result.error).toBe(
        "You are attempting to update your profile too frequently. Please try again shortly."
      );
    });

    /**
     * Test case to verify that the action fails if the authenticated ID does not exist in the database.
     */
    it("returns error when user not found in database", async () => {
      // Arrange: Simulate a session with an ID that does not match the seeded user.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
        user: { id: "non-existent-user-id" },
      });

      // Act: Attempt to update the profile for a missing user record.
      const result = await updateProfile({ name: "New Name" });

      // Assert: Verify the user not found error message.
      expect(result.error).toBe("User not found.");
    });
  });

  /**
   * Test suite for updates involving the name field.
   */
  describe("name field updates", () => {
    /**
     * Test case to verify that the `name` column is correctly updated in the database.
     */
    it("successfully updates name", async () => {
      // Act: Attempt to update the user name to `Updated Name`.
      const result = await updateProfile({ name: "Updated Name" });

      // Assert: Verify the success response message.
      expect(result.success).toBe("Profile updated successfully.");

      // Assert: Confirm the `name` change persists in the `users` table.
      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(updatedUser?.name).toBe("Updated Name");
    });

    /**
     * Test case to verify that invalid name inputs do not overwrite existing data.
     */
    it("returns error for invalid name", async () => {
      // Act: Attempt to update the user name with an empty string.
      const result = await updateProfile({ name: "" });

      // Assert: Verify the validation error message.
      expect(result.error).toBe("Invalid name provided.");

      // Assert: Confirm the `name` in the database remains unchanged.
      const userInDb = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(userInDb?.name).toBe("MortiScope Account");
    });
  });

  /**
   * Test suite for professional and institutional information updates.
   */
  describe("professional info updates", () => {
    /**
     * Test case to verify successful update of the `professionalTitle` field.
     */
    it("successfully updates professional title", async () => {
      // Act: Invoke the update for `professionalTitle`.
      const result = await updateProfile({ professionalTitle: "Senior Developer" });

      // Assert: Verify success and database state.
      expect(result.success).toBe("Profile updated successfully.");

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(updatedUser?.professionalTitle).toBe("Senior Developer");
    });

    /**
     * Test case to verify successful update of the `institution` field.
     */
    it("successfully updates institution", async () => {
      // Act: Invoke the update for `institution`.
      const result = await updateProfile({ institution: "Tech University" });

      // Assert: Verify success and database state.
      expect(result.success).toBe("Profile updated successfully.");

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(updatedUser?.institution).toBe("Tech University");
    });

    /**
     * Test case to verify that providing an empty string for `professionalTitle` clears the value.
     */
    it("sets professional title to null when empty string provided", async () => {
      // Arrange: Set an initial value for the field.
      await updateProfile({ professionalTitle: "Dev" });

      // Act: Update the field with an empty string.
      const result = await updateProfile({ professionalTitle: "" });

      // Assert: Verify success and that the column value is now `null`.
      expect(result.success).toBe("Profile updated successfully.");

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(updatedUser?.professionalTitle).toBeNull();
    });

    /**
     * Test case to verify that providing an empty string for `institution` clears the value.
     */
    it("sets institution to null when empty string provided", async () => {
      // Arrange: Set an initial value for the field.
      await updateProfile({ institution: "School" });

      // Act: Update the field with an empty string.
      const result = await updateProfile({ institution: "" });

      // Assert: Verify success and that the column value is now `null`.
      expect(result.success).toBe("Profile updated successfully.");

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(updatedUser?.institution).toBeNull();
    });

    /**
     * Test case to verify that multiple professional fields can be updated simultaneously.
     */
    it("updates both professional fields together", async () => {
      // Act: Update both `professionalTitle` and `institution`.
      const result = await updateProfile({
        professionalTitle: "Developer",
        institution: "Tech Corp",
      });

      // Assert: Verify both changes are persisted in the database.
      expect(result.success).toBe("Profile updated successfully.");

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(updatedUser?.professionalTitle).toBe("Developer");
      expect(updatedUser?.institution).toBe("Tech Corp");
    });
  });

  /**
   * Test suite for address and location field updates.
   */
  describe("location updates", () => {
    /**
     * Test case to verify that location updates succeed when all four required fields are present.
     */
    it("successfully updates all location fields together", async () => {
      // Act: Invoke update with all location sub-fields.
      const result = await updateProfile({
        locationRegion: "Region 1",
        locationProvince: "Province 1",
        locationCity: "City 1",
        locationBarangay: "Barangay 1",
      });

      // Assert: Verify success and check that all columns are updated in the `users` table.
      expect(result.success).toBe("Profile updated successfully.");

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(updatedUser?.locationRegion).toBe("Region 1");
      expect(updatedUser?.locationProvince).toBe("Province 1");
      expect(updatedUser?.locationCity).toBe("City 1");
      expect(updatedUser?.locationBarangay).toBe("Barangay 1");
    });

    /**
     * Test case to verify validation failure when partial location data is provided.
     */
    it("returns error when only region is provided", async () => {
      // Act: Attempt to update only the `locationRegion`.
      const result = await updateProfile({
        locationRegion: "Region 1",
      });

      // Assert: Verify the validation error requiring all location fields.
      expect(result.error).toBe(
        "All location fields (region, province, city, barangay) must be provided together."
      );
    });

    /**
     * Test case to verify validation failure when the province field is missing.
     */
    it("returns error when province is missing", async () => {
      // Act: Attempt update with three of the four required location fields.
      const result = await updateProfile({
        locationRegion: "Region 1",
        locationCity: "City 1",
        locationBarangay: "Barangay 1",
      });

      // Assert: Verify the location validation error.
      expect(result.error).toBe(
        "All location fields (region, province, city, barangay) must be provided together."
      );
    });

    /**
     * Test case to verify validation failure when the city field is missing.
     */
    it("returns error when city is missing", async () => {
      // Act: Attempt update without the `locationCity` field.
      const result = await updateProfile({
        locationRegion: "Region 1",
        locationProvince: "Province 1",
        locationBarangay: "Barangay 1",
      });

      // Assert: Verify the location validation error.
      expect(result.error).toBe(
        "All location fields (region, province, city, barangay) must be provided together."
      );
    });

    /**
     * Test case to verify validation failure when the barangay field is missing.
     */
    it("returns error when barangay is missing", async () => {
      // Act: Attempt update without the `locationBarangay` field.
      const result = await updateProfile({
        locationRegion: "Region 1",
        locationProvince: "Province 1",
        locationCity: "City 1",
      });

      // Assert: Verify the location validation error.
      expect(result.error).toBe(
        "All location fields (region, province, city, barangay) must be provided together."
      );
    });
  });

  /**
   * Test suite for exceptional conditions and error handling.
   */
  describe("edge cases", () => {
    /**
     * Test case to verify failure when no update fields are passed in the request.
     */
    it("returns error when no fields are provided", async () => {
      // Act: Invoke the update with an empty object.
      const result = await updateProfile({});

      // Assert: Verify the error message for missing update fields.
      expect(result.error).toBe("No fields provided for update.");
    });

    /**
     * Test case to verify that database exceptions are caught and reported as unexpected errors.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Suppress console error output for clean test results.
      vi.spyOn(console, "error").mockImplementation(() => {});

      // Arrange: Force the `db.update` method to throw an error.
      const originalUpdate = db.update;
      db.update = vi.fn().mockImplementation(() => {
        throw new Error("Database Error");
      });

      // Act: Attempt to update the profile.
      const result = await updateProfile({ name: "New Name" });

      // Assert: Verify the generic error message for unexpected failures.
      expect(result.error).toBe("An unexpected error occurred. Please try again.");

      // Arrange: Restore the original database method.
      db.update = originalUpdate;
    });
  });

  /**
   * Test suite for verifying interactions between multiple update fields.
   */
  describe("combined updates", () => {
    /**
     * Test case to verify that all supported fields can be updated in a single transaction.
     */
    it("updates multiple fields in a single request", async () => {
      // Act: Perform a full profile update across name, professional, and location categories.
      const result = await updateProfile({
        name: "Full Name",
        professionalTitle: "Professional Title",
        institution: "Institution",
        locationRegion: "Region 1",
        locationProvince: "Province 1",
        locationCity: "City 1",
        locationBarangay: "Barangay 1",
      });

      // Assert: Verify success and confirm multiple field persistence.
      expect(result.success).toBe("Profile updated successfully.");

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(updatedUser?.name).toBe("Full Name");
      expect(updatedUser?.professionalTitle).toBe("Professional Title");
      expect(updatedUser?.locationRegion).toBe("Region 1");
    });

    /**
     * Test case to verify that identity and professional fields update together without conflict.
     */
    it("updates name and professional info together", async () => {
      // Act: Update the name and professional details.
      const result = await updateProfile({
        name: "MortiScope Account",
        professionalTitle: "Professional Title",
        institution: "Institution",
      });

      // Assert: Verify successful update in the database.
      expect(result.success).toBe("Profile updated successfully.");

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(updatedUser?.name).toBe("MortiScope Account");
      expect(updatedUser?.professionalTitle).toBe("Professional Title");
    });

    /**
     * Test case to verify the final existence and state of the user record after an update.
     */
    it("verifies user record exists after update", async () => {
      // Act: Perform a simple name update.
      await updateProfile({ name: "Verified Name" });

      // Assert: Select the user record directly to verify existence and the updated value.
      const [user] = await db.select().from(users).where(eq(users.id, mockUserId));
      expect(user).toBeDefined();
      expect(user.name).toBe("Verified Name");
    });
  });
});
