import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type DateRange } from "react-day-picker";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { getCaseData } from "@/features/dashboard/actions/get-case-data";
import {
  calculateRefetchInterval,
  calculateRetryDelay,
  useCaseDataPoller,
} from "@/features/dashboard/hooks/use-case-data-poller";
import { type CaseData } from "@/features/dashboard/schemas/dashboard";
import { useDashboardStore } from "@/features/dashboard/store/dashboard-store";

// Mock the server action responsible for fetching case data.
vi.mock("@/features/dashboard/actions/get-case-data", () => ({
  getCaseData: vi.fn(),
}));

// Mock the dashboard store to control state like user activity and polling intervals.
vi.mock("@/features/dashboard/store/dashboard-store", () => ({
  useDashboardStore: vi.fn(),
}));

/**
 * Utility to create a React Query wrapper for testing hooks that use useQuery.
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

// Define mock functions for store actions.
const mockInitializeActivityListeners = vi.fn();
const mockResetToFastPolling = vi.fn();
const mockIncreasePollingInterval = vi.fn();

// Define a default mock state for the dashboard store.
const mockStoreState = {
  pollInterval: 5000,
  isUserActive: true,
  initializeActivityListeners: mockInitializeActivityListeners,
  resetToFastPolling: mockResetToFastPolling,
  increasePollingInterval: mockIncreasePollingInterval,
};

/**
 * Factory function to create mock case data objects with optional overrides.
 */
const createMockCase = (override: Partial<CaseData> = {}): CaseData => ({
  caseId: "case-1",
  caseName: "Case 1",
  caseDate: new Date().toISOString(),
  verificationStatus: "verified",
  pmiEstimation: "48 hours",
  oldestStage: "adult",
  averageConfidence: "95%",
  imageCount: 5,
  detectionCount: 10,
  location: {
    region: "Region I",
    province: "Province A",
    city: "City B",
    barangay: "Barangay C",
  },
  temperature: "25°C",
  ...override,
});

/**
 * Test suite for the useCaseDataPoller custom hook.
 */
describe("useCaseDataPoller", () => {
  // Reset mocks and provide default mock implementations before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    (useDashboardStore as unknown as Mock).mockImplementation((selector: unknown) => {
      if (typeof selector === "function") {
        return selector(mockStoreState);
      }
      return selector;
    });
    (getCaseData as unknown as Mock).mockResolvedValue([]);
  });

  /**
   * Test case to verify that the hook starts activity monitoring upon mounting.
   */
  it("initializes activity listeners on mount", () => {
    // Arrange: Define initial data for the hook.
    const initialData = [createMockCase()];

    // Act: Render the hook within the test wrapper.
    renderHook(() => useCaseDataPoller(initialData, undefined), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that store listeners were initialized.
    expect(mockInitializeActivityListeners).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to ensure the hook provides the initial data set while the first fetch is in progress.
   */
  it("returns initial data while loading", () => {
    // Arrange: Prepare initial data and mock a pending promise for the fetch action.
    const initialData = [createMockCase()];
    (getCaseData as unknown as Mock).mockImplementation(() => new Promise(() => {}));

    // Act: Render the hook.
    const { result } = renderHook(() => useCaseDataPoller(initialData, undefined), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the current data matches `initialData` and the fetching status is true.
    expect(result.current.data).toEqual(initialData);
    expect(result.current.isFetching).toBe(true);
  });

  /**
   * Test case to verify that date range parameters are correctly passed to the data fetcher.
   */
  it("calls getCaseData with correct date range", async () => {
    // Arrange: Define a specific date range.
    const initialData = [] as CaseData[];
    const dateRange = {
      from: new Date("2025-01-01"),
      to: new Date("2025-01-31"),
    };

    // Act: Render the hook with the defined `dateRange`.
    renderHook(() => useCaseDataPoller(initialData, dateRange), {
      wrapper: createWrapper(),
    });

    // Assert: Check if the server action was invoked with the correct `from` and `to` values.
    await waitFor(() => {
      expect(getCaseData).toHaveBeenCalledWith(dateRange.from, dateRange.to);
    });
  });

  /**
   * Test case to verify that polling slows down when the server returns data identical to the current state.
   */
  it("increases polling interval when data remains unchanged", async () => {
    // Arrange: Mock the server to return the same data as the initial set.
    const initialData = [createMockCase()];
    (getCaseData as unknown as Mock).mockResolvedValue(initialData);

    const { result, rerender } = renderHook(() => useCaseDataPoller(initialData, undefined), {
      wrapper: createWrapper(),
    });

    // Act: Wait for the fetch to complete and trigger a rerender.
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    rerender();

    // Assert: Verify that the store's `increasePollingInterval` action was triggered.
    await waitFor(() => {
      expect(mockIncreasePollingInterval).toHaveBeenCalled();
    });
    expect(mockResetToFastPolling).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that polling accelerates when new data is detected from the server.
   */
  it("resets to fast polling when data changes", async () => {
    // Arrange: Define an initial data set and a different second data set.
    const initialData = [createMockCase({ caseId: "case-1" })];
    const newData = [createMockCase({ caseId: "case-1" }), createMockCase({ caseId: "case-2" })];

    (getCaseData as unknown as Mock).mockResolvedValueOnce(initialData);

    const { result, rerender } = renderHook(({ data, range }) => useCaseDataPoller(data, range), {
      initialProps: { data: initialData, range: undefined as DateRange | undefined },
      wrapper: createWrapper(),
    });

    // Act: Wait for the first fetch and then mock new data for the subsequent fetch.
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    (getCaseData as unknown as Mock).mockResolvedValueOnce(newData);

    rerender({
      data: initialData,
      range: { from: new Date("2025-01-01"), to: new Date("2025-01-02") },
    });

    // Assert: Verify that the store's `resetToFastPolling` action was triggered due to the data change.
    await waitFor(() => {
      expect(mockResetToFastPolling).toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify that polling logic remains static when the user is marked as inactive.
   */
  it("does not adjust polling when user is inactive", async () => {
    // Arrange: Override the store mock to set `isUserActive` to false.
    (useDashboardStore as unknown as Mock).mockImplementation((selector: unknown) => {
      if (typeof selector === "function") {
        return selector({ ...mockStoreState, isUserActive: false });
      }
      return selector;
    });

    const initialData = [createMockCase({ caseId: "case-1" })];
    const newData = [createMockCase({ caseId: "case-1" }), createMockCase({ caseId: "case-2" })];

    (getCaseData as unknown as Mock).mockResolvedValueOnce(initialData);

    const { result, rerender } = renderHook(({ data, range }) => useCaseDataPoller(data, range), {
      initialProps: { data: initialData, range: undefined as DateRange | undefined },
      wrapper: createWrapper(),
    });

    // Act: Execute fetches while the user is inactive.
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    (getCaseData as unknown as Mock).mockResolvedValueOnce(newData);

    rerender({
      data: initialData,
      range: { from: new Date("2025-01-01"), to: new Date("2025-01-02") },
    });

    // Assert: Verify that the polling frequency was not reset despite the new data.
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(mockResetToFastPolling).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure the hook correctly exposes polling metadata from the store.
   */
  it("returns polling state from store", () => {
    // Arrange: Initialize the hook.
    const initialData = [] as CaseData[];
    const { result } = renderHook(() => useCaseDataPoller(initialData, undefined), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that store values for `pollInterval` and `isUserActive` are returned.
    expect(result.current.pollInterval).toBe(5000);
    expect(result.current.isUserActive).toBe(true);
  });
});

/**
 * Test suite for the helper function that determines the refetch frequency.
 */
describe("calculateRefetchInterval", () => {
  /**
   * Test case to verify that polling is disabled during an error state.
   */
  it("returns false if there is an error", () => {
    // Assert: Verify that an error presence results in a `false` interval.
    expect(calculateRefetchInterval(true, true, 5000)).toBe(false);
  });

  /**
   * Test case to verify that polling is disabled when the user is idle.
   */
  it("returns false if user is not active", () => {
    // Assert: Verify that `isUserActive` being false results in a `false` interval.
    expect(calculateRefetchInterval(false, false, 5000)).toBe(false);
  });

  /**
   * Test case to verify that the base polling interval is returned under normal active conditions.
   */
  it("returns pollInterval if no error and user is active", () => {
    // Assert: Verify that the `pollInterval` value is returned when conditions are optimal.
    expect(calculateRefetchInterval(false, true, 5000)).toBe(5000);
  });
});

/**
 * Test suite for the retry delay calculation utility.
 */
describe("calculateRetryDelay", () => {
  /**
   * Test case to verify the exponential backoff timing increments.
   */
  it("calculates exponential backoff", () => {
    // Assert: Verify that subsequent retry attempts result in doubled delays.
    expect(calculateRetryDelay(0)).toBe(1000);
    expect(calculateRetryDelay(1)).toBe(2000);
    expect(calculateRetryDelay(2)).toBe(4000);
  });

  /**
   * Test case to ensure that the retry delay does not exceed a 30-second limit.
   */
  it("caps delay at 30 seconds", () => {
    // Assert: Verify that high retry counts do not produce excessively long delays.
    expect(calculateRetryDelay(10)).toBe(30000);
  });
});
