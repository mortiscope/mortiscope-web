/**
 * Helper function to escape special regex characters in a string.
 * This ensures that user input can be safely used in a RegExp constructor
 * without causing syntax errors or unintended pattern matching.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in RegExp
 */
export const escapeRegExp = (str: string): string => {
  const specialChars = ["\\", ".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]"];
  let escaped = str;
  for (const char of specialChars) {
    escaped = escaped.split(char).join("\\" + char);
  }
  return escaped;
};
