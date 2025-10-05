import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { type DateRange } from "react-day-picker";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getLifeStageDistribution } from "@/features/dashboard/actions/get-life-stage-distribution";
import { getPmiDistribution } from "@/features/dashboard/actions/get-pmi-distribution";
import { getSamplingDensity } from "@/features/dashboard/actions/get-sampling-density";
import {
  calculateRefetchInterval,
  calculateRetryDelay,
  useForensicInsightsPoller,
} from "@/features/dashboard/hooks/use-forensic-insights-poller";
import { useDashboardStore } from "@/features/dashboard/store/dashboard-store";

// Mock the server action for life stage distribution data.
vi.mock("@/features/dashboard/actions/get-life-stage-distribution", () => ({
  getLifeStageDistribution: vi.fn(),
}));

// Mock the server action for PMI (Post-Mortem Interval) distribution data.
vi.mock("@/features/dashboard/actions/get-pmi-distribution", () => ({
  getPmiDistribution: vi.fn(),
}));

// Mock the server action for geographic sampling density data.
vi.mock("@/features/dashboard/actions/get-sampling-density", () => ({
  getSamplingDensity: vi.fn(),
}));

// Mock the global dashboard store to control polling intervals and activity status.
vi.mock("@/features/dashboard/store/dashboard-store", () => ({
  useDashboardStore: vi.fn(),
}));

/**
 * Utility to create a test wrapper providing the necessary `QueryClientProvider` context.
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

// Mock functions to track store action calls.
const mockResetToFastPolling = vi.fn();
const mockIncreasePollingInterval = vi.fn();

// Default mock state for the dashboard store used across tests.
const mockStoreState = {
  pollInterval: 5000,
  isUserActive: true,
  resetToFastPolling: mockResetToFastPolling,
  increasePollingInterval: mockIncreasePollingInterval,
};

// Static mock datasets for forensic distributions.
const mockLifeStageData = [{ name: "adult", quantity: 10 }];
const mockPmiData = [{ name: "12-24h", quantity: 5 }];
const mockSamplingData = [{ name: "Region A", quantity: 3 }];

/**
 * Test suite for the `useForensicInsightsPoller` hook which manages complex dashboard data polling.
 */
describe("useForensicInsightsPoller", () => {
  // Reset mocks and define standard behavior for store and actions before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDashboardStore).mockImplementation((selector: unknown) => {
      if (typeof selector === "function") {
        return selector(mockStoreState);
      }
      return selector;
    });

    vi.mocked(getLifeStageDistribution).mockResolvedValue(mockLifeStageData);
    vi.mocked(getPmiDistribution).mockResolvedValue(mockPmiData);
    vi.mocked(getSamplingDensity).mockResolvedValue(mockSamplingData);
  });

  /**
   * Test case to verify that the hook successfully aggregates data from three separate endpoints.
   */
  it("fetches and returns all three datasets combined", async () => {
    // Act: Render the poller hook without a specific date range.
    const { result } = renderHook(() => useForensicInsightsPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify all forensic datasets are correctly populated in the hook result.
    await waitFor(() => {
      expect(result.current.lifeStageData).toEqual(mockLifeStageData);
      expect(result.current.pmiData).toEqual(mockPmiData);
      expect(result.current.samplingData).toEqual(mockSamplingData);
    });
  });

  /**
   * Test case to verify that the provided date range is propagated to all underlying server actions.
   */
  it("passes the date range to all server actions", async () => {
    // Arrange: Define a specific search period.
    const dateRange = {
      from: new Date("2024-01-01"),
      to: new Date("2024-01-31"),
    };

    // Act: Render the hook with the defined `dateRange`.
    renderHook(() => useForensicInsightsPoller({ dateRange }), {
      wrapper: createWrapper(),
    });

    // Assert: Check that each fetcher received the `from` and `to` date parameters.
    await waitFor(() => {
      expect(getLifeStageDistribution).toHaveBeenCalledWith(dateRange.from, dateRange.to);
      expect(getPmiDistribution).toHaveBeenCalledWith(dateRange.from, dateRange.to);
      expect(getSamplingDensity).toHaveBeenCalledWith(dateRange.from, dateRange.to);
    });
  });

  /**
   * Test case to verify the initial loading state of the hook.
   */
  it("returns nulls initially while fetching", async () => {
    // Arrange: Mock a fetcher with an unresolved promise to simulate a pending request.
    vi.mocked(getLifeStageDistribution).mockImplementation(() => new Promise(() => {}));

    // Act: Render the hook.
    const { result } = renderHook(() => useForensicInsightsPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that data fields are `null` and `isFetching` is true during the load.
    expect(result.current.lifeStageData).toBeNull();
    expect(result.current.pmiData).toBeNull();
    expect(result.current.samplingData).toBeNull();
    expect(result.current.isFetching).toBe(true);
  });

  /**
   * Test case to verify that the polling frequency decreases when data remains static.
   */
  it("increases polling interval when data remains unchanged", async () => {
    // Arrange: Mock consistent data across multiple calls.
    vi.mocked(getLifeStageDistribution)
      .mockResolvedValueOnce(mockLifeStageData)
      .mockResolvedValueOnce(mockLifeStageData);
    vi.mocked(getPmiDistribution)
      .mockResolvedValueOnce(mockPmiData)
      .mockResolvedValueOnce(mockPmiData);
    vi.mocked(getSamplingDensity)
      .mockResolvedValueOnce(mockSamplingData)
      .mockResolvedValueOnce(mockSamplingData);

    const { result, rerender } = renderHook(
      ({ dateRange }) => useForensicInsightsPoller({ dateRange }),
      {
        initialProps: { dateRange: undefined as DateRange | undefined },
        wrapper: createWrapper(),
      }
    );

    // Act: Wait for the first fetch to finish and trigger a second fetch cycle.
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    rerender({
      dateRange: { from: new Date("2025-01-01"), to: new Date("2025-01-02") },
    });

    // Assert: Verify that `increasePollingInterval` was called because the data did not change.
    await waitFor(() => {
      expect(mockIncreasePollingInterval).toHaveBeenCalled();
    });
    expect(mockResetToFastPolling).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the polling frequency resets to the fast rate when data updates.
   */
  it("resets to fast polling when data changes", async () => {
    // Arrange: Prepare a second dataset with updated quantity values.
    const newLifeStageData = [{ name: "adult", quantity: 20 }];

    vi.mocked(getLifeStageDistribution)
      .mockResolvedValueOnce(mockLifeStageData)
      .mockResolvedValueOnce(newLifeStageData);
    vi.mocked(getPmiDistribution)
      .mockResolvedValueOnce(mockPmiData)
      .mockResolvedValueOnce(mockPmiData);
    vi.mocked(getSamplingDensity)
      .mockResolvedValueOnce(mockSamplingData)
      .mockResolvedValueOnce(mockSamplingData);

    const { result, rerender } = renderHook(
      ({ dateRange }) => useForensicInsightsPoller({ dateRange }),
      {
        initialProps: { dateRange: undefined as DateRange | undefined },
        wrapper: createWrapper(),
      }
    );

    // Act: Complete initial fetch and trigger a rerender that fetches the modified data.
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

    // Assert: Verify that `resetToFastPolling` was called due to the detected data changes.
    await waitFor(() => {
      expect(mockResetToFastPolling).toHaveBeenCalled();
    });
  });

  /**
   * Test case to ensure the hook handles server-side failures without crashing.
   */
  it("handles errors gracefully", async () => {
    // Arrange: Mock a rejection from the distribution action.
    const error = new Error("Network error");
    vi.mocked(getLifeStageDistribution).mockRejectedValue(error);

    // Act: Render the poller hook.
    const { result } = renderHook(() => useForensicInsightsPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the error object is defined and data remains null.
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.lifeStageData).toBeNull();
  });

  /**
   * Test case to verify the hook exposes polling metadata and activity status from the store.
   */
  it("returns polling state and user activity from store", () => {
    // Act: Render the hook.
    const { result } = renderHook(() => useForensicInsightsPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Ensure the current `pollInterval` and `isUserActive` status are returned.
    expect(result.current.pollInterval).toBe(5000);
    expect(result.current.isUserActive).toBe(true);
  });
});

/**
 * Test suite for the helper function that calculates the refetch timing.
 */
describe("calculateRefetchInterval", () => {
  /**
   * Test case to ensure polling stops if the hook is in an error state.
   */
  it("returns false if there is an error", () => {
    // Assert: Verify `false` is returned when an error exists.
    expect(calculateRefetchInterval(true, true, 5000)).toBe(false);
  });

  /**
   * Test case to ensure polling stops if the user is inactive.
   */
  it("returns false if user is not active", () => {
    // Assert: Verify `false` is returned when `isUserActive` is false.
    expect(calculateRefetchInterval(false, false, 5000)).toBe(false);
  });

  /**
   * Test case to verify the default polling interval is returned when active and error-free.
   */
  it("returns pollInterval if no error and user is active", () => {
    // Assert: Verify the provided `pollInterval` is returned under healthy conditions.
    expect(calculateRefetchInterval(false, true, 5000)).toBe(5000);
  });
});

/**
 * Test suite for the utility calculating backoff delays on failure.
 */
describe("calculateRetryDelay", () => {
  /**
   * Test case to verify that retries follow an exponential increase.
   */
  it("calculates exponential backoff", () => {
    // Assert: Verify increasing delays for the first three attempts.
    expect(calculateRetryDelay(0)).toBe(1000);
    expect(calculateRetryDelay(1)).toBe(2000);
    expect(calculateRetryDelay(2)).toBe(4000);
  });

  /**
   * Test case to ensure the retry delay is limited to 30 seconds.
   */
  it("caps delay at 30 seconds", () => {
    // Assert: Verify that a high retry count does not exceed the 30000ms cap.
    expect(calculateRetryDelay(10)).toBe(30000);
  });
});
