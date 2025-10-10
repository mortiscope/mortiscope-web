import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { updateEmail } from "@/features/account/actions/request-email-change";
import { useUpdateEmail } from "@/features/account/hooks/use-update-email";

// Mock the NextAuth sign-out function to verify redirection behavior.
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// Mock the server action responsible for processing email update requests.
vi.mock("@/features/account/actions/request-email-change", () => ({
  updateEmail: vi.fn(),
}));

// Mock the toast notification library to observe UI feedback during the update flow.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

// Creates a test wrapper component providing the necessary React Query context for mutation hooks.
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
 * Test suite for the `useUpdateEmail` custom hook.
 */
describe("useUpdateEmail", () => {
  // Clear mock history and initialize fake timers to control asynchronous delays before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  // Restore real timers after each test to prevent side effects in other test suites.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that the hook initializes with the correct mutation object and pending state.
   */
  it("initializes hook correctly", () => {
    // Arrange: Render the hook using the query client wrapper.
    const { result } = renderHook(() => useUpdateEmail(), { wrapper: createWrapper() });

    // Assert: Verify that the mutation function is defined and not currently executing.
    expect(result.current.updateEmail).toBeDefined();
    expect(result.current.updateEmail.isPending).toBe(false);
  });

  /**
   * Test case to verify the complete successful flow including notifications and delayed logout.
   */
  it("handles successful email update request", async () => {
    // Arrange: Mock the updateEmail action to return a success message.
    vi.mocked(updateEmail).mockResolvedValue({ success: "Verification email sent" });

    const { result } = renderHook(() => useUpdateEmail(), { wrapper: createWrapper() });

    const payload = {
      email: "new-email@example.com",
      currentPassword: "password123",
    };

    // Act: Execute the email update mutation with valid data.
    result.current.updateEmail.mutate(payload);

    // Assert: Check for success state and verify that both success and warning toasts were triggered.
    await waitFor(() => {
      expect(result.current.updateEmail.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith("Email changed, please verify your new email.", {
      className: "font-inter",
    });
    expect(toast.warning).toHaveBeenCalledWith("You will be logged out shortly.", {
      className: "font-inter",
    });

    // Act: Advance the virtual clock by 2 seconds to trigger the delayed logout logic.
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Assert: Verify that the user is signed out and redirected to the sign-in page.
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/signin" });
  });

  /**
   * Test case to verify error handling when the server returns a logic-level error (e.g., duplicate email).
   */
  it("handles logic failure (validation error from server)", async () => {
    // Arrange: Mock the updateEmail action to return a specific validation error.
    vi.mocked(updateEmail).mockResolvedValue({ error: "Email already in use" });

    const { result } = renderHook(() => useUpdateEmail(), { wrapper: createWrapper() });

    // Act: Trigger the mutation with an email that is already taken.
    result.current.updateEmail.mutate({
      email: "taken@example.com",
      currentPassword: "password123",
    });

    // Assert: Ensure the mutation completes and the specific error message is displayed via toast.
    await waitFor(() => {
      expect(result.current.updateEmail.isSuccess).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith("Email already in use", {
      className: "font-inter",
    });
    // Assert: Verify that the user is not signed out upon a failed update attempt.
    expect(signOut).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a default fallback error message is shown if the server error is empty.
   */
  it("handles logic failure with fallback error message", async () => {
    // Arrange: Mock the server action to return an empty error string.
    vi.mocked(updateEmail).mockResolvedValue({ error: "" });

    const { result } = renderHook(() => useUpdateEmail(), { wrapper: createWrapper() });

    // Act: Trigger the mutation.
    result.current.updateEmail.mutate({
      email: "invalid@example.com",
      currentPassword: "password123",
    });

    // Assert: Confirm that the default "Failed to update email." message is used in the toast.
    await waitFor(() => {
      expect(result.current.updateEmail.isSuccess).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to update email.", {
      className: "font-inter",
    });
  });

  /**
   * Test case to verify error handling when the server action throws an actual exception (e.g., network error).
   */
  it("handles unexpected exceptions during mutation", async () => {
    // Arrange: Mock the server action to reject with a network failure error.
    vi.mocked(updateEmail).mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useUpdateEmail(), { wrapper: createWrapper() });

    // Act: Trigger the mutation.
    result.current.updateEmail.mutate({
      email: "error@example.com",
      currentPassword: "password123",
    });

    // Assert: Verify that a generic unexpected error toast is displayed.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", {
        className: "font-inter",
      });
    });

    // Assert: Verify that the user remains signed in despite the network failure.
    expect(signOut).not.toHaveBeenCalled();
  });
});
