import { describe, expect, it } from "vitest";

import { escapeRegExp } from "@/features/dashboard/utils/highlight-text";

/**
 * Test suite for the utility function that escapes strings for use in regular expressions.
 */
describe("escapeRegExp", () => {
  /**
   * Test case to verify that alphanumeric strings remain unchanged.
   */
  it("returns the same string if no special characters are present", () => {
    // Assert: Verify that standard text "Hello World 123" is returned without modifications.
    expect(escapeRegExp("Hello World 123")).toBe("Hello World 123");
  });

  /**
   * Test case to verify the correct escaping of every reserved regular expression character.
   */
  it("escapes all regex special characters", () => {
    // Arrange: Define a string containing all major reserved characters.
    const specialChars = "\\.*+?^${}()|[]";
    const expected = "\\\\\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]";

    // Assert: Ensure each character in `specialChars` is prefixed with a backslash.
    expect(escapeRegExp(specialChars)).toBe(expected);
  });

  /**
   * Test case to verify that special characters are escaped correctly when embedded in prose.
   */
  it("escapes special characters within a sentence", () => {
    // Arrange: Define a sentence with various symbols like `(`, `)`, `?`, `[`, `]`, `+`, and `.`.
    const input = "Is this (real)? Or [just] fantasy + magic.";
    const expected = "Is this \\(real\\)\\? Or \\[just\\] fantasy \\+ magic\\.";

    // Assert: Verify the utility handles mixed content accurately.
    expect(escapeRegExp(input)).toBe(expected);
  });

  /**
   * Test case to verify that the escaping logic applies to every instance of a character.
   */
  it("escapes multiple occurrences of the same special character", () => {
    // Arrange: Define a string with repeated `+` and `.` characters.
    const input = "1+1=2 and 2+2=4...";
    const expected = "1\\+1=2 and 2\\+2=4\\.\\.\\.";

    // Assert: Ensure global replacement logic is functional.
    expect(escapeRegExp(input)).toBe(expected);
  });

  /**
   * Test case to ensure the function handles empty input gracefully.
   */
  it("handles empty strings", () => {
    // Assert: Verify that an empty string input returns an empty string output.
    expect(escapeRegExp("")).toBe("");
  });

  /**
   * Test case to verify the functional integrity of the escaped string within a `RegExp` constructor.
   */
  it("produces a string usable in RegExp constructor for literal matching", () => {
    // Arrange: Escape a string that contains characters usually used for capturing groups.
    const input = "(test)";
    const escaped = escapeRegExp(input);

    // Act: Create a new `RegExp` object using the escaped string.
    const regex = new RegExp(escaped);

    // Assert: Check that the regex matches the literal string but not the un-bracketed version.
    expect(regex.test("(test)")).toBe(true);
    expect(regex.test("test")).toBe(false);
  });
});
