import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { updateProfile } from "@/features/account/actions/update-profile";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";
import { useUpdateProfile } from "@/features/account/hooks/use-update-profile";

// Mock the server action for updating user profile information.
vi.mock("@/features/account/actions/update-profile", () => ({ updateProfile: vi.fn() }));
// Mock the server action for verifying the user current password.
vi.mock("@/features/account/actions/verify-current-password", () => ({
  verifyCurrentPassword: vi.fn(),
}));

// Mock the toast notification system to verify UI feedback during profile operations.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Generates a test wrapper to provide the React Query context for mutation hooks.
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
 * Test suite for the `useUpdateProfile` custom hook.
 */
describe("useUpdateProfile", () => {
  // Clear all mock history before each test to ensure environmental isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the hook returns defined mutation objects upon initialization.
   */
  it("initializes hooks correctly", () => {
    // Arrange: Render the hook using the query client wrapper.
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

    // Assert: Verify that both verification and update mutations are exposed.
    expect(result.current.verifyPassword).toBeDefined();
    expect(result.current.updateProfile).toBeDefined();
  });

  /**
   * Test suite for the verifyPassword mutation logic within the profile hook.
   */
  describe("verifyPassword mutation", () => {
    /**
     * Test case to verify success feedback when password verification is confirmed by the server.
     */
    it("toasts success when verification succeeds", async () => {
      // Arrange: Mock the verification action to return a success response.
      vi.mocked(verifyCurrentPassword).mockResolvedValue({
        success: "Password verified",
      });

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

      // Act: Trigger the password verification mutation.
      result.current.verifyPassword.mutate({ currentPassword: "password123" });

      // Assert: Verify mutation success and the presence of a success toast.
      await waitFor(() => {
        expect(result.current.verifyPassword.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Password verified successfully.", {
        className: "font-inter",
      });
      expect(toast.error).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify error feedback when the verification logic fails due to an incorrect password.
     */
    it("toasts error when verification fails (logic failure)", async () => {
      // Arrange: Mock the verification action to return a specific logical error.
      vi.mocked(verifyCurrentPassword).mockResolvedValue({
        error: "Incorrect password",
      });

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

      // Act: Trigger the mutation with an invalid password.
      result.current.verifyPassword.mutate({ currentPassword: "wrongpassword" });

      // Assert: Verify the mutation completes and triggers the specific error toast.
      await waitFor(() => {
        expect(result.current.verifyPassword.isSuccess).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Incorrect password", {
        className: "font-inter",
      });
      expect(toast.success).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that a default fallback error message is shown when the server error is empty.
     */
    it("toasts error when verification fails (fallback error message)", async () => {
      // Arrange: Mock the verification action to return an empty error string.
      vi.mocked(verifyCurrentPassword).mockResolvedValue({
        error: "",
      });

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

      // Act: Trigger the verification mutation.
      result.current.verifyPassword.mutate({ currentPassword: "wrongpassword" });

      // Assert: Confirm that the default "Failed to verify password." message is used.
      await waitFor(() => {
        expect(result.current.verifyPassword.isSuccess).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to verify password.", {
        className: "font-inter",
      });
    });

    /**
     * Test case to verify feedback when the verification process throws an actual code exception.
     */
    it("toasts unexpected error when mutation throws", async () => {
      // Arrange: Mock the server action to reject with a network exception.
      vi.mocked(verifyCurrentPassword).mockRejectedValue(new Error("Network Error"));

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

      // Act: Trigger the password verification mutation.
      result.current.verifyPassword.mutate({ currentPassword: "password123" });

      // Assert: Verify that a generic unexpected error notification is displayed.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", {
          className: "font-inter",
        });
      });
    });
  });

  /**
   * Test suite for the updateProfile mutation logic.
   */
  describe("updateProfile mutation", () => {
    /**
     * Test case to verify that the update action is called with the correct user data.
     */
    it("calls updateProfile action successfully", async () => {
      // Arrange: Mock the profile update action to return a success state.
      vi.mocked(updateProfile).mockResolvedValue({ success: "Profile updated" });

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

      const payload = {
        name: "New Name",
      };

      // Act: Trigger the profile update mutation.
      result.current.updateProfile.mutate(payload);

      // Assert: Verify the mutation is successful and the server action received the correct payload.
      await waitFor(() => {
        expect(result.current.updateProfile.isSuccess).toBe(true);
      });

      expect(updateProfile).toHaveBeenCalledWith(payload);
    });

    /**
     * Test case to verify error handling when the profile update action encounters an exception.
     */
    it("toasts unexpected error when updateProfile throws", async () => {
      // Arrange: Mock the server action to reject with a database error.
      vi.mocked(updateProfile).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

      // Act: Trigger the profile update mutation.
      result.current.updateProfile.mutate({
        name: "New Name",
      });

      // Assert: Verify that the standard unexpected error message is displayed to the user.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", {
          className: "font-inter",
        });
      });
    });
  });
});
