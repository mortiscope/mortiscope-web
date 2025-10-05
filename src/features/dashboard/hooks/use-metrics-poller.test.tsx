import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";
import { useMetricsPoller } from "@/features/dashboard/hooks/use-metrics-poller";

// Mock the server action responsible for retrieving dashboard summary metrics.
vi.mock("@/features/dashboard/actions/get-dashboard-metrics", () => ({
  getDashboardMetrics: vi.fn(),
}));

/**
 * Utility to create a test wrapper that provides a `QueryClient` context to the hook.
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

/**
 * Test suite for the `useMetricsPoller` hook which synchronizes summary statistics.
 */
describe("useMetricsPoller", () => {
  // Define a comprehensive mock dataset representing the initial state of the dashboard.
  const mockInitialData = {
    verified: 0,
    totalCases: 10,
    totalImages: 50,
    verifiedImages: 10,
    activeCases: 5,
    completedCases: 5,
    totalDetectionsCount: 100,
    verifiedDetectionsCount: 20,
    averagePMI: 24,
    averageConfidence: 0.95,
    correctionRate: 0.05,
    averagePmi: 24,
  };

  // Reset the fetcher mock to provide the default initial data before each test.
  beforeEach(() => {
    vi.mocked(getDashboardMetrics).mockResolvedValue(mockInitialData);
  });

  /**
   * Test case to ensure the hook immediately utilizes provided initial data to prevent layout shift.
   */
  it("returns initial data immediately without fetching", () => {
    // Act: Render the hook with the `mockInitialData` provided as a prop.
    const { result } = renderHook(() => useMetricsPoller(mockInitialData, undefined), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the returned data matches the initial input immediately.
    expect(result.current.data).toEqual(mockInitialData);
  });

  /**
   * Test case to verify that missing date ranges result in unbounded query parameters.
   */
  it("calls getDashboardMetrics with undefined dates when no range is provided", async () => {
    // Act: Render the hook without a `dateRange` argument.
    renderHook(() => useMetricsPoller(mockInitialData, undefined), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the server action is called with `undefined` for both start and end dates.
    await waitFor(() => {
      expect(getDashboardMetrics).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  /**
   * Test case to verify that specific date ranges are correctly passed to the server action.
   */
  it("calls getDashboardMetrics with provided date range", async () => {
    // Arrange: Define a specific range for January 2025.
    const dateRange = {
      from: new Date("2025-01-01"),
      to: new Date("2025-01-31"),
    };

    // Act: Render the hook with the `dateRange` provided.
    renderHook(() => useMetricsPoller(mockInitialData, dateRange), {
      wrapper: createWrapper(),
    });

    // Assert: Check that the fetcher received the exact `Date` objects from the range.
    await waitFor(() => {
      expect(getDashboardMetrics).toHaveBeenCalledWith(dateRange.from, dateRange.to);
    });
  });

  /**
   * Test case to verify that the hook state updates correctly when the query successfully resolves new data.
   */
  it("updates data when the query fetches new results", async () => {
    // Arrange: Define an updated dataset with different metric values.
    const newData = {
      verified: 5,
      totalCases: 20,
      totalImages: 100,
      verifiedImages: 50,
      activeCases: 10,
      completedCases: 10,
      totalDetectionsCount: 200,
      verifiedDetectionsCount: 100,
      averagePMI: 48,
      averageConfidence: 0.98,
      correctionRate: 0.02,
      averagePmi: 48,
    };

    vi.mocked(getDashboardMetrics).mockResolvedValue(newData);

    // Act: Render the hook and wait for the async update to occur.
    const { result } = renderHook(() => useMetricsPoller(mockInitialData, undefined), {
      wrapper: createWrapper(),
    });

    // Assert: Ensure the hook state transitioned from `mockInitialData` to `newData`.
    await waitFor(() => {
      expect(result.current.data).toEqual(newData);
    });
  });

  /**
   * Test case to verify that React Query's dependency tracking triggers a refetch on prop change.
   */
  it("refetches when date range changes", async () => {
    // Arrange: Define two distinct date ranges for sequential testing.
    const range1 = { from: new Date("2024-01-01"), to: new Date("2024-01-05") };
    const range2 = { from: new Date("2024-02-01"), to: new Date("2024-02-05") };

    const { rerender } = renderHook(({ range }) => useMetricsPoller(mockInitialData, range), {
      wrapper: createWrapper(),
      initialProps: { range: range1 },
    });

    // Assert: Verify the first fetch occurred with `range1`.
    await waitFor(() => {
      expect(getDashboardMetrics).toHaveBeenCalledWith(range1.from, range1.to);
    });

    // Act: Change the `range` prop to trigger a new query cycle.
    rerender({ range: range2 });

    // Assert: Verify a second fetch occurred using the new `range2` boundaries.
    await waitFor(() => {
      expect(getDashboardMetrics).toHaveBeenCalledWith(range2.from, range2.to);
    });
  });
});
