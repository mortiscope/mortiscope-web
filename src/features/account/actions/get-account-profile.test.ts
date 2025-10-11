import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getAccountProfile } from "@/features/account/actions/get-account-profile";

// Mock the authentication module to control session availability.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client and its chainable query builder methods.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
    })),
  },
}));

/**
 * Test suite for the `getAccountProfile` server action.
 */
describe("getAccountProfile", () => {
  const mockUserId = "user-123";
  const mockDate = new Date();

  // Define a standard profile object to be used across multiple test cases.
  const mockUserProfile = {
    id: mockUserId,
    name: "Dr. Test",
    email: "mortiscope@example.com",
    image: "avatar.png",
    professionalTitle: "Forensic Entomologist",
    institution: "University of Science",
    locationRegion: "01",
    locationProvince: "0101",
    locationCity: "010101",
    locationBarangay: "010101001",
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  // Reset all mocks and establish a default authenticated session before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
  });

  /**
   * Test case to verify that the action rejects requests without an active session.
   */
  it("returns error when user is not authenticated", async () => {
    // Arrange: Mock the authentication check to return null.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to retrieve the profile data.
    const result = await getAccountProfile();

    // Assert: Check that the response indicates an authentication failure.
    expect(result).toEqual({
      success: false,
      error: "Not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify that a session missing a user ID is treated as unauthenticated.
   */
  it("returns error when session exists but has no user ID", async () => {
    // Arrange: Mock a session object that contains an empty user object.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: {} });

    // Act: Attempt to retrieve the profile data.
    const result = await getAccountProfile();

    // Assert: Check that the response indicates an authentication failure.
    expect(result).toEqual({
      success: false,
      error: "Not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify behavior when the database does not contain the requested user.
   */
  it("returns error when user is not found in database", async () => {
    // Arrange: Mock the database chain to return an empty array for the query.
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Execute the profile retrieval action.
    const result = await getAccountProfile();

    // Assert: Verify that the response indicates the user was not found.
    expect(result).toEqual({
      success: false,
      error: "User not found",
      data: null,
    });
  });

  /**
   * Test case to verify the successful retrieval of profile data for a valid user.
   */
  it("returns profile data when successful", async () => {
    // Arrange: Mock the database chain to return a populated profile array.
    const mockLimit = vi.fn().mockResolvedValue([mockUserProfile]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Execute the profile retrieval action.
    const result = await getAccountProfile();

    // Assert: Check that the response contains the expected `mockUserProfile` data.
    expect(result).toEqual({
      success: true,
      error: null,
      data: mockUserProfile,
    });
  });

  /**
   * Test case to verify that internal database exceptions are caught and logged.
   */
  it("handles unexpected database errors gracefully", async () => {
    // Arrange: Spy on the console and mock the database to throw a connection error.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB Connection Failed");
    });

    // Act: Execute the profile retrieval action.
    const result = await getAccountProfile();

    // Assert: Verify the error was logged and a generic user-facing error was returned.
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching user profile:", expect.any(Error));
    expect(result).toEqual({
      success: false,
      error: "Failed to fetch profile data",
      data: null,
    });

    // Cleanup: Restore the console spy to its original state.
    consoleSpy.mockRestore();
  });
});
