import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

/**
 * Generates a set of recovery codes for two-factor authentication backup.
 * Each code is 8 characters long and contains only uppercase letters and numbers.
 *
 * @param count - Number of recovery codes to generate (default: 16)
 * @returns Array of plain text recovery codes
 */
export function generateRecoveryCodes(count: number = 16): string[] {
  const codes: string[] = [];
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let i = 0; i < count; i++) {
    let code = "";
    const randomBytesArray = randomBytes(8);

    for (let j = 0; j < 8; j++) {
      code += chars[randomBytesArray[j] % chars.length];
    }

    codes.push(code);
  }

  return codes;
}

/**
 * Hashes a recovery code for secure storage in the database.
 *
 * @param code - Plain text recovery code
 * @returns Hashed recovery code
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(code.toUpperCase(), saltRounds);
}

/**
 * Verifies a recovery code against its hash.
 *
 * @param code - Plain text recovery code to verify
 * @param hash - Hashed recovery code from database
 * @returns True if the code matches the hash
 */
export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code.toUpperCase(), hash);
}

/**
 * Formats recovery codes for display to users.
 * Adds dashes for better readability (e.g., "ABCD-EFGH").
 *
 * @param codes - Array of recovery codes
 * @returns Array of formatted recovery codes
 */
export function formatRecoveryCodesForDisplay(codes: string[]): string[] {
  return codes.map((code) => `${code.slice(0, 4)}-${code.slice(4)}`);
}
