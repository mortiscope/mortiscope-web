import { describe, expect, it } from "vitest";

import { formatDateRange } from "@/features/dashboard/utils/format-date-range";

/**
 * Test suite for the date range formatting utility.
 */
describe("formatDateRange", () => {
  /**
   * Test case to verify the fallback string when no range object is provided.
   */
  it("returns default placeholder when range is undefined", () => {
    // Assert: Check that passing `undefined` returns the "Pick a date" placeholder.
    expect(formatDateRange(undefined)).toBe("Pick a date");
  });

  /**
   * Test case to verify the fallback string when the range object exists but contains no dates.
   */
  it("returns default placeholder when start date is missing", () => {
    // Assert: Check that an empty range object returns the "Pick a date" placeholder.
    expect(formatDateRange({ from: undefined, to: undefined })).toBe("Pick a date");
  });

  /**
   * Test case to verify formatting logic when only the start of the range is defined.
   */
  it("formats single date when only start date is present", () => {
    // Arrange: Create a `from` date for January 15, 2025.
    const from = new Date(2025, 0, 15);

    // Assert: Verify that only the start date is formatted without a range separator.
    expect(formatDateRange({ from, to: undefined })).toBe("Jan 15, 2025");
  });

  /**
   * Test case to verify formatting logic when both start and end dates are defined.
   */
  it("formats full range string when both dates are present", () => {
    // Arrange: Define a start date in January and an end date in February.
    const from = new Date(2025, 0, 15);
    const to = new Date(2025, 1, 20);

    // Assert: Verify the two dates are joined by a hyphen separator.
    expect(formatDateRange({ from, to })).toBe("Jan 15, 2025 - Feb 20, 2025");
  });
});
