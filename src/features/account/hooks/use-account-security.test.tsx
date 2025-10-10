import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { getAccountSecurity } from "@/features/account/actions/get-account-security";
import { useAccountSecurity } from "@/features/account/hooks/use-account-security";

// Mock the account security server action to simulate backend responses for security settings.
vi.mock("@/features/account/actions/get-account-security", () => ({
  getAccountSecurity: vi.fn(),
}));

// Standardized security data used to validate hook state and data mapping.
const mockSecurityData = {
  id: "user-123",
  email: "mortiscope@example.com",
  twoFactorEnabled: true,
};

/**
 * Test suite for the `useAccountSecurity` custom hook.
 */
describe("useAccountSecurity", () => {
  // Clear all mocks before each test case to ensure a clean testing environment.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that security data is successfully retrieved and stored on initial mount.
   */
  it("fetches and returns security data on mount", async () => {
    // Arrange: Mock the server action to return valid security settings.
    vi.mocked(getAccountSecurity).mockResolvedValue({
      success: true,
      data: mockSecurityData,
      error: null,
    });

    // Act: Render the hook to trigger the internal useEffect for data fetching.
    const { result } = renderHook(() => useAccountSecurity());

    // Assert: Check that the hook initially enters a loading state.
    expect(result.current.isLoading).toBe(true);

    // Assert: Wait for the asynchronous fetch to resolve and update the state.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Confirm the state contains the expected security data and no errors.
    expect(result.current.data).toEqual(mockSecurityData);
    expect(result.current.error).toBeNull();
  });

  /**
   * Test case to verify that the hook correctly handles explicit error messages from the backend.
   */
  it("handles API errors gracefully", async () => {
    // Arrange: Mock an unauthorized error response from the server action.
    vi.mocked(getAccountSecurity).mockResolvedValue({
      success: false,
      error: "Unauthorized access",
      data: null,
    });

    // Act: Render the hook and wait for the loading sequence to complete.
    const { result } = renderHook(() => useAccountSecurity());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Ensure the data is null and the specific error message is reflected in the state.
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Unauthorized access");
  });

  /**
   * Test case to verify that unexpected promise rejections or network failures are caught.
   */
  it("handles unexpected exceptions during fetch", async () => {
    // Arrange: Force the server action to throw a network-related error.
    vi.mocked(getAccountSecurity).mockRejectedValue(new Error("Network error"));

    // Act: Render the hook and wait for the error handling logic to execute.
    const { result } = renderHook(() => useAccountSecurity());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Verify that a generic error string is provided to the state when an exception occurs.
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("An unexpected error occurred");
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("An unexpected error occurred");
  });

  /**
   * Test case to verify behavior when the API reports success but the payload is missing.
   */
  it("handles success=true but missing data gracefully", async () => {
    // Arrange: Mock a response where success is true but the `data` property is null.
    vi.mocked(getAccountSecurity).mockResolvedValue({
      success: true,
      data: null as unknown as NonNullable<Awaited<ReturnType<typeof getAccountSecurity>>["data"]>,
      error: null,
    });

    // Act: Render the hook and monitor the transition from the loading state.
    const { result } = renderHook(() => useAccountSecurity());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Confirm that a specific fallback error is set when data integrity is compromised.
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Failed to fetch security data");
  });

  /**
   * Test case to verify that the manual `refetch` function triggers a new API call and updates state.
   */
  it("refetches data when requested", async () => {
    // Arrange: Setup the initial mock response for the first fetch on mount.
    vi.mocked(getAccountSecurity).mockResolvedValueOnce({
      success: true,
      data: mockSecurityData,
      error: null,
    });

    const { result } = renderHook(() => useAccountSecurity());

    // Assert: Verify the first load is successful.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockSecurityData);

    // Arrange: Prepare a different data set for the subsequent refetch call.
    const updatedData = { ...mockSecurityData, twoFactorEnabled: false };
    vi.mocked(getAccountSecurity).mockResolvedValueOnce({
      success: true,
      data: updatedData,
      error: null,
    });

    // Act: Invoke the `refetch` method provided by the hook.
    await act(async () => {
      await result.current.refetch();
    });

    // Assert: Confirm that the data state has updated and the server action was called twice.
    expect(result.current.data).toEqual(updatedData);
    expect(getAccountSecurity).toHaveBeenCalledTimes(2);
  });
});
