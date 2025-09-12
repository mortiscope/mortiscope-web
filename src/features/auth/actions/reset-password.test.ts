import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { resetPassword } from "@/features/auth/actions/reset-password";
import { getForgotPasswordTokenByToken } from "@/features/auth/tokens/forgot-password-token";
import { sendPasswordUpdatedEmail } from "@/lib/mail";

// Define hoisted mocks for database operations to be used in module mocking.
const dbMocks = vi.hoisted(() => {
  const where = vi.fn();
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const deleteFn = vi.fn(() => ({ where }));

  return {
    update,
    set,
    where,
    deleteFn,
  };
});

// Mock bcryptjs for password hashing.
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

// Mock user data retrieval function.
vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

// Mock token retrieval function.
vi.mock("@/features/auth/tokens/forgot-password-token", () => ({
  getForgotPasswordTokenByToken: vi.fn(),
}));

// Mock email sending service.
vi.mock("@/lib/mail", () => ({
  sendPasswordUpdatedEmail: vi.fn(),
}));

// Mock database instance with hoisted mock functions.
vi.mock("@/db", () => ({
  db: {
    update: dbMocks.update,
    delete: dbMocks.deleteFn,
  },
}));

/**
 * Test suite for the resetPassword server action.
 */
describe("resetPassword Server Action", () => {
  const validTokenStr = "valid-token";
  const validEmail = "mortiscope@example.com";
  const validFormData = {
    newPassword: "NewPassword123!",
    confirmNewPassword: "NewPassword123!",
  };

  // Set up default mock behaviors before each test.
  beforeEach(() => {
    vi.mocked(getForgotPasswordTokenByToken).mockResolvedValue({
      identifier: validEmail,
      token: validTokenStr,
      expires: new Date(Date.now() + 3600000),
    });

    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: validEmail,
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-new-password" as never);
  });

  // Clear all mocks after each test to ensure isolation.
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action returns an error if the token is missing.
   */
  it("returns error if token is missing", async () => {
    // Act: Call the action with a null token.
    const result = await resetPassword(validFormData, null);

    // Assert: Verify the error message and ensure token retrieval was not called.
    expect(result).toEqual({ error: "Missing password reset token." });
    expect(getForgotPasswordTokenByToken).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns an error if the passwords do not match.
   */
  it("returns error if passwords do not match", async () => {
    // Arrange: Create form data with mismatched passwords.
    const invalidData = { ...validFormData, confirmNewPassword: "Mismatch!" };

    // Act: Call the action with invalid data.
    const result = await resetPassword(invalidData, validTokenStr);

    // Assert: Verify the validation error and ensure no database update occurred.
    expect(result).toEqual({ error: "Invalid password. Check the requirements and try again." });
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns an error if the token does not exist.
   */
  it("returns error if token does not exist in database", async () => {
    // Arrange: Mock the token retrieval to return null.
    vi.mocked(getForgotPasswordTokenByToken).mockResolvedValue(null);

    // Act: Call the action with a valid token string.
    const result = await resetPassword(validFormData, validTokenStr);

    // Assert: Verify the invalid token error.
    expect(result).toEqual({ error: "Invalid token provided." });
  });

  /**
   * Test case to verify that the action returns an error and deletes the token if it has expired.
   */
  it("returns error and deletes token if it has expired", async () => {
    // Arrange: Mock the token retrieval to return an expired token.
    vi.mocked(getForgotPasswordTokenByToken).mockResolvedValue({
      identifier: validEmail,
      token: validTokenStr,
      expires: new Date(Date.now() - 3600000),
    });

    // Act: Call the action with the expired token.
    const result = await resetPassword(validFormData, validTokenStr);

    // Assert: Verify expiration error, confirm token deletion, and ensure no update occurred.
    expect(result).toEqual({ error: "Your reset link has expired." });
    expect(db.delete).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns an error if the associated user is not found.
   */
  it("returns error if user associated with token does not exist", async () => {
    // Arrange: Mock the user retrieval to return null.
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    // Act: Call the action with valid data.
    const result = await resetPassword(validFormData, validTokenStr);

    // Assert: Verify the user not found error and ensure no database update occurred.
    expect(result).toEqual({ error: "No user found for this reset link." });
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the password is updated, token deleted, and email sent on success.
   */
  it("updates password, deletes token, and sends email on success", async () => {
    // Act: Call the action with valid data and token.
    const result = await resetPassword(validFormData, validTokenStr);

    // Assert: Verify password hashing, database update, token deletion, and email sending.
    expect(bcrypt.hash).toHaveBeenCalledWith("NewPassword123!", 10);

    expect(db.update).toHaveBeenCalled();
    expect(dbMocks.set).toHaveBeenCalledWith({
      password: "hashed-new-password",
      updatedAt: expect.any(Date),
    });

    expect(db.delete).toHaveBeenCalled();

    expect(sendPasswordUpdatedEmail).toHaveBeenCalledWith(validEmail);

    expect(result).toEqual({ success: "Your password has been successfully updated!" });
  });

  /**
   * Test case to verify that unexpected errors are handled gracefully.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Mock the database update to throw an error and suppress console error.
    dbMocks.set.mockImplementation(() => {
      throw new Error("DB Error");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Call the action and await the result.
    const result = await resetPassword(validFormData, validTokenStr);

    // Assert: Verify the generic error message and restore the console spy.
    expect(result).toEqual({ error: "An unexpected error occurred. Please try again later." });

    consoleSpy.mockRestore();
  });
});
