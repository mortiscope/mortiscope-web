import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { type DateRange } from "react-day-picker";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { getVerificationStatus } from "@/features/dashboard/actions/get-verification-status";
import {
  calculateRefetchInterval,
  calculateRetryDelay,
  useVerificationStatusPoller,
} from "@/features/dashboard/hooks/use-verification-status-poller";
import { useDashboardStore } from "@/features/dashboard/store/dashboard-store";

// Mock the server action responsible for retrieving verification metrics for cases, images, and detections.
vi.mock("@/features/dashboard/actions/get-verification-status", () => ({
  getVerificationStatus: vi.fn(),
}));

// Mock the dashboard store to simulate different polling intervals and user activity states.
vi.mock("@/features/dashboard/store/dashboard-store", () => ({
  useDashboardStore: vi.fn(),
}));

/**
 * Utility to create a wrapper component that provides a `QueryClient` context for testing hooks.
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

// Define mock functions to track calls to store actions.
const mockResetToFastPolling = vi.fn();
const mockIncreasePollingInterval = vi.fn();

// Define a standard initial state for the dashboard store mock.
const mockStoreState = {
  pollInterval: 5000,
  isUserActive: true,
  resetToFastPolling: mockResetToFastPolling,
  increasePollingInterval: mockIncreasePollingInterval,
};

/**
 * Test suite for the `useVerificationStatusPoller` hook.
 */
describe("useVerificationStatusPoller", () => {
  // Define default structure for verification metrics data.
  const defaultMockData = {
    caseVerification: { verified: 0, unverified: 0, inProgress: 0 },
    imageVerification: { verified: 0, unverified: 0, inProgress: 0 },
    detectionVerification: { verified: 0, unverified: 0 },
  };

  // Reset all mocks and provide default implementations before each test case.
  beforeEach(() => {
    vi.clearAllMocks();
    (getVerificationStatus as unknown as Mock).mockResolvedValue(defaultMockData);
    (useDashboardStore as unknown as Mock).mockImplementation((selector: unknown) => {
      if (typeof selector === "function") {
        return selector(mockStoreState);
      }
      return selector;
    });
  });

  /**
   * Test case to verify that the hook successfully fetches and returns verification data.
   */
  it("fetches data successfully using getVerificationStatus", async () => {
    // Arrange: Define a specific set of verification metrics.
    const mockData = {
      caseVerification: { verified: 1, unverified: 0, inProgress: 0 },
      imageVerification: { verified: 2, unverified: 0, inProgress: 0 },
      detectionVerification: { verified: 5, unverified: 0 },
    };

    vi.mocked(getVerificationStatus).mockResolvedValue(mockData);

    // Act: Render the poller hook within the query wrapper.
    const { result } = renderHook(() => useVerificationStatusPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that the hook state eventually reflects the fetched metrics.
    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockData);
    });
  });

  /**
   * Test case to ensure the hook passes the date range prop to the server action correctly.
   */
  it("passes date range correctly to the server action", async () => {
    // Arrange: Define a specific date range object.
    const dateRange = {
      from: new Date("2025-01-01"),
      to: new Date("2025-01-31"),
    };

    // Act: Render the hook with the defined `dateRange`.
    renderHook(() => useVerificationStatusPoller({ dateRange }), {
      wrapper: createWrapper(),
    });

    // Assert: Check if the server action was called with the corresponding `from` and `to` values.
    await waitFor(() => {
      expect(getVerificationStatus).toHaveBeenCalledWith(dateRange.from, dateRange.to);
    });
  });

  /**
   * Test case to verify the loading state and initial null value of the metrics.
   */
  it("returns null metrics initially while loading", async () => {
    // Arrange: Mock the server action with a promise that does not resolve immediately.
    vi.mocked(getVerificationStatus).mockImplementation(() => new Promise(() => {}));

    // Act: Render the hook.
    const { result } = renderHook(() => useVerificationStatusPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Ensure `metrics` is null and `isFetching` flag is true during the pending state.
    expect(result.current.metrics).toBeNull();
    expect(result.current.isFetching).toBe(true);
  });

  /**
   * Test case to verify that polling slows down when the fetched data matches the existing state.
   */
  it("increases polling interval when data remains unchanged", async () => {
    // Arrange: Define static data to be returned by sequential server calls.
    const mockData = {
      caseVerification: { verified: 1, unverified: 0, inProgress: 0 },
      imageVerification: { verified: 2, unverified: 0, inProgress: 0 },
      detectionVerification: { verified: 5, unverified: 0 },
    };

    (getVerificationStatus as unknown as Mock).mockResolvedValueOnce(mockData);

    const { result, rerender } = renderHook(
      ({ dateRange }) => useVerificationStatusPoller({ dateRange }),
      {
        initialProps: { dateRange: undefined as DateRange | undefined },
        wrapper: createWrapper(),
      }
    );

    // Act: Wait for the first fetch to complete and then trigger a rerender for the next fetch.
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    (getVerificationStatus as unknown as Mock).mockResolvedValueOnce(mockData);

    rerender({
      dateRange: { from: new Date("2025-01-01"), to: new Date("2025-01-02") },
    });

    // Assert: Verify that the `increasePollingInterval` store action was invoked.
    await waitFor(() => {
      expect(mockIncreasePollingInterval).toHaveBeenCalled();
    });
    expect(mockResetToFastPolling).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that polling resets to the fast rate when the server returns updated data.
   */
  it("resets to fast polling when data changes", async () => {
    // Arrange: Define initial and updated data objects.
    const initialData = { caseVerification: { verified: 1 } };
    const newData = { caseVerification: { verified: 2 } };

    (getVerificationStatus as unknown as Mock).mockResolvedValueOnce(initialData);

    const { result, rerender } = renderHook(
      ({ dateRange }) => useVerificationStatusPoller({ dateRange }),
      {
        initialProps: { dateRange: undefined as DateRange | undefined },
        wrapper: createWrapper(),
      }
    );

    // Act: Complete the first fetch and then trigger a second fetch with the updated data.
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    (getVerificationStatus as unknown as Mock).mockResolvedValueOnce(newData);

    rerender({
      dateRange: { from: new Date("2025-01-01"), to: new Date("2025-01-02") },
    });

    // Assert: Verify that the `resetToFastPolling` store action was invoked due to the data delta.
    await waitFor(() => {
      expect(mockResetToFastPolling).toHaveBeenCalled();
    });
  });

  /**
   * Test case to ensure the hook correctly exposes state from the dashboard store.
   */
  it("exposes polling state and user activity from the store", () => {
    // Act: Render the hook.
    const { result } = renderHook(() => useVerificationStatusPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that store values for `pollInterval` and `isUserActive` are accessible.
    expect(result.current.pollInterval).toBe(5000);
    expect(result.current.isUserActive).toBe(true);
  });

  /**
   * Test case to verify that server-side errors are captured by the hook.
   */
  it("handles errors gracefully", async () => {
    // Arrange: Mock a rejection from the server action.
    const error = new Error("Fetch failed");
    vi.mocked(getVerificationStatus).mockRejectedValue(error);

    // Act: Render the hook.
    const { result } = renderHook(() => useVerificationStatusPoller({ dateRange: undefined }), {
      wrapper: createWrapper(),
    });

    // Assert: Ensure the `error` object returned by the hook is defined.
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});

/**
 * Test suite for the helper function that calculates the query refetch interval.
 */
describe("calculateRefetchInterval", () => {
  /**
   * Test case to verify that polling is disabled if an error occurs.
   */
  it("returns false if there is an error", () => {
    // Assert: Verify that the interval is `false` when `isError` is true.
    expect(calculateRefetchInterval(true, true, 5000)).toBe(false);
  });

  /**
   * Test case to verify that polling is disabled when the user is not active.
   */
  it("returns false if user is not active", () => {
    // Assert: Verify that the interval is `false` when `isUserActive` is false.
    expect(calculateRefetchInterval(false, false, 5000)).toBe(false);
  });

  /**
   * Test case to verify that the standard interval is used when conditions are optimal.
   */
  it("returns pollInterval if no error and user is active", () => {
    // Assert: Verify that the `pollInterval` value is returned when there are no errors and the user is active.
    expect(calculateRefetchInterval(false, true, 5000)).toBe(5000);
  });
});

/**
 * Test suite for the helper function that calculates retry delays for failed queries.
 */
describe("calculateRetryDelay", () => {
  /**
   * Test case to verify the exponential backoff calculation logic.
   */
  it("calculates exponential backoff", () => {
    // Assert: Verify that the delay doubles for each subsequent retry attempt.
    expect(calculateRetryDelay(0)).toBe(1000);
    expect(calculateRetryDelay(1)).toBe(2000);
    expect(calculateRetryDelay(2)).toBe(4000);
  });

  /**
   * Test case to verify that the retry delay is capped at 30 seconds.
   */
  it("caps delay at 30 seconds", () => {
    // Assert: Ensure that high retry counts do not exceed the 30000ms limit.
    expect(calculateRetryDelay(10)).toBe(30000);
  });
});
