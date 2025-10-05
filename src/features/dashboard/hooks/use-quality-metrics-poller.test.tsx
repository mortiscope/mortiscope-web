import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { type DateRange } from "react-day-picker";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getConfidenceScoreDistribution } from "@/features/dashboard/actions/get-confidence-score-distribution";
import { getModelPerformanceMetrics } from "@/features/dashboard/actions/get-model-performance-metrics";
import { getUserCorrectionRatio } from "@/features/dashboard/actions/get-user-correction-ratio";
import {
  calculateRefetchInterval,
  calculateRetryDelay,
  useQualityMetricsPoller,
} from "@/features/dashboard/hooks/use-quality-metrics-poller";
import { useDashboardStore } from "@/features/dashboard/store/dashboard-store";

// Mock the server action for confidence score distribution data.
vi.mock("@/features/dashboard/actions/get-confidence-score-distribution", () => ({
  getConfidenceScoreDistribution: vi.fn(),
}));

// Mock the server action for model performance metrics data.
vi.mock("@/features/dashboard/actions/get-model-performance-metrics", () => ({
  getModelPerformanceMetrics: vi.fn(),
}));

// Mock the server action for user correction ratio data.
vi.mock("@/features/dashboard/actions/get-user-correction-ratio", () => ({
  getUserCorrectionRatio: vi.fn(),
}));

// Mock the dashboard store to control global polling state and activity flags.
vi.mock("@/features/dashboard/store/dashboard-store", () => ({
  useDashboardStore: vi.fn(),
}));

/**
 * Utility to create a test wrapper providing the necessary TanStack Query context.
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

// Define mock functions for store actions to track invocations.
const mockResetToFastPolling = vi.fn();
const mockIncreasePollingInterval = vi.fn();

// Standard mock state configuration for the dashboard store.
const mockStoreState = {
  pollInterval: 5000,
  isUserActive: true,
  resetToFastPolling: mockResetToFastPolling,
  increasePollingInterval: mockIncreasePollingInterval,
};

// Sample datasets for quality metrics.
const mockConfidenceData = [{ name: "0.9-1.0", count: 10 }];
const mockPerformanceData = [{ name: "adult", confidence: 95 }];
const mockCorrectionData = [{ name: "verified", quantity: 5 }];

/**
 * Test suite for the hook managing quality metrics polling logic.
 */
describe("useQualityMetricsPoller", () => {
  // Clear mocks and set up default store behavior before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDashboardStore).mockImplementation((selector: unknown) => {
      if (typeof selector === "function") {
        return selector(mockStoreState);
      }
      return selector;
    });

    vi.mocked(getConfidenceScoreDistribution).mockResolvedValue(mockConfidenceData);
    vi.mocked(getModelPerformanceMetrics).mockResolvedValue(mockPerformanceData);
    vi.mocked(getUserCorrectionRatio).mockResolvedValue(mockCorrectionData);
  });

  /**
   * Test case to verify the hook aggregates and returns data from all three server actions.
   */
  it("fetches and combines data from all three sources", async () => {
    // Act: Render the hook without a date filter.
    const { result } = renderHook(() => useQualityMetricsPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify all state objects match the mocked data returned by actions.
    await waitFor(() => {
      expect(result.current.confidenceData).toEqual(mockConfidenceData);
      expect(result.current.modelPerformanceData).toEqual(mockPerformanceData);
      expect(result.current.correctionData).toEqual(mockCorrectionData);
    });
  });

  /**
   * Test case to ensure the provided date range prop is correctly distributed to each fetcher.
   */
  it("passes date range to all server actions", async () => {
    // Arrange: Define a specific date range.
    const dateRange = {
      from: new Date("2025-01-01"),
      to: new Date("2025-01-31"),
    };

    // Act: Render the hook with the `dateRange`.
    renderHook(() => useQualityMetricsPoller({ dateRange }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify each server action received the `from` and `to` parameters.
    await waitFor(() => {
      expect(getConfidenceScoreDistribution).toHaveBeenCalledWith(dateRange.from, dateRange.to);
      expect(getModelPerformanceMetrics).toHaveBeenCalledWith(dateRange.from, dateRange.to);
      expect(getUserCorrectionRatio).toHaveBeenCalledWith(dateRange.from, dateRange.to);
    });
  });

  /**
   * Test case to verify that the polling interval increases when subsequent fetches return unchanged data.
   */
  it("increases polling interval when data remains unchanged", async () => {
    // Arrange: Mock sequential calls returning the SAME data to trigger optimization logic.
    vi.mocked(getConfidenceScoreDistribution)
      .mockResolvedValueOnce(mockConfidenceData)
      .mockResolvedValueOnce(mockConfidenceData);
    vi.mocked(getModelPerformanceMetrics)
      .mockResolvedValueOnce(mockPerformanceData)
      .mockResolvedValueOnce(mockPerformanceData);
    vi.mocked(getUserCorrectionRatio)
      .mockResolvedValueOnce(mockCorrectionData)
      .mockResolvedValueOnce(mockCorrectionData);

    const { result, rerender } = renderHook(
      ({ dateRange }) => useQualityMetricsPoller({ dateRange }),
      {
        initialProps: { dateRange: undefined as DateRange | undefined },
        wrapper: createWrapper(),
      }
    );

    // Act: Wait for initial fetch and force a rerender to trigger the next fetch cycle.
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    rerender({
      dateRange: { from: new Date("2025-01-01"), to: new Date("2025-01-02") },
    });

    // Assert: Verify that the interval was increased and not reset.
    await waitFor(() => {
      expect(mockIncreasePollingInterval).toHaveBeenCalled();
    });
    expect(mockResetToFastPolling).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the polling interval resets to fast when data changes are detected.
   */
  it("resets to fast polling when data changes", async () => {
    // Arrange: Define updated confidence data to represent a server-side change.
    const newConfidenceData = [{ name: "0.9-1.0", count: 15 }];

    vi.mocked(getConfidenceScoreDistribution)
      .mockResolvedValueOnce(mockConfidenceData)
      .mockResolvedValueOnce(newConfidenceData);
    vi.mocked(getModelPerformanceMetrics)
      .mockResolvedValueOnce(mockPerformanceData)
      .mockResolvedValueOnce(mockPerformanceData);
    vi.mocked(getUserCorrectionRatio)
      .mockResolvedValueOnce(mockCorrectionData)
      .mockResolvedValueOnce(mockCorrectionData);

    const { result, rerender } = renderHook(
      ({ dateRange }) => useQualityMetricsPoller({ dateRange }),
      {
        initialProps: { dateRange: undefined as DateRange | undefined },
        wrapper: createWrapper(),
      }
    );

    // Act: Complete first fetch, mock the store state, and rerender to fetch the updated data.
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    vi.mocked(useDashboardStore).mockImplementation((selector: unknown) => {
      if (typeof selector === "function") {
        return selector({ ...mockStoreState });
      }
      return selector;
    });

    rerender({
      dateRange: { from: new Date("2025-01-01"), to: new Date("2025-01-02") },
    });

    // Assert: Verify that the polling interval was reset due to the data delta.
    await waitFor(() => {
      expect(mockResetToFastPolling).toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify error handling when a server action fails.
   */
  it("handles errors gracefully if one action fails", async () => {
    // Arrange: Mock a rejection for one of the three actions.
    const error = new Error("Fetch failed");
    vi.mocked(getConfidenceScoreDistribution).mockRejectedValue(error);

    // Act: Render the hook.
    const { result } = renderHook(() => useQualityMetricsPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the error state is present and relevant data is null.
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.confidenceData).toBeNull();
  });

  /**
   * Test case to ensure the hook exposes the current store state for polling and activity.
   */
  it("returns polling state and user activity from store", () => {
    // Act: Render the hook.
    const { result } = renderHook(() => useQualityMetricsPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the returned `pollInterval` and `isUserActive` match the store state.
    expect(result.current.pollInterval).toBe(5000);
    expect(result.current.isUserActive).toBe(true);
  });
});

/**
 * Test suite for the refetch interval calculation utility.
 */
describe("calculateRefetchInterval", () => {
  /**
   * Test case to ensure polling is suspended when an error is present.
   */
  it("returns false if there is an error", () => {
    // Assert: Verify `false` is returned to TanStack Query when an error occurs.
    expect(calculateRefetchInterval(true, true, 5000)).toBe(false);
  });

  /**
   * Test case to ensure polling is suspended when the user is inactive.
   */
  it("returns false if user is not active", () => {
    // Assert: Verify `false` is returned when `isUserActive` is false.
    expect(calculateRefetchInterval(false, false, 5000)).toBe(false);
  });

  /**
   * Test case to verify the current polling interval is returned when conditions are healthy.
   */
  it("returns pollInterval if no error and user is active", () => {
    // Assert: Verify the provided interval value is returned when the user is active and no errors exist.
    expect(calculateRefetchInterval(false, true, 5000)).toBe(5000);
  });
});

/**
 * Test suite for the retry delay calculation utility.
 */
describe("calculateRetryDelay", () => {
  /**
   * Test case to verify exponential growth of the retry delay.
   */
  it("calculates exponential backoff", () => {
    // Assert: Verify the delay doubles for each subsequent attempt.
    expect(calculateRetryDelay(0)).toBe(1000);
    expect(calculateRetryDelay(1)).toBe(2000);
    expect(calculateRetryDelay(2)).toBe(4000);
  });

  /**
   * Test case to ensure the retry delay is capped.
   */
  it("caps delay at 30 seconds", () => {
    // Assert: Verify the delay does not exceed the maximum threshold of 30000ms.
    expect(calculateRetryDelay(10)).toBe(30000);
  });
});
