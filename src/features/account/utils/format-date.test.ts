import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatDate, formatRelativeTime } from "@/features/account/utils/format-date";

/**
 * Test suite for the `formatDate` utility function.
 */
describe("formatDate", () => {
  /**
   * Test case to verify that a `Date` object is converted into a specific long-form string.
   */
  it("formats the date into a readable string with full date and time", () => {
    // Arrange: Define a specific date for January 1, 2025, at 02:30 PM.
    const date = new Date(2025, 0, 1, 14, 30);

    // Act: Process the date through the `formatDate` function.
    const result = formatDate(date);

    // Assert: Check that the output matches the expected month, day, year, and time format.
    expect(result).toBe("January 1, 2025 at 02:30 PM");
  });

  /**
   * Test case to verify that the formatter applies padding to single-digit time components.
   */
  it("handles single digit hours and minutes correctly", () => {
    // Arrange: Define a date with single-digit hour and minute values.
    const date = new Date(2025, 11, 25, 9, 5);

    // Act: Process the date through the `formatDate` function.
    const result = formatDate(date);

    // Assert: Verify that hours and minutes are zero-padded in the final string.
    expect(result).toBe("December 25, 2025 at 09:05 AM");
  });
});

/**
 * Test suite for the `formatRelativeTime` utility function.
 */
describe("formatRelativeTime", () => {
  // Set up fake timers and a fixed system clock before each test to ensure deterministic relative calculations.
  beforeEach(() => {
    vi.useFakeTimers();
    const mockNow = new Date(2025, 0, 1, 12, 0, 0);
    vi.setSystemTime(mockNow);
  });

  // Restore the real system clock after each test to prevent side effects in other test suites.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that very recent timestamps return a "Just now" string.
   */
  it("returns 'Just now' for times less than 60 seconds ago", () => {
    // Arrange: Create a timestamp 30 seconds prior to the mocked system time.
    const secondsAgo = new Date(2025, 0, 1, 11, 59, 30);

    // Assert: Ensure the function identifies the interval as being within the "Just now" threshold.
    expect(formatRelativeTime(secondsAgo)).toBe("Just now");
  });

  /**
   * Test case to verify that intervals between one minute and one hour return minute-based strings.
   */
  it("returns relative minutes for times less than an hour ago", () => {
    // Arrange: Create a timestamp 15 minutes prior to the mocked system time.
    const minutesAgo = new Date(2025, 0, 1, 11, 45, 0);

    // Assert: Verify the output specifically mentions the count of minutes elapsed.
    expect(formatRelativeTime(minutesAgo)).toBe("15 minutes ago");
  });

  /**
   * Test case to verify that intervals between one hour and 24 hours return hour-based strings.
   */
  it("returns relative hours for times less than 24 hours ago", () => {
    // Arrange: Create a timestamp 4 hours prior to the mocked system time.
    const hoursAgo = new Date(2025, 0, 1, 8, 0, 0);

    // Assert: Verify the output specifically mentions the count of hours elapsed.
    expect(formatRelativeTime(hoursAgo)).toBe("4 hours ago");
  });

  /**
   * Test case to verify that intervals between one day and 30 days return day-based strings.
   */
  it("returns relative days for times less than 30 days ago", () => {
    // Arrange: Create a timestamp 7 days prior to the mocked system time.
    const daysAgo = new Date(2024, 11, 25, 12, 0, 0);

    // Assert: Verify the output specifically mentions the count of days elapsed.
    expect(formatRelativeTime(daysAgo)).toBe("7 days ago");
  });

  /**
   * Test case to verify that timestamps older than 30 days revert to a full date format.
   */
  it("falls back to full date format for dates older than 30 days", () => {
    // Arrange: Create a timestamp significantly older than the 30-day relative limit.
    const oldDate = new Date(2024, 10, 1, 12, 0, 0);

    // Assert: Verify that the function calls the standard date formatter instead of using relative terms.
    expect(formatRelativeTime(oldDate)).toBe("November 1, 2024 at 12:00 PM");
  });
});
