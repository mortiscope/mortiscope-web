import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { env } from "@/lib/env";

/**
 * The symmetric encryption algorithm to be used. AES-256-GCM is chosen for its
 * strong security and built-in authentication, which protects against tampering.
 */
const ALGORITHM = "aes-256-gcm";

/**
 * Retrieves and decodes the 32-byte encryption key from environment variables.
 * It expects the key to be stored as a 64-character hexadecimal string.
 * @returns The 32-byte encryption key as a Buffer.
 * @throws An error if the `ENCRYPTION_KEY` environment variable is not set or has an invalid format.
 */
function getEncryptionKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, "hex");
}

/**
 * Encrypts a plaintext string using the AES-256-GCM algorithm.
 *
 * The process involves generating a unique Initialization Vector (IV) for each encryption.
 * The resulting output is a colon-delimited string containing the IV, the authentication tag,
 * and the encrypted ciphertext, all in hexadecimal format. This structure is essential for decryption.
 *
 * @param text The plaintext string to encrypt.
 * @returns The encrypted string in the format "iv:authTag:encryptedData".
 */
export function encrypt(text: string): string {
  // Retrieve the encryption key.
  const key = getEncryptionKey();
  // Generate a random, 16-byte Initialization Vector (IV).
  const iv = randomBytes(16);
  // Create a cipher instance with the algorithm, key, and IV.
  const cipher = createCipheriv(ALGORITHM, key, iv);

  // Encrypt the plaintext.
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get the authentication tag.
  const authTag = cipher.getAuthTag();

  // Combine the IV, auth tag, and encrypted data into a single string for storage or transmission.
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a string that was previously encrypted using the `encrypt` function.
 *
 * It parses the "iv:authTag:encryptedData" format, sets the authentication tag to verify
 * the ciphertext's integrity, and then decrypts the data. If decryption fails for any
 * reason, it logs the error and returns a redacted placeholder string for security.
 *
 * @param encryptedText The encrypted string in the "iv:authTag:encryptedData" format.
 * @returns The original plaintext string on success, or a redacted placeholder on failure.
 */
export function decrypt(encryptedText: string): string {
  try {
    // Retrieve the encryption key.
    const key = getEncryptionKey();
    // Split the encrypted text into its three essential parts.
    const parts = encryptedText.split(":");

    // Validate the format.
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(parts[0]!, "hex");
    const authTag = Buffer.from(parts[1]!, "hex");
    const encrypted = parts[2]!;

    // Create a decipher instance with the key and IV.
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    // Set the authentication tag.
    decipher.setAuthTag(authTag);

    // Decrypt the data.
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // On any failure, log the error and return a safe, redacted string to prevent leaking information.
    console.error("Decryption error:", error);
    return "•••.•••.•••.•••";
  }
}
