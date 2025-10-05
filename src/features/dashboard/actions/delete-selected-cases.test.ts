import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";
import { deleteSelectedCases } from "@/features/dashboard/actions/delete-selected-cases";

// Mock the authentication module to control user session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock environment variables to ensure stable test values.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    UPSTASH_REDIS_REST_URL: "https://mock.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "mock-token",
  },
}));

// Mock the database client to intercept deletion queries.
vi.mock("@/db", () => ({
  db: {
    delete: vi.fn(),
  },
}));

// Mock the password verification action to simulate success or failure.
vi.mock("@/features/account/actions/verify-current-password");

// Mock Next.js cache utilities to track path revalidation calls.
vi.mock("next/cache");

type AuthMock = () => Promise<Session | null>;

/**
 * Test suite for the `deleteSelectedCases` server action.
 */
describe("deleteSelectedCases", () => {
  const mockUserId = "user-123";
  const mockCaseId1 = createId();
  const mockCaseId2 = createId();
  const validPassword = "password123";

  // Reset all mocks before each test to maintain test isolation and prevent state leakage.
  beforeEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Test case to verify that the action returns an error when the input payload is empty.
   */
  it("returns error for invalid input", async () => {
    // Act: Invoke the action with an empty array for `caseIds`.
    const result = await deleteSelectedCases({
      caseIds: [],
      currentPassword: validPassword,
    });

    // Assert: Verify that the correct error message is returned and authentication is not checked.
    expect(result).toEqual({ error: "Invalid input provided." });
    expect(auth).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns an error when no active session is found.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return a null session.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

    // Act: Invoke the action with valid case IDs.
    const result = await deleteSelectedCases({
      caseIds: [mockCaseId1],
      currentPassword: validPassword,
    });

    // Assert: Verify that an authentication error is returned.
    expect(result).toEqual({ error: "Authentication required. Please sign in." });
  });

  /**
   * Test case to verify that the action returns an error when the provided password is incorrect.
   */
  it("returns error if password verification fails", async () => {
    // Arrange: Mock a valid session but simulate a failed password check via `verifyCurrentPassword`.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ error: "Invalid password" });

    // Act: Invoke the action with an incorrect password.
    const result = await deleteSelectedCases({
      caseIds: [mockCaseId1],
      currentPassword: "wrong-password",
    });

    // Assert: Verify that a password error is returned and no database deletion is attempted.
    expect(result).toEqual({ error: "Invalid password." });
    expect(db.delete).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action handles scenarios where the database query affects zero rows.
   */
  it("returns error if no rows are deleted (permissions or not found)", async () => {
    // Arrange: Mock successful authentication and password verification.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });

    // Arrange: Mock the database response to return a `rowCount` of 0.
    const whereMock = vi.fn().mockResolvedValue({ rowCount: 0 });
    vi.mocked(db.delete).mockReturnValue({ where: whereMock } as unknown as ReturnType<
      typeof db.delete
    >);

    // Act: Invoke the deletion action.
    const result = await deleteSelectedCases({
      caseIds: [mockCaseId1],
      currentPassword: validPassword,
    });

    // Assert: Verify that the error regarding permissions or existence is returned.
    expect(result).toEqual({
      error: "No cases found or you do not have permission to delete them.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify successful deletion of a single case record.
   */
  it("successfully deletes a single case and revalidates", async () => {
    // Arrange: Setup authorized session and successful password verification.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });

    // Arrange: Mock the database to confirm exactly 1 row was deleted.
    const whereMock = vi.fn().mockResolvedValue({ rowCount: 1 });
    vi.mocked(db.delete).mockReturnValue({ where: whereMock } as unknown as ReturnType<
      typeof db.delete
    >);

    // Act: Invoke the action to delete `mockCaseId1`.
    const result = await deleteSelectedCases({
      caseIds: [mockCaseId1],
      currentPassword: validPassword,
    });

    // Assert: Verify success message and check if the dashboard path was revalidated.
    expect(result).toEqual({ success: "1 case successfully deleted." });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  /**
   * Test case to verify successful deletion of multiple case records in a single request.
   */
  it("successfully deletes multiple cases and revalidates", async () => {
    // Arrange: Setup authorized session and successful password verification.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });

    // Arrange: Mock the database to confirm 2 rows were deleted.
    const whereMock = vi.fn().mockResolvedValue({ rowCount: 2 });
    vi.mocked(db.delete).mockReturnValue({ where: whereMock } as unknown as ReturnType<
      typeof db.delete
    >);

    // Act: Invoke the action with multiple IDs in `caseIds`.
    const result = await deleteSelectedCases({
      caseIds: [mockCaseId1, mockCaseId2],
      currentPassword: validPassword,
    });

    // Assert: Verify that the result count matches the input and revalidation occurred.
    expect(result).toEqual({ success: "2 cases successfully deleted." });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  /**
   * Test case to verify that the action catches and logs unexpected database errors.
   */
  it("handles unexpected database errors gracefully", async () => {
    // Arrange: Setup authorized session and successful password verification.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });

    // Arrange: Mock the database to throw an error during the `where` execution.
    const whereMock = vi.fn().mockRejectedValue(new Error("DB Connection Failed"));
    vi.mocked(db.delete).mockReturnValue({ where: whereMock } as unknown as ReturnType<
      typeof db.delete
    >);

    // Arrange: Spy on `console.error` to confirm the error is logged.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Invoke the action.
    const result = await deleteSelectedCases({
      caseIds: [mockCaseId1],
      currentPassword: validPassword,
    });

    // Assert: Verify that a generic error message is returned and the error was logged to the console.
    expect(result).toEqual({ error: "An unexpected error occurred." });
    expect(consoleSpy).toHaveBeenCalled();
  });
});
