import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { updatePassword } from "@/features/account/actions/change-password";
import { useUpdatePassword } from "@/features/account/hooks/use-update-password";

// Mock the NextAuth sign-out functionality to verify session termination behavior.
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// Mock the server action responsible for the password update logic.
vi.mock("@/features/account/actions/change-password", () => ({
  updatePassword: vi.fn(),
}));

// Mock the toast notification system to verify user feedback messages.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

// Creates a test wrapper that provides a `QueryClientProvider` for testing TanStack Query hooks.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

/**
 * Test suite for the `useUpdatePassword` custom hook.
 */
describe("useUpdatePassword", () => {
  // Clear mock history and initialize fake timers to control the delayed logout logic before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  // Restore real timers after each test to ensure environmental clean-up.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that the hook initializes with a defined mutation and an idle state.
   */
  it("initializes hook correctly", () => {
    // Arrange: Render the hook within the query provider wrapper.
    const { result } = renderHook(() => useUpdatePassword(), { wrapper: createWrapper() });

    // Assert: Check that the `updatePassword` mutation is exposed and not currently pending.
    expect(result.current.updatePassword).toBeDefined();
    expect(result.current.updatePassword.isPending).toBe(false);
  });

  /**
   * Test case to verify the successful password update flow, including notifications and automatic logout.
   */
  it("handles successful password update", async () => {
    // Arrange: Mock a successful response from the password update action.
    vi.mocked(updatePassword).mockResolvedValue({ success: "Password updated" });

    const { result } = renderHook(() => useUpdatePassword(), { wrapper: createWrapper() });

    const payload = {
      currentPassword: "oldPass",
      newPassword: "newPass",
      repeatPassword: "newPass",
    };

    // Act: Trigger the password update mutation.
    result.current.updatePassword.mutate(payload);

    // Assert: Verify that the mutation reached a success state and triggered the correct toasts.
    await waitFor(() => {
      expect(result.current.updatePassword.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith("Password changed successfully.", {
      className: "font-inter",
    });
    expect(toast.warning).toHaveBeenCalledWith("You will be logged out shortly.", {
      className: "font-inter",
    });

    // Act: Advance time by 2 seconds to simulate the timeout before logout.
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Assert: Verify that the `signOut` function was called with the sign-in redirect path.
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/signin" });
  });

  /**
   * Test case to verify error handling when the server returns a specific validation error message.
   */
  it("handles logic failure (validation error from server)", async () => {
    // Arrange: Mock an error response indicating an incorrect current password.
    vi.mocked(updatePassword).mockResolvedValue({ error: "Incorrect current password" });

    const { result } = renderHook(() => useUpdatePassword(), { wrapper: createWrapper() });

    // Act: Trigger the mutation with invalid credentials.
    result.current.updatePassword.mutate({
      currentPassword: "wrong",
      newPassword: "new",
      repeatPassword: "new",
    });

    // Assert: Verify that the mutation completes and displays the returned error via toast.
    await waitFor(() => {
      expect(result.current.updatePassword.isSuccess).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith("Incorrect current password", {
      className: "font-inter",
    });
    // Assert: Ensure `signOut` is not called when the update fails.
    expect(signOut).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a fallback error message is used when the server returns an empty error string.
   */
  it("handles logic failure with fallback error message", async () => {
    // Arrange: Mock an empty error response from the server action.
    vi.mocked(updatePassword).mockResolvedValue({ error: "" });

    const { result } = renderHook(() => useUpdatePassword(), { wrapper: createWrapper() });

    // Act: Trigger the mutation.
    result.current.updatePassword.mutate({
      currentPassword: "wrong",
      newPassword: "new",
      repeatPassword: "new",
    });

    // Assert: Verify that the default fallback error message is displayed in the toast.
    await waitFor(() => {
      expect(result.current.updatePassword.isSuccess).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to update password.", {
      className: "font-inter",
    });
  });

  /**
   * Test case to verify feedback when a low-level exception, such as a network failure, occurs.
   */
  it("handles unexpected exceptions during mutation", async () => {
    // Arrange: Mock the update action to throw an actual `Error` object.
    vi.mocked(updatePassword).mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useUpdatePassword(), { wrapper: createWrapper() });

    // Act: Trigger the mutation.
    result.current.updatePassword.mutate({
      currentPassword: "old",
      newPassword: "new",
      repeatPassword: "new",
    });

    // Assert: Verify that a generic unexpected error toast is displayed.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", {
        className: "font-inter",
      });
    });

    // Assert: Ensure no logout redirection happens during a network failure.
    expect(signOut).not.toHaveBeenCalled();
  });
});
