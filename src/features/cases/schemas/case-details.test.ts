import { describe, expect, it } from "vitest";

import { caseDetailsSchema } from "@/features/cases/schemas/case-details";

/**
 * Test suite for the `caseDetailsSchema` Zod schema.
 */
describe("caseDetailsSchema", () => {
  // Arrange: Define a base object with valid data that passes all initial validation rules.
  const validBaseData = {
    caseName: "Valid Case Name 123",
    temperature: { value: 25, unit: "C" as const },
    location: {
      region: { code: "R1", name: "Region 1" },
      province: { code: "P1", name: "Province 1" },
      city: { code: "C1", name: "City 1" },
      barangay: { code: "B1", name: "Barangay 1" },
    },
    caseDate: new Date(),
    notes: "Some notes",
  };

  /**
   * Test case to ensure the schema successfully parses input when all data is valid.
   */
  it("validates successfully with correct data", () => {
    // Act: Parse the valid base data object.
    const result = caseDetailsSchema.safeParse(validBaseData);
    // Assert: Verify that the parsing was successful.
    expect(result.success).toBe(true);
    // Assert: Ensure transformation (if any) did not unintentionally alter required fields.
    if (result.success) {
      expect(result.data.caseName).toBe(validBaseData.caseName);
      expect(result.data.location.province).not.toBeNull();
    }
  });

  /**
   * Test suite for validation rules specific to the `caseName` field.
   */
  describe("caseName", () => {
    /**
     * Test case to ensure validation fails if the `caseName` is shorter than the minimum allowed length.
     */
    it("fails if case name is too short (< 8 chars)", () => {
      // Act: Parse data with a short case name.
      const result = caseDetailsSchema.safeParse({
        ...validBaseData,
        caseName: "Short",
      });
      // Assert: Verify that the parsing failed.
      expect(result.success).toBe(false);
      // Assert: Check for the specific minimum length error message.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Case name must be at least 8 characters.");
      }
    });

    /**
     * Test case to ensure validation fails if the `caseName` exceeds the maximum allowed length.
     */
    it("fails if case name is too long (> 256 chars)", () => {
      // Act: Parse data with a case name exceeding 256 characters.
      const result = caseDetailsSchema.safeParse({
        ...validBaseData,
        caseName: "a".repeat(257),
      });
      // Assert: Verify that the parsing failed.
      expect(result.success).toBe(false);
      // Assert: Check for the specific maximum length error message.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Case name cannot exceed 256 characters.");
      }
    });
  });

  /**
   * Test suite for validation and coercion rules specific to the `temperature` field.
   */
  describe("temperature", () => {
    /**
     * Test case to verify the valid range for temperature values in Celsius.
     */
    it("validates Celsius range (-50 to 60)", () => {
      // Assert: Check that minimum boundary (-50°C) is successful.
      expect(
        caseDetailsSchema.safeParse({ ...validBaseData, temperature: { value: -50, unit: "C" } })
          .success
      ).toBe(true);
      // Assert: Check that maximum boundary (60°C) is successful.
      expect(
        caseDetailsSchema.safeParse({ ...validBaseData, temperature: { value: 60, unit: "C" } })
          .success
      ).toBe(true);

      // Act: Test a value below the minimum range.
      const tooLow = caseDetailsSchema.safeParse({
        ...validBaseData,
        temperature: { value: -51, unit: "C" },
      });
      // Assert: Verify that parsing failed.
      expect(tooLow.success).toBe(false);
      // Assert: Check for the specific range error message.
      if (!tooLow.success)
        expect(tooLow.error.issues[0].message).toBe("Temperature must be within valid range.");

      // Act: Test a value above the maximum range.
      const tooHigh = caseDetailsSchema.safeParse({
        ...validBaseData,
        temperature: { value: 61, unit: "C" },
      });
      // Assert: Verify that parsing failed.
      expect(tooHigh.success).toBe(false);
    });

    /**
     * Test case to verify the valid range for temperature values in Fahrenheit.
     */
    it("validates Fahrenheit range (-58 to 140)", () => {
      // Assert: Check that minimum boundary (-58°F) is successful.
      expect(
        caseDetailsSchema.safeParse({ ...validBaseData, temperature: { value: -58, unit: "F" } })
          .success
      ).toBe(true);
      // Assert: Check that maximum boundary (140°F) is successful.
      expect(
        caseDetailsSchema.safeParse({ ...validBaseData, temperature: { value: 140, unit: "F" } })
          .success
      ).toBe(true);

      // Act: Test a value below the minimum range.
      const tooLow = caseDetailsSchema.safeParse({
        ...validBaseData,
        temperature: { value: -59, unit: "F" },
      });
      // Assert: Verify that parsing failed.
      expect(tooLow.success).toBe(false);

      // Act: Test a value above the maximum range.
      const tooHigh = caseDetailsSchema.safeParse({
        ...validBaseData,
        temperature: { value: 141, unit: "F" },
      });
      // Assert: Verify that parsing failed.
      expect(tooHigh.success).toBe(false);
    });

    /**
     * Test case to ensure string input for temperature value is successfully coerced to a number.
     */
    it("handles string coercion for temperature value", () => {
      // Act: Parse data where `value` is a string "25".
      const result = caseDetailsSchema.safeParse({
        ...validBaseData,
        temperature: { value: "25", unit: "C" },
      });
      // Assert: Verify that the parsing was successful.
      expect(result.success).toBe(true);
      // Assert: Verify that the output value is the coerced number 25.
      if (result.success) {
        expect(result.data.temperature.value).toBe(25);
      }
    });

    /**
     * Test case to ensure validation fails if the temperature value is missing or an empty string.
     */
    it("fails if temperature value is missing/empty string", () => {
      // Act: Parse data where `value` is an empty string.
      const result = caseDetailsSchema.safeParse({
        ...validBaseData,
        temperature: { value: "", unit: "C" },
      });
      // Assert: Verify that the parsing failed.
      expect(result.success).toBe(false);
      // Assert: Check for the required field error message.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Temperature is required.");
      }
    });

    /**
     * Test case to ensure zero is accepted as a valid temperature value.
     */
    it("handles zero temperature correctly", () => {
      // Act: Parse data with a value of 0.
      const result = caseDetailsSchema.safeParse({
        ...validBaseData,
        temperature: { value: 0, unit: "C" },
      });
      // Assert: Verify that the parsing was successful.
      expect(result.success).toBe(true);
      // Assert: Verify that the parsed value is 0.
      if (result.success) {
        expect(result.data.temperature.value).toBe(0);
      }
    });
  });

  /**
   * Test suite for optional fields like `notes`.
   */
  describe("notes", () => {
    /**
     * Test case to ensure validation succeeds when the optional `notes` field is entirely missing from the input.
     */
    it("validates successfully when notes are missing", () => {
      // Arrange: Destructure the valid base data to remove the `notes` field.
      const { notes: _notes, ...dataWithoutNotes } = validBaseData;
      void _notes;
      // Act: Parse the data without the `notes` field.
      const result = caseDetailsSchema.safeParse(dataWithoutNotes);
      // Assert: Verify that the parsing was successful.
      expect(result.success).toBe(true);
      // Assert: Verify that the parsed data does not contain a `notes` property.
      if (result.success) {
        expect(result.data.notes).toBeUndefined();
      }
    });
  });

  /**
   * Test suite for validation rules specific to the `location` object and its nested fields.
   */
  describe("location transformation", () => {
    /**
     * Test case to ensure validation fails if the nested `province` field is missing or null.
     */
    it("fails if province is missing/null", () => {
      // Act: Parse data with the `province` field set to null.
      const result = caseDetailsSchema.safeParse({
        ...validBaseData,
        location: {
          ...validBaseData.location,
          province: null,
        },
      });

      // Assert: Verify that the parsing failed.
      expect(result.success).toBe(false);
      // Assert: Check for the specific required field error message and path.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Province is required.");
        expect(result.error.issues[0].path).toEqual(["location", "province"]);
      }
    });

    /**
     * Test case to ensure validation fails if the nested `city` field is missing or null.
     */
    it("fails if city is missing/null", () => {
      // Act: Parse data with the `city` field set to null.
      const result = caseDetailsSchema.safeParse({
        ...validBaseData,
        location: {
          ...validBaseData.location,
          city: null,
        },
      });

      // Assert: Verify that the parsing failed.
      expect(result.success).toBe(false);
      // Assert: Check for the specific required field error message and path.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("City/Municipality is required.");
        expect(result.error.issues[0].path).toEqual(["location", "city"]);
      }
    });

    /**
     * Test case to ensure validation fails if the nested `barangay` field is missing or null.
     */
    it("fails if barangay is missing/null", () => {
      // Act: Parse data with the `barangay` field set to null.
      const result = caseDetailsSchema.safeParse({
        ...validBaseData,
        location: {
          ...validBaseData.location,
          barangay: null,
        },
      });

      // Assert: Verify that the parsing failed.
      expect(result.success).toBe(false);
      // Assert: Check for the specific required field error message and path.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Barangay is required.");
        expect(result.error.issues[0].path).toEqual(["location", "barangay"]);
      }
    });
  });

  /**
   * Test suite for validation rules specific to the `caseDate` field.
   */
  describe("caseDate", () => {
    /**
     * Test case to ensure validation fails if `caseDate` is not a valid `Date` object.
     */
    it("fails if caseDate is not a Date object", () => {
      // Act: Parse data where `caseDate` is a string.
      const result = caseDetailsSchema.safeParse({
        ...validBaseData,
        caseDate: "not-a-date",
      });
      // Assert: Verify that the parsing failed due to incorrect type.
      expect(result.success).toBe(false);
    });
  });
});
