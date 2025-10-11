import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { getUserSessions } from "@/features/account/actions/get-user-sessions";
import {
  formatBrowser,
  formatDevice,
  formatLocation,
  formatOperatingSystem,
  isSessionActive,
} from "@/features/account/utils/format-session";
import { decrypt } from "@/lib/crypto";

// Mock the database client to intercept session selection queries.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock session formatting utilities to verify correct data processing.
vi.mock("@/features/account/utils/format-session", () => ({
  formatBrowser: vi.fn(),
  formatDevice: vi.fn(),
  formatLocation: vi.fn(),
  formatOperatingSystem: vi.fn(),
  isSessionActive: vi.fn(),
}));

// Mock crypto library to handle decryption of stored IP addresses.
vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn(),
}));

/**
 * Test suite for the `getUserSessions` server action.
 */
describe("getUserSessions", () => {
  const mockUserId = "user-123";
  const mockDate = new Date();

  // Define a collection of mock database records representing active user sessions.
  const mockSessionRecords = [
    {
      id: "session-1",
      browserName: "Chrome",
      browserVersion: "120",
      osName: "Windows",
      osVersion: "10",
      deviceType: "desktop",
      deviceVendor: "Microsoft",
      deviceModel: "PC",
      userAgent: "Mozilla/5.0...",
      city: "City 1",
      region: "Region 1",
      country: "Country 1",
      ipAddress: "encrypted_ip_1",
      createdAt: mockDate,
      lastActiveAt: mockDate,
      isCurrentSession: true,
      sessionToken: "token-1",
    },
    {
      id: "session-2",
      browserName: "Safari",
      browserVersion: "17",
      osName: "iOS",
      osVersion: "17",
      deviceType: "mobile",
      deviceVendor: "Apple",
      deviceModel: "iPhone",
      userAgent: "Mozilla/5.0...",
      city: "City 2",
      region: "Region 2",
      country: "Country 2",
      ipAddress: "encrypted_ip_2",
      createdAt: mockDate,
      lastActiveAt: mockDate,
      isCurrentSession: false,
      sessionToken: "token-2",
    },
  ];

  // Initialize mocks with generic return values before each test case.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(formatBrowser).mockReturnValue("Formatted Browser");
    vi.mocked(formatOperatingSystem).mockReturnValue("Formatted OS");
    vi.mocked(formatDevice).mockReturnValue("Formatted Device");
    vi.mocked(formatLocation).mockReturnValue("Formatted Location");
    vi.mocked(decrypt).mockImplementation((ip) => `decrypted_${ip}`);
    vi.mocked(isSessionActive).mockReturnValue(true);
  });

  /**
   * Test case to verify that database records are correctly transformed into formatted objects.
   */
  it("returns formatted list of user sessions", async () => {
    // Arrange: Setup the database mock to return the predefined session records.
    const mockOrderBy = vi.fn().mockResolvedValue(mockSessionRecords);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Fetch sessions for the specified user ID.
    const result = await getUserSessions(mockUserId);

    // Assert: Check that the returned list contains formatted data for each session.
    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      id: "session-1",
      browser: "Formatted Browser",
      operatingSystem: "Formatted OS",
      device: "Formatted Device",
      location: "Formatted Location",
      ipAddress: "decrypted_encrypted_ip_1",
      dateAdded: mockDate,
      lastActive: mockDate,
      isCurrentSession: true,
      isActiveNow: true,
      sessionToken: "token-1",
    });

    expect(result[1]).toEqual({
      id: "session-2",
      browser: "Formatted Browser",
      operatingSystem: "Formatted OS",
      device: "Formatted Device",
      location: "Formatted Location",
      ipAddress: "decrypted_encrypted_ip_2",
      dateAdded: mockDate,
      lastActive: mockDate,
      isCurrentSession: false,
      isActiveNow: true,
      sessionToken: "token-2",
    });
  });

  /**
   * Test case to verify that an empty array is returned when no sessions are found.
   */
  it("returns empty array if no sessions found", async () => {
    // Arrange: Setup the database mock to return an empty array.
    const mockOrderBy = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Fetch sessions for a user with no history.
    const result = await getUserSessions(mockUserId);

    // Assert: Check that the result is an empty array.
    expect(result).toEqual([]);
  });

  /**
   * Test case to verify that missing session metadata is handled using fallback values.
   */
  it("handles missing optional fields with default values", async () => {
    // Arrange: Mock a session record where various browser and OS fields are null.
    const mockSessionWithMissingFields = {
      id: "session-missing",
      browserName: null,
      browserVersion: null,
      osName: null,
      osVersion: null,
      deviceType: "unknown",
      deviceVendor: null,
      deviceModel: null,
      userAgent: "Mozilla/5.0...",
      city: "City 3",
      region: "Region 3",
      country: "Country 3",
      ipAddress: "encrypted_ip_3",
      createdAt: mockDate,
      lastActiveAt: mockDate,
      isCurrentSession: true,
      sessionToken: "token-3",
    };

    const mockOrderBy = vi.fn().mockResolvedValue([mockSessionWithMissingFields]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof db.select>);

    // Act: Process the session with missing fields.
    const result = await getUserSessions(mockUserId);

    // Assert: Verify that formatters are called with fallback "Unknown" strings.
    expect(formatBrowser).toHaveBeenCalledWith("Unknown Browser", "");
    expect(formatOperatingSystem).toHaveBeenCalledWith("Unknown OS", "");
    expect(formatDevice).toHaveBeenCalledWith(
      "unknown",
      null,
      null,
      "Unknown Browser",
      "Unknown OS",
      "Mozilla/5.0..."
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("session-missing");
  });

  /**
   * Test case to verify that database errors result in logged failures and thrown exceptions.
   */
  it("logs error and throws formatted error message on failure", async () => {
    // Arrange: Setup console spy and force the database to throw a specific error.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockError = new Error("DB Connection Failed");

    vi.mocked(db.select).mockImplementation(() => {
      throw mockError;
    });

    // Act & Assert: Check that the action rejects with the expected user-facing message.
    await expect(getUserSessions(mockUserId)).rejects.toThrow("Failed to retrieve user sessions.");

    expect(consoleSpy).toHaveBeenCalledWith("Error occurred:", {
      error: "DB Connection Failed",
      stack: expect.any(String),
      userId: mockUserId,
    });

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that non-Error throwables are logged as "Unknown error".
   */
  it("logs 'Unknown error' when strict error object is not thrown", async () => {
    // Arrange: Force the database to throw a plain string instead of an Error object.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockNonError = "Network error string";

    vi.mocked(db.select).mockImplementation(() => {
      throw mockNonError;
    });

    // Act & Assert: Check that the rejection occurs and logging uses the unknown fallback.
    await expect(getUserSessions(mockUserId)).rejects.toThrow("Failed to retrieve user sessions.");

    expect(consoleSpy).toHaveBeenCalledWith("Error occurred:", {
      error: "Unknown error",
      stack: undefined,
      userId: mockUserId,
    });

    consoleSpy.mockRestore();
  });
});
