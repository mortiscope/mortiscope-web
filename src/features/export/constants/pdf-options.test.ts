import { FiFileText, FiLock, FiShield } from "react-icons/fi";
import { describe, expect, it } from "vitest";

import { defaultPdfPermissions, securityOptions } from "@/features/export/constants/pdf-options";

/**
 * Test suite for verifying PDF configuration constants and security options.
 */
describe("PDF Options Constants", () => {
  /**
   * Group of tests to verify the integrity of the security options array.
   */
  describe("securityOptions", () => {
    /**
     * Test case to verify that the correct number of security options are defined.
     */
    it("defines exactly three security levels", () => {
      // Assert: Verify that there are exactly three security options available.
      expect(securityOptions).toHaveLength(3);
    });

    /**
     * Test case to verify the properties of the Standard security option.
     */
    it("correctly configures the Standard option", () => {
      // Arrange: Find the 'standard' option within the array.
      const option = securityOptions.find((o) => o.value === "standard");

      // Assert: Verify the option exists and matches the expected configuration.
      expect(option).toBeDefined();
      expect(option).toEqual({
        value: "standard",
        label: "Standard",
        description: "A standard PDF anyone can open, edit, or print.",
        icon: FiFileText,
      });
    });

    /**
     * Test case to verify the properties of the View-Protected security option.
     */
    it("correctly configures the View-Protected option", () => {
      // Arrange: Find the 'view_protected' option within the array.
      const option = securityOptions.find((o) => o.value === "view_protected");

      // Assert: Verify the option exists and matches the expected configuration.
      expect(option).toBeDefined();
      expect(option).toEqual({
        value: "view_protected",
        label: "View-Protected",
        description: "Requires a password to open and view.",
        icon: FiLock,
      });
    });

    /**
     * Test case to verify the properties of the Permissions-Protected security option.
     */
    it("correctly configures the Permissions-Protected option", () => {
      // Arrange: Find the 'permissions_protected' option within the array.
      const option = securityOptions.find((o) => o.value === "permissions_protected");

      // Assert: Verify the option exists and matches the expected configuration.
      expect(option).toBeDefined();
      expect(option).toEqual({
        value: "permissions_protected",
        label: "Permissions-Protected",
        description: "Protects against editing, printing, or copying.",
        icon: FiShield,
      });
    });
  });

  /**
   * Group of tests to verify the default PDF permission settings.
   */
  describe("defaultPdfPermissions", () => {
    /**
     * Test case to ensure all permission flags default to a restrictive state.
     */
    it("initializes all permission flags to false (restrictive by default)", () => {
      // Arrange: Extract all keys from the permissions object.
      const keys = Object.keys(defaultPdfPermissions) as Array<keyof typeof defaultPdfPermissions>;

      // Assert: Ensure keys exist and iterate to verify each value is false.
      expect(keys.length).toBeGreaterThan(0);

      keys.forEach((key) => {
        expect(defaultPdfPermissions[key]).toBe(false);
      });
    });

    /**
     * Test case to verify the complete structure of the default permissions object.
     */
    it("matches the expected complete permissions structure", () => {
      // Assert: Check that the object strictly matches the expected permission map.
      expect(defaultPdfPermissions).toEqual({
        printing: false,
        copying: false,
        annotations: false,
        formFilling: false,
        assembly: false,
        extraction: false,
        pageRotation: false,
        degradedPrinting: false,
        screenReader: false,
        metadataModification: false,
      });
    });
  });
});
