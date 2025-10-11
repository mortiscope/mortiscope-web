import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getAccountSecurity } from "@/features/account/actions/get-account-security";

// Mock the authentication module to control the presence of an active session.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client with chainable methods to simulate complex join queries.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
      })),
    })),
  },
}));

/**
 * Test suite for the `getAccountSecurity` server action.
 */
describe("getAccountSecurity", () => {
  const mockUserId = "user-123";
  const mockUserEmail = "mortiscope@example.com";

  // Reset all mocks and provide a default authenticated user before each test case.
  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
  });

  /**
   * Test case to verify that the action returns an error when no session is found.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the authentication function to return a null value.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Invoke the account security data fetcher.
    const result = await getAccountSecurity();

    // Assert: Verify that the response indicates a lack of authentication.
    expect(result).toEqual({
      success: false,
      error: "Not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify that a session without a specific user ID is rejected.
   */
  it("returns error if user ID is missing", async () => {
    // Arrange: Mock a session object that exists but contains no user data.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: {} });

    // Act: Invoke the account security data fetcher.
    const result = await getAccountSecurity();

    // Assert: Check that the "Not authenticated" error is returned.
    expect(result).toEqual({
      success: false,
      error: "Not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify behavior when the authenticated ID does not exist in the database.
   */
  it("returns error if user is not found in database", async () => {
    // Arrange: Mock the database query chain to return an empty result set.
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Invoke the account security data fetcher.
    const result = await getAccountSecurity();

    // Assert: Verify that the response returns a "User not found" error.
    expect(result).toEqual({
      success: false,
      error: "User not found",
      data: null,
    });
  });

  /**
   * Test case to verify that a null two-factor status is correctly cast to false.
   */
  it("returns security data with 2FA disabled by default (null case)", async () => {
    // Arrange: Mock database data where the `twoFactorEnabled` field is null.
    const mockData = [
      {
        id: mockUserId,
        email: mockUserEmail,
        twoFactorEnabled: null,
      },
    ];

    const mockLimit = vi.fn().mockResolvedValue(mockData);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Invoke the account security data fetcher.
    const result = await getAccountSecurity();

    // Assert: Verify that the `twoFactorEnabled` field is returned as false.
    expect(result).toEqual({
      success: true,
      error: null,
      data: {
        id: mockUserId,
        email: mockUserEmail,
        twoFactorEnabled: false,
      },
    });
  });

  /**
   * Test case to verify successful retrieval when two-factor authentication is active.
   */
  it("returns security data when 2FA is enabled", async () => {
    // Arrange: Mock database data where the `twoFactorEnabled` field is true.
    const mockData = [
      {
        id: mockUserId,
        email: mockUserEmail,
        twoFactorEnabled: true,
      },
    ];

    const mockLimit = vi.fn().mockResolvedValue(mockData);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
    const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Invoke the account security data fetcher.
    const result = await getAccountSecurity();

    // Assert: Ensure the returned data matches the mocked database values.
    expect(result).toEqual({
      success: true,
      error: null,
      data: {
        id: mockUserId,
        email: mockUserEmail,
        twoFactorEnabled: true,
      },
    });
  });

  /**
   * Test case to verify that database exceptions are caught and logged.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Spy on console output and force the database to throw an error.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB Error");
    });

    // Act: Invoke the account security data fetcher.
    const result = await getAccountSecurity();

    // Assert: Verify the error logging occurred and a failure response was generated.
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error fetching user security data:",
      expect.any(Error)
    );
    expect(result).toEqual({
      success: false,
      error: "Failed to fetch security data",
      data: null,
    });

    // Cleanup: Restore the console spy to prevent side effects in other tests.
    consoleSpy.mockRestore();
  });
});
