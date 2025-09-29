import { describe, expect, it } from "vitest";

import { getLightenedColor } from "@/features/annotation/utils/lightened-color";

/**
 * Test suite for the `getLightenedColor` utility.
 */
describe("getLightenedColor", () => {
  // Define a set of hexadecimal color constants used for annotation labels.
  const colors = {
    adult: "#14b8a6",
    pupa: "#f97316",
    instar_1: "#eab308",
    instar_2: "#84cc16",
    instar_3: "#22c55e",
    default: "#64748b",
  };

  /**
   * Test case to verify the mathematical lightening of the teal color used for the 'adult' label.
   */
  it("lightens the 'adult' (teal) color correctly", () => {
    // Act: Pass the teal hex code through the lightening function.
    const result = getLightenedColor(colors.adult);

    // Assert: Verify the resulting hex code matches the expected lightened teal value.
    expect(result).toBe("#19e6cf");
  });

  /**
   * Test case to verify the mathematical lightening of the orange color used for the 'pupa' label.
   */
  it("lightens the 'pupa' (orange) color correctly", () => {
    // Act: Pass the orange hex code through the lightening function.
    const result = getLightenedColor(colors.pupa);

    // Assert: Verify the resulting hex code matches the expected lightened orange value.
    expect(result).toBe("#ff8f1b");
  });

  /**
   * Test case to verify the mathematical lightening of the yellow color used for the 'instar_1' label.
   */
  it("lightens the 'instar_1' (yellow) color correctly", () => {
    // Act: Pass the yellow hex code through the lightening function.
    const result = getLightenedColor(colors.instar_1);

    // Assert: Verify the resulting hex code matches the expected lightened yellow value.
    expect(result).toBe("#ffdf0a");
  });

  /**
   * Test case to verify the mathematical lightening of the lime color used for the 'instar_2' label.
   */
  it("lightens the 'instar_2' (lime) color correctly", () => {
    // Act: Pass the lime hex code through the lightening function.
    const result = getLightenedColor(colors.instar_2);

    // Assert: Verify the resulting hex code matches the expected lightened lime value.
    expect(result).toBe("#a5ff1b");
  });

  /**
   * Test case to verify the mathematical lightening of the green color used for the 'instar_3' label.
   */
  it("lightens the 'instar_3' (green) color correctly", () => {
    // Act: Pass the green hex code through the lightening function.
    const result = getLightenedColor(colors.instar_3);

    // Assert: Verify the resulting hex code matches the expected lightened green value.
    expect(result).toBe("#2af675");
  });

  /**
   * Test case to verify the mathematical lightening of the slate color used for default states.
   */
  it("lightens the 'default' (slate) color correctly", () => {
    // Act: Pass the slate hex code through the lightening function.
    const result = getLightenedColor(colors.default);

    // Assert: Verify the resulting hex code matches the expected lightened slate value.
    expect(result).toBe("#7d91ad");
  });

  /**
   * Test case to ensure the function does not exceed maximum RGB values.
   */
  it("caps values at 255 (white stays white)", () => {
    // Arrange: Use pure white which already has maximum channel values.
    const result = getLightenedColor("#ffffff");

    // Assert: Check that the value remains at the white ceiling.
    expect(result).toBe("#ffffff");
  });

  /**
   * Test case to verify how the function handles absolute black.
   */
  it("handles standard black (stays black)", () => {
    // Arrange: Use pure black as the input.
    const result = getLightenedColor("#000000");

    // Assert: Ensure the function handles the zero-value channels without error.
    expect(result).toBe("#000000");
  });

  /**
   * Test case to verify string parsing flexibility for hex codes.
   */
  it("handles hex strings without the hash prefix", () => {
    // Arrange: Provide a hex string missing the leading `#` symbol.
    const result = getLightenedColor("64748b");

    // Assert: Verify the function correctly parses the string and prepends the hash in the result.
    expect(result).toBe("#7d91ad");
  });
});
