import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getAccountProviders } from "@/features/account/actions/get-account-providers";

// Mock the authentication module to simulate user session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept and control query results.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

/**
 * Test suite for the `getAccountProviders` server action.
 */
describe("getAccountProviders", () => {
  const mockUserId = "user-123";

  // Reset all mock states before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that an error is returned when no session exists.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the authentication check to return a null session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Invoke the server action to fetch account providers.
    const result = await getAccountProviders();

    // Assert: Verify that the response indicates an authentication error.
    expect(result).toEqual({
      success: false,
      error: "User not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify that a session lacking a user ID is rejected.
   */
  it("returns error if user ID is missing in session", async () => {
    // Arrange: Mock a session object that contains an empty user record.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: {} });

    // Act: Invoke the server action to fetch account providers.
    const result = await getAccountProviders();

    // Assert: Check that the authentication failure is handled correctly.
    expect(result).toEqual({
      success: false,
      error: "User not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify behavior when the session ID does not match a database record.
   */
  it("returns error if user is not found in database", async () => {
    // Arrange: Mock a valid session but simulate an empty database result for the user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

    vi.mocked(db.select).mockReturnValueOnce({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Invoke the server action to fetch account providers.
    const result = await getAccountProviders();

    // Assert: Ensure the "User not found" error is returned.
    expect(result).toEqual({
      success: false,
      error: "User not found",
      data: null,
    });
  });

  /**
   * Test case to verify data integrity for users who only use credentials.
   */
  it("returns correct data for password-only user (no social providers)", async () => {
    // Arrange: Set up session and mock two database calls (user record and linked accounts).
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    const mockUserResult = [{ password: "hashed_password" }];
    const mockLimitUser = vi.fn().mockResolvedValue(mockUserResult);
    const mockWhereUser = vi.fn().mockReturnValue({ limit: mockLimitUser });
    const mockFromUser = vi.fn().mockReturnValue({ where: mockWhereUser });

    const mockAccountsResult: { provider: string }[] = [];
    const mockWhereAccounts = vi.fn().mockResolvedValue(mockAccountsResult);
    const mockFromAccounts = vi.fn().mockReturnValue({ where: mockWhereAccounts });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUser } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: mockFromAccounts } as unknown as ReturnType<typeof db.select>);

    // Act: Invoke the server action to fetch account providers.
    const result = await getAccountProviders();

    // Assert: Verify that `hasPassword` is true and `hasSocialProviders` is false.
    expect(result).toEqual({
      success: true,
      data: {
        hasSocialProviders: false,
        providers: [],
        hasPassword: true,
      },
      error: null,
    });
  });

  /**
   * Test case to verify data integrity for users who only use social login.
   */
  it("returns correct data for social-only user (no password)", async () => {
    // Arrange: Set up session and mock a user with a null password and a linked Google account.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    const mockUserResult = [{ password: null }];
    const mockLimitUser = vi.fn().mockResolvedValue(mockUserResult);
    const mockWhereUser = vi.fn().mockReturnValue({ limit: mockLimitUser });
    const mockFromUser = vi.fn().mockReturnValue({ where: mockWhereUser });

    const mockAccountsResult = [{ provider: "google" }];
    const mockWhereAccounts = vi.fn().mockResolvedValue(mockAccountsResult);
    const mockFromAccounts = vi.fn().mockReturnValue({ where: mockWhereAccounts });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUser } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: mockFromAccounts } as unknown as ReturnType<typeof db.select>);

    // Act: Invoke the server action to fetch account providers.
    const result = await getAccountProviders();

    // Assert: Verify that `hasPassword` is false and `google` is present in the `providers` array.
    expect(result).toEqual({
      success: true,
      data: {
        hasSocialProviders: true,
        providers: ["google"],
        hasPassword: false,
      },
      error: null,
    });
  });

  /**
   * Test case to verify data integrity for users with both social and credential logins.
   */
  it("returns correct data for hybrid user (password + social)", async () => {
    // Arrange: Set up session and mock a user with both a password and a GitHub connection.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    const mockUserResult = [{ password: "hashed_password" }];
    const mockLimitUser = vi.fn().mockResolvedValue(mockUserResult);
    const mockWhereUser = vi.fn().mockReturnValue({ limit: mockLimitUser });
    const mockFromUser = vi.fn().mockReturnValue({ where: mockWhereUser });

    const mockAccountsResult = [{ provider: "github" }];
    const mockWhereAccounts = vi.fn().mockResolvedValue(mockAccountsResult);
    const mockFromAccounts = vi.fn().mockReturnValue({ where: mockWhereAccounts });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUser } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: mockFromAccounts } as unknown as ReturnType<typeof db.select>);

    // Act: Invoke the server action to fetch account providers.
    const result = await getAccountProviders();

    // Assert: Verify that both password and social flags are true.
    expect(result).toEqual({
      success: true,
      data: {
        hasSocialProviders: true,
        providers: ["github"],
        hasPassword: true,
      },
      error: null,
    });
  });

  /**
   * Test case to verify that unexpected database errors are caught and logged.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Mock a database failure and suppress console output for the test duration.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB Connection Failed");
    });

    // Act: Invoke the server action to fetch account providers.
    const result = await getAccountProviders();

    // Assert: Check that the error was logged and a clean failure response was returned.
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching account providers:", expect.any(Error));
    expect(result).toEqual({
      success: false,
      error: "Failed to fetch account providers",
      data: null,
    });

    // Cleanup: Restore console error functionality.
    consoleSpy.mockRestore();
  });
});
