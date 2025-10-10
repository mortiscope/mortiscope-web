import { act } from "@testing-library/react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import { revokeAllSessions } from "@/features/account/actions/revoke-all-sessions";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";
import { useSignOutAllSessions } from "@/features/account/hooks/use-sign-out-all-sessions";

// Mock the NextAuth sign out function to verify client-side session termination.
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// Mock the server action responsible for revoking multiple sessions in the database.
vi.mock("@/features/account/actions/revoke-all-sessions", () => ({
  revokeAllSessions: vi.fn(),
}));

// Mock the server action used to verify the user's password before sensitive operations.
vi.mock("@/features/account/actions/verify-current-password", () => ({
  verifyCurrentPassword: vi.fn(),
}));

// Mock the toast notification system to verify success and error messaging.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const originalLocation = window.location;

/**
 * Test suite for the `useSignOutAllSessions` custom hook.
 */
describe("useSignOutAllSessions", () => {
  const mockUserId = "user-123";
  const mockCurrentToken = "token-abc";
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  // Setup the testing environment and mock global objects before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  // Restore the real environment and original window location after each test.
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  /**
   * Test case to verify that the hook initializes with correct default form values and states.
   */
  it("initializes with default values", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Assert: Verify initial loading state, default sign-out option, and form validity.
    expect(result.current.isSigningOut).toBe(false);
    expect(result.current.form.getValues("signOutOption")).toBe("exclude_current");
    expect(result.current.isFormValid).toBe(false);
  });

  /**
   * Test case to verify the successful revocation of other sessions while keeping the current one active.
   */
  it("handles exclude_current option correctly (success)", async () => {
    // Arrange: Mock successful password verification and session revocation.
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });
    vi.mocked(revokeAllSessions).mockResolvedValue({ success: true, revokedCount: 3 });

    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Populate the form with valid data and the `exclude_current` option.
    act(() => {
      result.current.form.setValue("password", "password123");
      result.current.form.setValue("signOutOption", "exclude_current");
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    // Assert: Verify that both server actions were called and UI callbacks triggered.
    expect(verifyCurrentPassword).toHaveBeenCalledWith({ currentPassword: "password123" });

    expect(revokeAllSessions).toHaveBeenCalledWith(mockUserId, mockCurrentToken);

    expect(toast.success).toHaveBeenCalledWith("3 sessions revoked successfully.", {
      className: "font-inter",
    });
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalled();

    // Verify that the user was not signed out of the current client session.
    expect(signOut).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the revocation of all sessions followed by a client-side sign-out.
   */
  it("handles include_current option correctly (success + client signout)", async () => {
    // Arrange: Mock successful responses for password and revocation.
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });
    vi.mocked(revokeAllSessions).mockResolvedValue({ success: true, revokedCount: 4 });

    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Set the form to `include_current`.
    act(() => {
      result.current.form.setValue("password", "password123");
      result.current.form.setValue("signOutOption", "include_current");
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    // Assert: Verify server actions. The current token should not be passed to `revokeAllSessions`.
    expect(verifyCurrentPassword).toHaveBeenCalledWith({ currentPassword: "password123" });

    expect(revokeAllSessions).toHaveBeenCalledWith(mockUserId, undefined);

    expect(toast.success).toHaveBeenCalledWith("4 sessions revoked.", {
      className: "font-inter",
    });
    expect(mockOnClose).toHaveBeenCalled();

    // Verify that sign-out is deferred.
    expect(signOut).not.toHaveBeenCalled();

    // Act: Advance timers to trigger the post-revocation sign-out logic.
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    // Assert: Verify client-side sign-out and redirection to home.
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(window.location.href).toBe("/");
  });

  /**
   * Test case to verify that the flow is interrupted if the password verification fails.
   */
  it("stops if password verification fails", async () => {
    // Arrange: Mock an incorrect password response.
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ error: "Wrong password" });

    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Submit the form with the wrong password.
    act(() => {
      result.current.form.setValue("password", "wrong");
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    // Assert: Verify that revocation was never attempted and the error was displayed.
    expect(verifyCurrentPassword).toHaveBeenCalled();
    expect(revokeAllSessions).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Wrong password", {
      className: "font-inter",
    });
    expect(result.current.isSigningOut).toBe(false);
  });

  /**
   * Test case to verify handling of server-side errors during the revocation process.
   */
  it("handles revocation failure", async () => {
    // Arrange: Mock successful password check but failed revocation.
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });
    vi.mocked(revokeAllSessions).mockResolvedValue({ success: false, error: "DB Error" });

    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Submit the form.
    act(() => {
      result.current.form.setValue("password", "password123");
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    // Assert: Verify the revocation error was caught and notified.
    expect(revokeAllSessions).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("DB Error", {
      className: "font-inter",
    });
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that unexpected network or code exceptions are handled gracefully.
   */
  it("handles unexpected exceptions", async () => {
    // Arrange: Force an exception during password verification.
    vi.mocked(verifyCurrentPassword).mockRejectedValue(new Error("Network fail"));

    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Submit the form.
    act(() => {
      result.current.form.setValue("password", "password123");
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    // Assert: Verify fallback generic error messaging.
    expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", {
      className: "font-inter",
    });
    expect(result.current.isSigningOut).toBe(false);
  });

  /**
   * Test case to verify that a default error message is used when the server provides an empty error string for password checks.
   */
  it("toasts default error when password verification fails without message", async () => {
    // Arrange: Mock a failure with no message.
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ error: "" });

    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Submit form.
    act(() => {
      result.current.form.setValue("password", "wrong");
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    // Assert: Verify default error message.
    expect(toast.error).toHaveBeenCalledWith("Password verification failed.", {
      className: "font-inter",
    });
  });

  /**
   * Test case to verify that a default error message is used when the server provides an empty error string for revocation.
   */
  it("toasts default error when revocation fails without message", async () => {
    // Arrange: Successful password but failed revocation with no message.
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });
    vi.mocked(revokeAllSessions).mockResolvedValue({ success: false, error: "" });

    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Submit form.
    act(() => {
      result.current.form.setValue("password", "password123");
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    // Assert: Verify generic revocation error message.
    expect(toast.error).toHaveBeenCalledWith("Failed to revoke sessions.", {
      className: "font-inter",
    });
  });

  /**
   * Test case to verify that the success message correctly handles singular session counts.
   */
  it("handles singular session revocation message correctly", async () => {
    // Arrange: Mock revocation of exactly one session.
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });
    vi.mocked(revokeAllSessions).mockResolvedValue({ success: true, revokedCount: 1 });

    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Select the exclusion option and submit.
    act(() => {
      result.current.form.setValue("password", "password123");
      result.current.form.setValue("signOutOption", "exclude_current");
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    // Assert: Verify that the success message is grammatically singular.
    expect(toast.success).toHaveBeenCalledWith("1 session revoked successfully.", {
      className: "font-inter",
    });
  });

  /**
   * Test case to verify that the success message handles zero sessions correctly.
   */
  it("handles zero/undefined revoked count", async () => {
    // Arrange: Mock revocation where 0 sessions were found.
    vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });
    vi.mocked(revokeAllSessions).mockResolvedValue({ success: true, revokedCount: 0 });

    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Submit form.
    act(() => {
      result.current.form.setValue("password", "password123");
      result.current.form.setValue("signOutOption", "exclude_current");
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    // Assert: Verify the count is reflected in the message.
    expect(toast.success).toHaveBeenCalledWith("0 sessions revoked successfully.", {
      className: "font-inter",
    });
  });

  /**
   * Test case to verify that the `resetForm` method clears both form data and hook state.
   */
  it("resetForm clears values and state", () => {
    // Arrange: Render hook.
    const { result } = renderHook(() =>
      useSignOutAllSessions(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Set a value and then invoke the reset method.
    act(() => {
      result.current.form.setValue("password", "somepassword");
      result.current.resetForm();
    });

    // Assert: Verify that the form field is empty and loading state is false.
    expect(result.current.form.getValues("password")).toBe("");
    expect(result.current.isSigningOut).toBe(false);
  });
});
