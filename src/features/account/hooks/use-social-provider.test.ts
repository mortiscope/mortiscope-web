import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { getAccountProviders } from "@/features/account/actions/get-account-providers";
import { useSocialProvider } from "@/features/account/hooks/use-social-provider";

// Mock the server action responsible for fetching the authentication providers linked to an account.
vi.mock("@/features/account/actions/get-account-providers", () => ({
  getAccountProviders: vi.fn(),
}));

/**
 * Test suite for the `useSocialProvider` custom hook.
 */
describe("useSocialProvider", () => {
  // Clear all mock call histories before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the hook successfully fetches and stores provider data on mount.
   */
  it("fetches provider data on mount successfully", async () => {
    // Arrange: Define the mock provider data and successful server response.
    const mockData = {
      hasSocialProviders: true,
      providers: ["google"],
      hasPassword: false,
    };

    vi.mocked(getAccountProviders).mockResolvedValue({
      success: true,
      data: mockData,
      error: null,
    });

    const { result } = renderHook(() => useSocialProvider());

    // Assert: Verify that the hook enters a loading state.
    expect(result.current.isLoading).toBe(true);

    // Assert: Wait for the asynchronous fetch to complete and verify the resulting state.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(result.current.isSocialUser).toBe(true);
  });

  /**
   * Test case to verify that the hook captures and exposes error messages returned by the server.
   */
  it("handles logic error from server action", async () => {
    // Arrange: Mock a server response containing a specific logic error.
    vi.mocked(getAccountProviders).mockResolvedValue({
      success: false,
      error: "Failed to fetch",
      data: null,
    });

    const { result } = renderHook(() => useSocialProvider());

    // Assert: Wait for the hook to process the error.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Failed to fetch");
  });

  /**
   * Test case to verify that a fallback error message is used when the server provides an empty error string.
   */
  it("sets default error when server returns failure without message", async () => {
    // Arrange: Mock a failure response with no error description.
    vi.mocked(getAccountProviders).mockResolvedValue({
      success: false,
      error: "",
      data: null,
    });

    const { result } = renderHook(() => useSocialProvider());

    // Assert: Verify the hook applies the internal fallback error string.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Failed to fetch providers data");
  });

  /**
   * Test case to verify that unexpected network exceptions are caught and reported as generic errors.
   */
  it("handles unexpected exceptions during fetch", async () => {
    // Arrange: Mock a rejected promise to simulate a network-level failure.
    vi.mocked(getAccountProviders).mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useSocialProvider());

    // Assert: Verify the hook surfaces a generic unexpected error message.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("An unexpected error occurred");
  });

  /**
   * Test case to verify the conditional logic that determines if a user is strictly a social-auth user.
   */
  it("correctly determines isSocialUser status", async () => {
    // Arrange: Mock a user who only has social providers and no password.
    vi.mocked(getAccountProviders).mockResolvedValueOnce({
      success: true,
      data: { hasSocialProviders: true, providers: ["google"], hasPassword: false },
      error: null,
    });

    const { result, unmount } = renderHook(() => useSocialProvider());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert: Check that `isSocialUser` is true.
    expect(result.current.isSocialUser).toBe(true);
    unmount();

    // Arrange: Mock a user with a social provider who ALSO has a password.
    vi.mocked(getAccountProviders).mockResolvedValueOnce({
      success: true,
      data: { hasSocialProviders: true, providers: ["google"], hasPassword: true },
      error: null,
    });

    const { result: result2, unmount: unmount2 } = renderHook(() => useSocialProvider());
    await waitFor(() => expect(result2.current.isLoading).toBe(false));

    // Assert: Check that `isSocialUser` is false because a password exists.
    expect(result2.current.isSocialUser).toBe(false);
    unmount2();

    // Arrange: Mock a traditional credentials-only user.
    vi.mocked(getAccountProviders).mockResolvedValueOnce({
      success: true,
      data: { hasSocialProviders: false, providers: [], hasPassword: true },
      error: null,
    });

    const { result: result3 } = renderHook(() => useSocialProvider());
    await waitFor(() => expect(result3.current.isLoading).toBe(false));

    // Assert: Check that `isSocialUser` is false.
    expect(result3.current.isSocialUser).toBe(false);
  });

  /**
   * Test case to verify that the `refetch` function manually triggers a new request to the server.
   */
  it("refetches data when requested", async () => {
    // Arrange: Mock the initial server response.
    vi.mocked(getAccountProviders).mockResolvedValueOnce({
      success: true,
      data: { hasSocialProviders: false, providers: [], hasPassword: true },
      error: null,
    });

    const { result } = renderHook(() => useSocialProvider());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.hasSocialProviders).toBe(false);

    // Arrange: Mock a different response for the subsequent refetch.
    vi.mocked(getAccountProviders).mockResolvedValueOnce({
      success: true,
      data: { hasSocialProviders: true, providers: ["google"], hasPassword: false },
      error: null,
    });

    // Act: Trigger the `refetch` method manually.
    await act(async () => {
      await result.current.refetch();
    });

    // Assert: Verify data was updated and the server action was called a second time.
    expect(result.current.data?.hasSocialProviders).toBe(true);
    expect(getAccountProviders).toHaveBeenCalledTimes(2);
  });
});
