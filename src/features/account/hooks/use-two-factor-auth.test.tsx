import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { disableTwoFactor } from "@/features/account/actions/disable-two-factor";
import { getRecoveryCodes } from "@/features/account/actions/get-recovery-codes";
import { regenerateRecoveryCodes } from "@/features/account/actions/regenerate-recovery-codes";
import { setupTwoFactor } from "@/features/account/actions/setup-two-factor";
import { verifyTwoFactor } from "@/features/account/actions/verify-two-factor";
import { useTwoFactorAuth } from "@/features/account/hooks/use-two-factor-auth";

// Mock the server action for disabling two-factor authentication.
vi.mock("@/features/account/actions/disable-two-factor", () => ({ disableTwoFactor: vi.fn() }));
// Mock the server action for fetching account recovery codes.
vi.mock("@/features/account/actions/get-recovery-codes", () => ({ getRecoveryCodes: vi.fn() }));
// Mock the server action for regenerating account recovery codes.
vi.mock("@/features/account/actions/regenerate-recovery-codes", () => ({
  regenerateRecoveryCodes: vi.fn(),
}));
// Mock the server action for the initial setup of two-factor authentication.
vi.mock("@/features/account/actions/setup-two-factor", () => ({ setupTwoFactor: vi.fn() }));
// Mock the server action for verifying a two-factor authentication token.
vi.mock("@/features/account/actions/verify-two-factor", () => ({ verifyTwoFactor: vi.fn() }));

// Mock the toast notification library to verify UI feedback.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Creates a test wrapper component to provide the necessary QueryClient context.
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
 * Test suite for the `useTwoFactorAuth` custom hook.
 */
describe("useTwoFactorAuth", () => {
  // Clear all mock history before each test to maintain isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the hook initializes all required mutation objects.
   */
  it("initializes all mutations", () => {
    // Arrange: Render the hook within the QueryClient provider.
    const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

    // Assert: Check that all returned mutation properties are defined.
    expect(result.current.setupTwoFactor).toBeDefined();
    expect(result.current.verifyTwoFactor).toBeDefined();
    expect(result.current.getRecoveryCodes).toBeDefined();
    expect(result.current.regenerateRecoveryCodes).toBeDefined();
    expect(result.current.disableTwoFactor).toBeDefined();
  });

  /**
   * Test suite for the setupTwoFactor mutation logic.
   */
  describe("setupTwoFactor", () => {
    /**
     * Test case to verify error handling when the setup action fails.
     */
    it("calls action and handles error", async () => {
      // Arrange: Mock the setup action to reject with an error.
      vi.mocked(setupTwoFactor).mockRejectedValue(new Error("Setup failed"));

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the setup mutation.
      result.current.setupTwoFactor.mutate({});

      // Assert: Verify that a specific error toast is displayed to the user.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to setup two-factor authentication.", {
          className: "font-inter",
        });
      });
    });

    /**
     * Test case to verify behavior when the setup action succeeds.
     */
    it("calls action successfully", async () => {
      // Arrange: Mock the setup action to return valid secret and QR data.
      vi.mocked(setupTwoFactor).mockResolvedValue({
        success: true,
        data: { secret: "abc", qrCodeUrl: "data:image..." },
      });

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the setup mutation.
      result.current.setupTwoFactor.mutate({});

      // Assert: Verify that the mutation reaches a success state without showing a toast.
      await waitFor(() => {
        expect(result.current.setupTwoFactor.isSuccess).toBe(true);
      });
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  /**
   * Test suite for the verifyTwoFactor mutation logic.
   */
  describe("verifyTwoFactor", () => {
    /**
     * Test case to verify success feedback when token verification is confirmed.
     */
    it("toasts success when verification succeeds", async () => {
      // Arrange: Mock the verification action to return a success response.
      vi.mocked(verifyTwoFactor).mockResolvedValue({
        success: "Verified",
        data: { recoveryCodes: [] },
      });

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the verification mutation with dummy credentials.
      result.current.verifyTwoFactor.mutate({ secret: "abc", token: "123456" });

      // Assert: Verify that the mutation succeeds and displays a success toast.
      await waitFor(() => {
        expect(result.current.verifyTwoFactor.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Two-factor authentication successfully setup.", {
        className: "font-inter",
      });
    });

    /**
     * Test case to verify error feedback when the verification logic returns an error.
     */
    it("toasts error when logic fails", async () => {
      // Arrange: Mock the verification action to return a logic-level error.
      vi.mocked(verifyTwoFactor).mockResolvedValue({ error: "Invalid token" });

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the verification mutation with an incorrect token.
      result.current.verifyTwoFactor.mutate({ secret: "abc", token: "wrong" });

      // Assert: Verify that the mutation completes and displays the returned error message.
      await waitFor(() => {
        expect(result.current.verifyTwoFactor.isSuccess).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Invalid token", {
        className: "font-inter",
      });
    });

    /**
     * Test case to verify that a fallback message is used when the server error is empty.
     */
    it("toasts default error when error message is missing", async () => {
      // Arrange: Mock the verification action to return an empty error string.
      vi.mocked(verifyTwoFactor).mockResolvedValue({ error: "" });

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the mutation.
      result.current.verifyTwoFactor.mutate({ secret: "abc", token: "wrong" });

      // Assert: Verify that the default failure message is displayed.
      await waitFor(() => {
        expect(result.current.verifyTwoFactor.isSuccess).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to verify two-factor authentication.", {
        className: "font-inter",
      });
    });

    /**
     * Test case to verify feedback when an actual code exception occurs.
     */
    it("toasts unexpected error on exception", async () => {
      // Arrange: Mock the verification action to throw a network exception.
      vi.mocked(verifyTwoFactor).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the mutation.
      result.current.verifyTwoFactor.mutate({ secret: "abc", token: "123" });

      // Assert: Verify that the unexpected error toast is displayed.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", {
          className: "font-inter",
        });
      });
    });
  });

  /**
   * Test suite for the getRecoveryCodes mutation logic.
   */
  describe("getRecoveryCodes", () => {
    /**
     * Test case to verify error handling when fetching recovery codes fails.
     */
    it("calls action and handles error", async () => {
      // Arrange: Mock the fetch action to reject.
      vi.mocked(getRecoveryCodes).mockRejectedValue(new Error("Fetch failed"));

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the retrieval mutation.
      result.current.getRecoveryCodes.mutate();

      // Assert: Verify that the appropriate error toast is displayed.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to load recovery codes.", {
          className: "font-inter",
        });
      });
    });
  });

  /**
   * Test suite for the regenerateRecoveryCodes mutation logic.
   */
  describe("regenerateRecoveryCodes", () => {
    /**
     * Test case to verify success feedback when recovery codes are regenerated.
     */
    it("toasts success when regeneration succeeds", async () => {
      // Arrange: Mock the regeneration action to return success data.
      vi.mocked(regenerateRecoveryCodes).mockResolvedValue({
        success: "Regenerated",
        data: { recoveryCodes: ["code1"] },
      });

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the regeneration mutation.
      result.current.regenerateRecoveryCodes.mutate();

      // Assert: Verify success state and toast notification.
      await waitFor(() => {
        expect(result.current.regenerateRecoveryCodes.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Recovery codes regenerated successfully.", {
        className: "font-inter",
      });
    });

    /**
     * Test case to verify error feedback when regeneration logic fails.
     */
    it("toasts error when logic fails", async () => {
      // Arrange: Mock the regeneration action to return a specific error.
      vi.mocked(regenerateRecoveryCodes).mockResolvedValue({
        error: "Server busy",
      });

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the mutation.
      result.current.regenerateRecoveryCodes.mutate();

      // Assert: Verify that the specific server error message is shown.
      await waitFor(() => {
        expect(result.current.regenerateRecoveryCodes.isSuccess).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Server busy", {
        className: "font-inter",
      });
    });

    /**
     * Test case to verify default error message for regeneration.
     */
    it("toasts default error when error message is missing", async () => {
      // Arrange: Mock the regeneration action to return an empty error.
      vi.mocked(regenerateRecoveryCodes).mockResolvedValue({ error: "" });

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the mutation.
      result.current.regenerateRecoveryCodes.mutate();

      // Assert: Verify that the fallback regeneration error message is displayed.
      await waitFor(() => {
        expect(result.current.regenerateRecoveryCodes.isSuccess).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to regenerate recovery codes.", {
        className: "font-inter",
      });
    });

    /**
     * Test case to verify unexpected error handling for regeneration.
     */
    it("toasts unexpected error on exception", async () => {
      // Arrange: Mock the regeneration action to throw an exception.
      vi.mocked(regenerateRecoveryCodes).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the mutation.
      result.current.regenerateRecoveryCodes.mutate();

      // Assert: Verify that the generic unexpected error toast is displayed.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", {
          className: "font-inter",
        });
      });
    });
  });

  /**
   * Test suite for the disableTwoFactor mutation logic.
   */
  describe("disableTwoFactor", () => {
    /**
     * Test case to verify that the disable action is called with correct parameters.
     */
    it("calls action correctly", async () => {
      // Arrange: Mock the disable action to return a success response.
      vi.mocked(disableTwoFactor).mockResolvedValue({ success: "Disabled" });

      const { result } = renderHook(() => useTwoFactorAuth(), { wrapper: createWrapper() });

      // Act: Trigger the disable mutation with a password.
      result.current.disableTwoFactor.mutate({ currentPassword: "pass" });

      // Assert: Verify that the action was called and mutations completed without toasts.
      await waitFor(() => {
        expect(result.current.disableTwoFactor.isSuccess).toBe(true);
      });

      expect(disableTwoFactor).toHaveBeenCalledWith({ currentPassword: "pass" });
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
