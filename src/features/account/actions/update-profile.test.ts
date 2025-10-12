import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { db } from "@/db";
import { updateProfile } from "@/features/account/actions/update-profile";
import { AccountProfileSchema } from "@/features/account/schemas/account";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the authentication utility to control user session state in tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the user data retrieval utility to simulate database lookups for existing users.
vi.mock("@/data/user", () => ({
  getUserById: vi.fn(),
}));

// Mock the database client to intercept and verify profile update queries.
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

// Mock the rate limiter to simulate traffic control and request restrictions.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock the account profile Zod schema to control validation results for name and profile fields.
vi.mock("@/features/account/schemas/account", () => ({
  AccountProfileSchema: {
    pick: vi.fn(() => ({
      safeParse: vi.fn(),
    })),
  },
}));

/**
 * Test suite for the `updateProfile` server action.
 */
describe("updateProfile", () => {
  const mockUserId = "user-123";
  const mockUser = { id: mockUserId, name: "Old Name" };
  type MockDbChain = {
    set: Mock;
    where: Mock;
  };
  let mockDbChain: MockDbChain;

  // Reset mocks and establish default successful mock implementations before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    mockDbChain = {
      set: vi.fn(),
      where: vi.fn(),
    };
    mockDbChain.set.mockReturnValue(mockDbChain);
    mockDbChain.where.mockResolvedValue(undefined);

    // Arrange: Mock a valid user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    // Arrange: Ensure the rate limiter allows the request.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Mock the database returning a valid user and a successful update chain.
    vi.mocked(getUserById).mockResolvedValue(
      mockUser as unknown as Awaited<ReturnType<typeof getUserById>>
    );
    vi.mocked(db.update).mockReturnValue(mockDbChain as unknown as ReturnType<typeof db.update>);

    // Arrange: Default schema validation to success.
    const mockSafeParse = vi.fn().mockReturnValue({ success: true, data: {} });
    vi.mocked(AccountProfileSchema.pick).mockReturnValue({
      safeParse: mockSafeParse,
    } as unknown as ReturnType<typeof AccountProfileSchema.pick>);
  });

  /**
   * Test case to verify that unauthenticated users cannot perform profile updates.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Simulate a missing session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to update the profile name.
    const result = await updateProfile({ name: "New Name" });

    // Assert: Verify the unauthorized error is returned.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the rate limiter blocks frequent update attempts.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to trigger a failure state.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to update the profile name.
    const result = await updateProfile({ name: "New Name" });

    // Assert: Verify the rate limit error message.
    expect(result).toEqual({
      error: "You are attempting to update your profile too frequently. Please try again shortly.",
    });
  });

  /**
   * Test case to verify behavior when the authenticated user record is missing from the database.
   */
  it("returns error if user is not found", async () => {
    // Arrange: Force the user lookup to return null.
    vi.mocked(getUserById).mockResolvedValue(null);

    // Act: Attempt to update the profile name.
    const result = await updateProfile({ name: "New Name" });

    // Assert: Verify the "User not found" error.
    expect(result).toEqual({ error: "User not found." });
  });

  /**
   * Test case to verify that the action rejects names that fail schema validation.
   */
  it("returns error if invalid name is provided", async () => {
    // Arrange: Mock schema validation failure.
    const mockSafeParse = vi.fn().mockReturnValue({ success: false });
    vi.mocked(AccountProfileSchema.pick).mockReturnValue({
      safeParse: mockSafeParse,
    } as unknown as ReturnType<typeof AccountProfileSchema.pick>);

    // Act: Attempt to update with an empty name string.
    const result = await updateProfile({ name: "" });

    // Assert: Verify the invalid name error message.
    expect(result).toEqual({ error: "Invalid name provided." });
  });

  /**
   * Test case to verify that location fields must be updated as a complete set.
   */
  it("returns error if incomplete location fields are provided", async () => {
    // Act: Provide only one of the required location fields.
    const result = await updateProfile({
      locationRegion: "Region 1",
    });

    // Assert: Verify the validation error regarding required location fields.
    expect(result).toEqual({
      error: "All location fields (region, province, city, barangay) must be provided together.",
    });
  });

  /**
   * Test case to verify that the action rejects empty update requests.
   */
  it("returns error if no fields are provided for update", async () => {
    // Act: Provide an empty data object.
    const result = await updateProfile({});

    // Assert: Verify the "No fields provided" error message.
    expect(result).toEqual({ error: "No fields provided for update." });
  });

  /**
   * Test case to verify that a valid name change is correctly persisted to the database.
   */
  it("successfully updates name", async () => {
    // Act: Update the name field.
    const result = await updateProfile({ name: "New Name" });

    // Assert: Verify the database update call contains the new name and a timestamp.
    expect(db.update).toHaveBeenCalled();
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Name",
        updatedAt: expect.any(Date),
      })
    );
    expect(result).toEqual({ success: "Profile updated successfully." });
  });

  /**
   * Test case to verify that professional information can be updated successfully.
   */
  it("successfully updates professional info", async () => {
    // Act: Update professional title and institution.
    const result = await updateProfile({
      professionalTitle: "Developer",
      institution: "Tech Corp",
    });

    // Assert: Check that both fields are included in the database update.
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalTitle: "Developer",
        institution: "Tech Corp",
        updatedAt: expect.any(Date),
      })
    );
    expect(result).toEqual({ success: "Profile updated successfully." });
  });

  /**
   * Test case to verify that providing empty strings for professional fields resets them to null in the database.
   */
  it("updates professional info to null when empty strings provided", async () => {
    // Act: Provide empty strings for optional professional fields.
    const result = await updateProfile({
      professionalTitle: "",
      institution: "",
    });

    // Assert: Verify that the update query sets these values to null.
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalTitle: null,
        institution: null,
        updatedAt: expect.any(Date),
      })
    );
    expect(result).toEqual({ success: "Profile updated successfully." });
  });

  /**
   * Test case to verify that a full location set is correctly updated in the database.
   */
  it("successfully updates location when all fields provided", async () => {
    // Arrange: Prepare a complete location data object.
    const locationData = {
      locationRegion: "Region 1",
      locationProvince: "Province 1",
      locationCity: "City 1",
      locationBarangay: "Barangay 1",
    };

    // Act: Execute the profile update with location data.
    const result = await updateProfile(locationData);

    // Assert: Verify that all location fields were passed to the database update call.
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        ...locationData,
        updatedAt: expect.any(Date),
      })
    );
    expect(result).toEqual({ success: "Profile updated successfully." });
  });

  /**
   * Test case to verify that unexpected database errors are logged and return a generic user-facing message.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Force a database update failure and setup a console spy.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.update).mockImplementation(() => {
      throw new Error("DB Error");
    });

    // Act: Attempt to update the profile.
    const result = await updateProfile({ name: "New Name" });

    // Assert: Verify the internal error was logged and the user receives a generic message.
    expect(consoleSpy).toHaveBeenCalledWith("UPDATE_PROFILE_ACTION_ERROR:", expect.any(Error));
    expect(result).toEqual({ error: "An unexpected error occurred. Please try again." });

    consoleSpy.mockRestore();
  });
});
