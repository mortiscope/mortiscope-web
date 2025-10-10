import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import { useTwoFactorManagement } from "@/features/account/hooks/use-two-factor-management";

// Create a mock function to simulate the refetching of account security data.
const mockRefetch = vi.fn();

// Mock the hook responsible for account security to control and observe the refetch behavior.
vi.mock("@/features/account/hooks/use-account-security", () => ({
  useAccountSecurity: vi.fn(() => ({
    refetch: mockRefetch,
  })),
}));

// Function to generate a wrapper providing a React Query context for hook testing.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

/**
 * Test suite for the `useTwoFactorManagement` hook logic.
 */
describe("useTwoFactorManagement", () => {
  // Reset all mock states before each individual test case.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify the hook returns correct initial state values.
   */
  it("initializes with default values", () => {
    // Arrange: Render the hook with a standard query client wrapper.
    const { result } = renderHook(() => useTwoFactorManagement(), { wrapper: createWrapper() });

    // Assert: Verify that visibility flags and code storage are initialized to false or undefined.
    expect(result.current.isTwoFactorEnabled).toBe(false);
    expect(result.current.isTwoFactorModalOpen).toBe(false);
    expect(result.current.isTwoFactorDisableModalOpen).toBe(false);
    expect(result.current.initialRecoveryCodes).toBeUndefined();
  });

  /**
   * Test case to verify that the internal state updates when the securityData prop changes.
   */
  it("syncs state with provided securityData prop", () => {
    // Arrange: Render the hook with an initial enabled state.
    const { result, rerender } = renderHook(
      ({ securityData }) => useTwoFactorManagement({ securityData }),
      {
        wrapper: createWrapper(),
        initialProps: { securityData: { twoFactorEnabled: true } },
      }
    );

    // Assert: Confirm initial state reflects the enabled prop.
    expect(result.current.isTwoFactorEnabled).toBe(true);

    // Act: Rerender the hook with a disabled state prop.
    rerender({ securityData: { twoFactorEnabled: false } });

    // Assert: Confirm internal state has synchronized with the new prop value.
    expect(result.current.isTwoFactorEnabled).toBe(false);
  });

  /**
   * Test suite for the toggle handler logic.
   */
  describe("handleTwoFactorToggle", () => {
    /**
     * Test case to verify that the setup modal opens when moving from disabled to enabled.
     */
    it("opens setup modal when enabling 2FA", () => {
      // Arrange: Render hook in a disabled state.
      const { result } = renderHook(() => useTwoFactorManagement(), { wrapper: createWrapper() });

      expect(result.current.isTwoFactorEnabled).toBe(false);

      // Act: Trigger the toggle with a true value to enable authentication.
      act(() => {
        result.current.handleTwoFactorToggle(true);
      });

      // Assert: Check that the setup modal is open and the disable modal remains closed.
      expect(result.current.isTwoFactorModalOpen).toBe(true);
      expect(result.current.isTwoFactorDisableModalOpen).toBe(false);
    });

    /**
     * Test case to verify that the disable modal opens when moving from enabled to disabled.
     */
    it("opens disable modal when disabling 2FA", () => {
      // Arrange: Render hook with existing security data showing enabled status.
      const securityData = { twoFactorEnabled: true };

      const { result } = renderHook(() => useTwoFactorManagement({ securityData }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isTwoFactorEnabled).toBe(true);

      // Act: Trigger the toggle with a false value to disable authentication.
      act(() => {
        result.current.handleTwoFactorToggle(false);
      });

      // Assert: Check that the disable modal is open and the setup modal remains closed.
      expect(result.current.isTwoFactorDisableModalOpen).toBe(true);
      expect(result.current.isTwoFactorModalOpen).toBe(false);
    });

    /**
     * Test case to verify that no state changes occur if the toggle matches the current state.
     */
    it("does nothing if checking when already enabled", () => {
      // Arrange: Render hook in an already enabled state.
      const securityData = { twoFactorEnabled: true };
      const { result } = renderHook(() => useTwoFactorManagement({ securityData }), {
        wrapper: createWrapper(),
      });

      // Act: Trigger the toggle with a true value.
      act(() => {
        result.current.handleTwoFactorToggle(true);
      });

      // Assert: Verify that both modals remain closed as no action is required.
      expect(result.current.isTwoFactorModalOpen).toBe(false);
      expect(result.current.isTwoFactorDisableModalOpen).toBe(false);
    });
  });

  /**
   * Test suite for the success callback handling.
   */
  describe("handleTwoFactorSuccess", () => {
    /**
     * Test case to verify state updates and recovery code storage upon successful setup.
     */
    it("updates state and stores recovery codes", () => {
      // Arrange: Render hook and prepare dummy recovery codes.
      const { result } = renderHook(() => useTwoFactorManagement(), { wrapper: createWrapper() });
      const codes = ["code1", "code2"];

      // Act: Call the success handler with the generated codes.
      act(() => {
        result.current.handleTwoFactorSuccess(codes);
      });

      // Assert: Verify that 2FA is now enabled and codes are correctly stored in state.
      expect(result.current.isTwoFactorEnabled).toBe(true);
      expect(result.current.initialRecoveryCodes).toEqual(codes);
    });

    /**
     * Test case to verify enabling 2FA still proceeds even if no codes are provided.
     */
    it("handles success without recovery codes", () => {
      // Arrange: Render hook.
      const { result } = renderHook(() => useTwoFactorManagement(), { wrapper: createWrapper() });

      // Act: Call the success handler without passing any arguments.
      act(() => {
        result.current.handleTwoFactorSuccess();
      });

      // Assert: Verify that 2FA is enabled while the recovery codes property remains undefined.
      expect(result.current.isTwoFactorEnabled).toBe(true);
      expect(result.current.initialRecoveryCodes).toBeUndefined();
    });
  });

  /**
   * Test suite for the disable success callback handling.
   */
  describe("handleTwoFactorDisableSuccess", () => {
    /**
     * Test case to verify that disabling triggers both a state change and a data refetch.
     */
    it("disables 2FA and triggers refetch", () => {
      // Arrange: Render hook in an enabled state.
      const securityData = { twoFactorEnabled: true };

      const { result } = renderHook(() => useTwoFactorManagement({ securityData }), {
        wrapper: createWrapper(),
      });

      // Act: Call the disable success handler.
      act(() => {
        result.current.handleTwoFactorDisableSuccess();
      });

      // Assert: Confirm that 2FA is disabled locally and the `mockRefetch` function was invoked.
      expect(result.current.isTwoFactorEnabled).toBe(false);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
