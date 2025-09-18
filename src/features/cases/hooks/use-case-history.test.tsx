import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { useCaseHistory } from "@/features/cases/hooks/use-case-history";
import { getCaseHistory } from "@/features/results/actions/get-case-history";

// Mock the server action responsible for fetching the case history log data.
vi.mock("@/features/results/actions/get-case-history", () => ({
  getCaseHistory: vi.fn(),
}));

// Utility function to create a wrapper component for React Query configuration.
const createWrapper = () => {
  // Arrange: Initialize a new `QueryClient` instance.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries to prevent test flakiness on failure.
        retry: false,
      },
    },
  });

  // Arrange: Define the wrapper component that provides the `QueryClientProvider` context.
  const QueryWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return QueryWrapper;
};

/**
 * Test suite for the `useCaseHistory` custom hook.
 */
describe("useCaseHistory", () => {
  // Setup runs before each test to ensure test isolation.
  beforeEach(() => {
    // Arrange: Clear the call history of all mocks.
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the case history data is fetched successfully.
   */
  it("fetches case history successfully", async () => {
    // Arrange: Define mock data to be returned by the server action.
    const mockData = [{ id: "log-1", field: "caseName", oldValue: "A", newValue: "B" }];

    // Arrange: Mock the `getCaseHistory` function to resolve with the predefined data.
    vi.mocked(getCaseHistory).mockResolvedValue(
      mockData as unknown as Awaited<ReturnType<typeof getCaseHistory>>
    );

    // Act: Render the hook with a mock case ID and the React Query wrapper.
    const { result } = renderHook(() => useCaseHistory("case-123"), {
      wrapper: createWrapper(),
    });

    // Assert: Check the initial loading state before the asynchronous operation completes.
    expect(result.current.isLoading).toBe(true);

    // Assert: Wait for the query to transition to the success state.
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Assert: Verify that the fetched data matches the mock data.
    expect(result.current.data).toEqual(mockData);
    // Assert: Check that the server action was called with the correct `caseId`.
    expect(getCaseHistory).toHaveBeenCalledWith("case-123");
  });

  /**
   * Test case to verify that the hook correctly handles errors when the data fetching fails.
   */
  it("handles errors when fetching fails", async () => {
    // Arrange: Mock the `getCaseHistory` function to reject with a failure error.
    vi.mocked(getCaseHistory).mockRejectedValue(new Error("Failed to fetch"));

    // Act: Render the hook.
    const { result } = renderHook(() => useCaseHistory("case-123"), {
      wrapper: createWrapper(),
    });

    // Assert: Wait for the query to transition to the error state.
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Assert: Check that the error object is present in the hook's result.
    expect(result.current.error).toBeDefined();
  });
});
