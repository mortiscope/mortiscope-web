import { describe, expect, it } from "vitest";

import { getBrowserName, getCityProvince } from "@/features/account/utils/display-session";

/**
 * Test suite for the `getBrowserName` utility function.
 */
describe("getBrowserName", () => {
  /**
   * Test case to verify that version numbers are stripped from the browser string.
   */
  it("extracts browser name by removing version numbers", () => {
    // Assert: Ensure that versioned strings like `Chrome 120.0.0.0` are reduced to `Chrome`.
    expect(getBrowserName("Chrome 120.0.0.0")).toBe("Chrome");
    expect(getBrowserName("Firefox 115.0")).toBe("Firefox");
  });

  /**
   * Test case to verify that multi-word browser names are preserved after removing versions.
   */
  it("preserves multi-word browser names while removing versions", () => {
    // Assert: Check that `Microsoft Edge` and `Opera Mini` retain their full names.
    expect(getBrowserName("Microsoft Edge 120.0.2210.91")).toBe("Microsoft Edge");
    expect(getBrowserName("Opera Mini 55.0")).toBe("Opera Mini");
  });

  /**
   * Test case to verify behavior when no version number is detected in the string.
   */
  it("returns the original string when no version pattern is present", () => {
    // Assert: Verify that simple strings like `Safari` remain unchanged.
    expect(getBrowserName("Safari")).toBe("Safari");
    expect(getBrowserName("Brave")).toBe("Brave");
  });

  /**
   * Test case to verify that empty inputs do not cause errors.
   */
  it("handles empty strings gracefully", () => {
    // Assert: Ensure an empty string input returns an empty string output.
    expect(getBrowserName("")).toBe("");
  });

  /**
   * Test case to verify that trailing or leading whitespace is removed from the result.
   */
  it("trims whitespace from the result", () => {
    // Assert: Check if the function cleans up the resulting string after processing.
    expect(getBrowserName("Chrome 120.0 ")).toBe("Chrome");
  });
});

/**
 * Test suite for the `getCityProvince` utility function.
 */
describe("getCityProvince", () => {
  /**
   * Test case to verify that country names are removed from full location strings.
   */
  it("formats a full location string into city and province", () => {
    // Assert: Verify that only the first two segments of the comma-separated string are returned.
    expect(getCityProvince("Lucban, Quezon, Philippines")).toBe("Lucban, Quezon");
    expect(getCityProvince("Makati City, Metro Manila, Philippines")).toBe(
      "Makati City, Metro Manila"
    );
  });

  /**
   * Test case to verify that the placeholder string for unknown locations is preserved.
   */
  it("returns Unknown Location as is", () => {
    // Assert: Ensure the `Unknown Location` string is not modified by formatting logic.
    expect(getCityProvince("Unknown Location")).toBe("Unknown Location");
  });

  /**
   * Test case to verify behavior when the location string lacks enough segments to format.
   */
  it("returns the original string if it contains fewer than two parts", () => {
    // Assert: Check that single-word locations like `Philippines` are returned without change.
    expect(getCityProvince("Philippines")).toBe("Philippines");
    expect(getCityProvince("Quezon")).toBe("Quezon");
  });

  /**
   * Test case to verify behavior when a string contains exactly two location segments.
   */
  it("returns the full string if it consists of exactly two parts", () => {
    // Assert: Ensure that city and state pairs like `New York, NY` are not truncated.
    expect(getCityProvince("New York, NY")).toBe("New York, NY");
  });

  /**
   * Test case to verify that empty location strings are handled correctly.
   */
  it("handles empty location strings", () => {
    // Assert: Verify that an empty string input results in an empty string output.
    expect(getCityProvince("")).toBe("");
  });
});
