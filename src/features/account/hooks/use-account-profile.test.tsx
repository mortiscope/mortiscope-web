import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { getAccountProfile } from "@/features/account/actions/get-account-profile";
import { useAccountProfile } from "@/features/account/hooks/use-account-profile";

// Mock the account profile server action to control the data returned during testing.
vi.mock("@/features/account/actions/get-account-profile", () => ({
  getAccountProfile: vi.fn(),
}));

// Provide a standardized user profile object for use across multiple test cases.
const mockProfileData = {
  id: "user-123",
  name: "MortiScope Account",
  email: "mortiscope@example.com",
  image: "https://example.com/avatar.jpg",
  professionalTitle: "Professional Title",
  institution: "Institution",
  locationRegion: "Region 1",
  locationProvince: "Province 1",
  locationCity: "City 1",
  locationBarangay: "Barangay 1",
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-02T00:00:00.000Z"),
};

/**
 * Test suite for the `useAccountProfile` custom hook.
 */
describe("useAccountProfile", () => {
  // Clear all mock history before each test to prevent cross-test interference.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that profile data is successfully fetched and returned when the hook mounts.
   */
  it("fetches and returns profile data on mount", async () => {
    // Arrange: Configure the mock action to return a successful profile response.
    vi.mocked(getAccountProfile).mockResolvedValue({
      success: true,
      data: mockProfileData,
      error: null,
    });

    // Act: Render the hook to trigger the initial fetch logic.
    const { result } = renderHook(() => useAccountProfile());

    // Assert: Verify that the hook starts in a loading state.
    expect(result.current.isLoading).toBe(true);

    // Assert: Wait for the async operation to complete and check if loading is finished.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Check if the returned data matches the mock input and no error exists.
    expect(result.current.data).toEqual(mockProfileData);
    expect(result.current.error).toBeNull();
  });

  /**
   * Test case to verify that the hook correctly processes explicit error messages from the API.
   */
  it("handles API errors gracefully", async () => {
    // Arrange: Mock a response indicating a failed attempt to locate the profile.
    vi.mocked(getAccountProfile).mockResolvedValue({
      success: false,
      error: "Profile not found",
      data: null,
    });

    // Act: Render the hook and wait for the fetch cycle to end.
    const { result } = renderHook(() => useAccountProfile());

    // Assert: Verify that loading has finished.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Ensure that data is null and the specific error message is captured in the state.
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Profile not found");
  });

  /**
   * Test case to verify behavior when the API reports success but fails to provide data.
   */
  it("handles successful response with missing data", async () => {
    // Arrange: Mock a success response that contains a null data field.
    vi.mocked(getAccountProfile).mockResolvedValue({
      success: true,
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof getAccountProfile>>);

    // Act: Render the hook.
    const { result } = renderHook(() => useAccountProfile());

    // Assert: Wait for the hook to update after the asynchronous fetch.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Check that a fallback error message is generated when data is unexpectedly missing.
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Failed to fetch profile");
  });

  /**
   * Test case to verify that unhandled exceptions during the fetch process are caught and managed.
   */
  it("handles unexpected exceptions during fetch", async () => {
    // Arrange: Silence console errors for the test and mock a total network failure.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getAccountProfile).mockRejectedValue(new Error("Network error"));

    // Act: Render the hook.
    const { result } = renderHook(() => useAccountProfile());

    // Assert: Wait for the hook to catch the exception and update state.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Verify that a generic error message is provided to the user.
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("An unexpected error occurred");

    // Clean up: Restore console functionality.
    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that the manual refetch function updates the state with fresh data.
   */
  it("refetches data when requested", async () => {
    // Arrange: Setup an initial successful response.
    vi.mocked(getAccountProfile).mockResolvedValueOnce({
      success: true,
      data: mockProfileData,
      error: null,
    });

    const { result } = renderHook(() => useAccountProfile());

    // Assert: Confirm the initial data fetch is complete.
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockProfileData);

    // Arrange: Setup a second, updated response for the refetch call.
    const updatedData = { ...mockProfileData, name: "Updated User" };
    vi.mocked(getAccountProfile).mockResolvedValueOnce({
      success: true,
      data: updatedData,
      error: null,
    });

    // Act: Execute the refetch function provided by the hook.
    await act(async () => {
      await result.current.refetch();
    });

    // Assert: Verify the data state is updated and the API was called for the second time.
    expect(result.current.data).toEqual(updatedData);
    expect(getAccountProfile).toHaveBeenCalledTimes(2);
  });
});
