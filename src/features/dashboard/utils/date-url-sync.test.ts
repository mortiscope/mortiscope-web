import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildDateRangeParams,
  formatDateForUrl,
  parseDateFromUrl,
  validateDateRange,
} from "@/features/dashboard/utils/date-url-sync";

/**
 * Test suite for date and URL synchronization utilities.
 */
describe("date-url-sync utils", () => {
  /**
   * Test group for the date formatting utility function.
   */
  describe("formatDateForUrl", () => {
    /**
     * Test case to verify conversion of a standard Date object into a ISO-style date string.
     */
    it("formats a standard date object to YYYY-MM-DD string", () => {
      // Arrange: Define a specific Date object for October 15, 2025.
      const date = new Date("2025-10-15T12:00:00.000Z");

      // Assert: Verify the output matches the expected `YYYY-MM-DD` format.
      expect(formatDateForUrl(date)).toBe("2025-10-15");
    });

    /**
     * Test case to ensure the time component of the Date object does not affect the output string.
     */
    it("formats a date object correctly regardless of time", () => {
      // Arrange: Define a Date object set to the very end of the day.
      const date = new Date("2025-01-01T23:59:59.999Z");

      // Assert: Verify the output remains strictly the date portion.
      expect(formatDateForUrl(date)).toBe("2025-01-01");
    });
  });

  /**
   * Test group for the date parsing utility function.
   */
  describe("parseDateFromUrl", () => {
    /**
     * Test case to verify successful parsing of a valid date string.
     */
    it("parses a valid YYYY-MM-DD string into a Date object", () => {
      // Act: Attempt to parse a valid date string.
      const result = parseDateFromUrl("2025-10-15");

      // Assert: Ensure the result is a valid `Date` instance representing the correct day.
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().startsWith("2025-10-15")).toBe(true);
    });

    /**
     * Test case to verify that non-compliant strings result in a null value.
     */
    it("returns null for strings not matching YYYY-MM-DD regex", () => {
      // Assert: Verify various invalid formats return `null`.
      expect(parseDateFromUrl("10-15-2025")).toBeNull();
      expect(parseDateFromUrl("2025/10/15")).toBeNull();
      expect(parseDateFromUrl("invalid-date")).toBeNull();
      expect(parseDateFromUrl("2025-1-1")).toBeNull();
    });

    /**
     * Test case to verify that syntactically correct but chronologically invalid dates result in null.
     */
    it("returns null for invalid dates that match regex", () => {
      // Assert: Verify that a non-existent month returns `null`.
      expect(parseDateFromUrl("2025-13-01")).toBeNull();
    });
  });

  /**
   * Test group for the date range validation utility function.
   */
  describe("validateDateRange", () => {
    // Constant representing a fixed "today" for consistent testing of future date logic.
    const MOCK_TODAY = new Date("2025-06-15T12:00:00Z");

    // Initialize fake timers to control the system clock before each test.
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_TODAY);
    });

    // Restore the real system clock after each test.
    afterEach(() => {
      vi.useRealTimers();
    });

    /**
     * Test case to verify successful validation of two valid past dates.
     */
    it("returns a valid DateRange for valid past dates", () => {
      // Arrange: Define start and end strings within the valid range.
      const start = "2025-01-01";
      const end = "2025-02-01";

      // Act: Execute the validation logic.
      const result = validateDateRange(start, end);

      // Assert: Ensure the returned range contains correct `Date` objects matching the inputs.
      expect(result).not.toBeNull();
      expect(result?.from).toBeInstanceOf(Date);
      expect(result?.to).toBeInstanceOf(Date);
      expect(formatDateForUrl(result!.from!)).toBe(start);
      expect(formatDateForUrl(result!.to!)).toBe(end);
    });

    /**
     * Test case to ensure missing start parameters cause validation failure.
     */
    it("returns null if start parameter is missing", () => {
      // Assert: Verify `null` is returned when `start` is missing.
      expect(validateDateRange(null, "2025-01-01")).toBeNull();
    });

    /**
     * Test case to ensure missing end parameters cause validation failure.
     */
    it("returns null if end parameter is missing", () => {
      // Assert: Verify `null` is returned when `end` is missing.
      expect(validateDateRange("2025-01-01", null)).toBeNull();
    });

    /**
     * Test case to ensure malformed date strings cause validation failure.
     */
    it("returns null if parameters are malformed", () => {
      // Assert: Verify `null` is returned when strings are not dates.
      expect(validateDateRange("abc", "2025-01-01")).toBeNull();
      expect(validateDateRange("2025-01-01", "xyz")).toBeNull();
    });

    /**
     * Test case to ensure a range where start is after end is considered invalid.
     */
    it("returns null if start date is after end date", () => {
      // Assert: Verify `null` is returned for chronologically impossible ranges.
      expect(validateDateRange("2025-02-01", "2025-01-01")).toBeNull();
    });

    /**
     * Test case to ensure future start dates are rejected.
     */
    it("returns null if start date is in the future", () => {
      // Assert: Verify `null` is returned when `from` exceeds `MOCK_TODAY`.
      expect(validateDateRange("2025-06-20", "2025-06-25")).toBeNull();
    });

    /**
     * Test case to ensure future end dates are rejected.
     */
    it("returns null if end date is in the future", () => {
      // Assert: Verify `null` is returned when `to` exceeds `MOCK_TODAY`.
      expect(validateDateRange("2025-06-01", "2025-06-20")).toBeNull();
    });

    /**
     * Test case to verify that the validation logic accepts today as a valid boundary.
     */
    it("accepts a range ending exactly on today", () => {
      // Arrange: Set a string matching the mocked current date.
      const todayStr = "2025-06-15";

      // Act: Validate a range ending today.
      const result = validateDateRange("2025-06-01", todayStr);

      // Assert: Verify the range is accepted.
      expect(result).not.toBeNull();
      expect(formatDateForUrl(result!.to!)).toBe(todayStr);
    });
  });

  /**
   * Test group for the URL parameter construction utility.
   */
  describe("buildDateRangeParams", () => {
    /**
     * Test case to verify that a URLSearchParams object is correctly generated from Date objects.
     */
    it("constructs URLSearchParams with start and end keys", () => {
      // Arrange: Define `from` and `to` Date objects.
      const from = new Date("2025-01-01");
      const to = new Date("2025-01-31");

      // Act: Generate the parameters.
      const params = buildDateRangeParams(from, to);

      // Assert: Verify the resulting object contains the correctly formatted query keys.
      expect(params).toBeInstanceOf(URLSearchParams);
      expect(params.get("start")).toBe("2025-01-01");
      expect(params.get("end")).toBe("2025-01-31");
    });
  });
});
