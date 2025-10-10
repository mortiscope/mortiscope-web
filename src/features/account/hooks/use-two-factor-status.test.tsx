import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { getTwoFactorStatus } from "@/features/account/actions/get-two-factor-status";
import { useTwoFactorStatus } from "@/features/account/hooks/use-two-factor-status";

// Mock the server action responsible for retrieving the current two-factor authentication status.
vi.mock("@/features/account/actions/get-two-factor-status", () => ({
  getTwoFactorStatus: vi.fn(),
}));

// Generates a wrapper component to provide a shared `QueryClient` instance for hook testing.
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
 * Test suite for the `useTwoFactorStatus` custom hook.
 */
describe("useTwoFactorStatus", () => {
  // Clear all mock history and implementations before each test to ensure environmental isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify successful data fetching and state updates when the action returns valid data.
   */
  it("fetches and returns the two-factor status successfully", async () => {
    // Arrange: Define a successful mock response containing enabled 2FA status and metadata.
    const mockResponse = {
      success: true,
      data: {
        enabled: true,
        backupCodesGenerated: true,
        enabledAt: new Date("2024-01-01"),
      },
    };

    vi.mocked(getTwoFactorStatus).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useTwoFactorStatus(), { wrapper: createWrapper() });

    // Act & Assert: Wait for the query to reach a success state and verify the returned data.
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(getTwoFactorStatus).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the hook correctly processes responses where 2FA is explicitly disabled.
   */
  it("handles disabled status correctly", async () => {
    // Arrange: Define a mock response indicating that two-factor authentication is not active.
    const mockResponse = {
      success: true,
      data: {
        enabled: false,
        backupCodesGenerated: false,
        enabledAt: null,
      },
    };

    vi.mocked(getTwoFactorStatus).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useTwoFactorStatus(), { wrapper: createWrapper() });

    // Act & Assert: Wait for data resolution and confirm the `data` property matches the disabled state.
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
  });

  /**
   * Test case to verify that the hook enters an error state when the server action rejects.
   */
  it("handles errors from the action", async () => {
    // Arrange: Force the server action to return a rejected promise.
    vi.mocked(getTwoFactorStatus).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useTwoFactorStatus(), { wrapper: createWrapper() });

    // Act & Assert: Wait for the query to fail and verify that the `isError` flag and error object are set.
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
