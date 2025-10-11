import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { getCurrentSession } from "@/features/account/actions/get-current-session";
import {
  formatBrowser,
  formatDevice,
  formatLocation,
  formatOperatingSystem,
  isSessionActive,
} from "@/features/account/utils/format-session";
import { decrypt } from "@/lib/crypto";

// Mock the database client with chainable query builder methods for session selection.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
      })),
    })),
  },
}));

// Mock session formatting utilities to isolate the logic of the server action.
vi.mock("@/features/account/utils/format-session", () => ({
  formatBrowser: vi.fn(),
  formatDevice: vi.fn(),
  formatLocation: vi.fn(),
  formatOperatingSystem: vi.fn(),
  isSessionActive: vi.fn(),
}));

// Mock the crypto utility to handle decryption of sensitive session data.
vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn(),
}));

/**
 * Test suite for the `getCurrentSession` server action.
 */
describe("getCurrentSession", () => {
  const mockUserId = "user-123";
  const mockDate = new Date();

  // Define a standard database record for a user session.
  const mockSessionDbRecord = {
    id: "session-1",
    browserName: "Chrome",
    browserVersion: "120.0.0",
    osName: "Windows",
    osVersion: "10",
    deviceType: "desktop",
    deviceVendor: "Microsoft",
    deviceModel: "PC",
    userAgent: "Mozilla/5.0...",
    city: "City 1",
    region: "Region 1",
    country: "Country 1",
    ipAddress: "encrypted_ip",
    createdAt: mockDate,
    lastActiveAt: mockDate,
    isCurrentSession: true,
    sessionToken: "token-123",
  };

  // Set up default mock returns for utilities and crypto before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(formatBrowser).mockReturnValue("Chrome 120");
    vi.mocked(formatOperatingSystem).mockReturnValue("Windows 10");
    vi.mocked(formatDevice).mockReturnValue("Desktop (Windows)");
    vi.mocked(formatLocation).mockReturnValue("City 1, Country 1");
    vi.mocked(decrypt).mockReturnValue("192.168.1.1");
    vi.mocked(isSessionActive).mockReturnValue(true);
  });

  /**
   * Test case to verify that null is returned when the query result is empty.
   */
  it("returns null if no session is found", async () => {
    // Arrange: Mock the database query chain to return an empty array.
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Attempt to retrieve the session for the given user.
    const result = await getCurrentSession(mockUserId);

    // Assert: Verify that the result is null.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify that a found session is correctly mapped and formatted.
   */
  it("returns formatted session info when session is found", async () => {
    // Arrange: Mock the database query chain to return the standard session record.
    const mockLimit = vi.fn().mockResolvedValue([mockSessionDbRecord]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Retrieve and format the session data.
    const result = await getCurrentSession(mockUserId);

    // Assert: Verify the object structure and that formatting functions were called with correct raw data.
    expect(result).toEqual({
      id: "session-1",
      browser: "Chrome 120",
      operatingSystem: "Windows 10",
      device: "Desktop (Windows)",
      location: "City 1, Country 1",
      ipAddress: "192.168.1.1",
      dateAdded: mockDate,
      lastActive: mockDate,
      isCurrentSession: true,
      isActiveNow: true,
      sessionToken: "token-123",
    });

    expect(formatBrowser).toHaveBeenCalledWith("Chrome", "120.0.0");
    expect(formatOperatingSystem).toHaveBeenCalledWith("Windows", "10");
    expect(decrypt).toHaveBeenCalledWith("encrypted_ip");
  });

  /**
   * Test case to verify that missing browser or OS strings are replaced with defaults.
   */
  it("handles missing optional fields with defaults", async () => {
    // Arrange: Create a session record with null values for browser and OS fields.
    const incompleteSession = {
      ...mockSessionDbRecord,
      browserName: null,
      browserVersion: null,
      osName: null,
      osVersion: null,
    };

    const mockLimit = vi.fn().mockResolvedValue([incompleteSession]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Process the incomplete session.
    await getCurrentSession(mockUserId);

    // Assert: Check that formatting utilities were called with fallback "Unknown" strings.
    expect(formatBrowser).toHaveBeenCalledWith("Unknown Browser", "");
    expect(formatOperatingSystem).toHaveBeenCalledWith("Unknown OS", "");
  });

  /**
   * Test case to verify that database exceptions result in a null return value.
   */
  it("returns null gracefully on database error", async () => {
    // Arrange: Mock the database select call to throw an error.
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB Error");
    });

    // Act: Attempt to retrieve the current session during a failure.
    const result = await getCurrentSession(mockUserId);

    // Assert: Verify that the function catches the error and returns null.
    expect(result).toBeNull();
  });
});
