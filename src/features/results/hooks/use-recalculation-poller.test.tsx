import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRecalculationStatus } from "@/features/results/actions/get-recalculation-status";
import { useRecalculationPoller } from "@/features/results/hooks/use-recalculation-poller";

// Mock the server action responsible for fetching the current recalculation status.
vi.mock("@/features/results/actions/get-recalculation-status", () => ({
  getRecalculationStatus: vi.fn(),
}));

// Utility function to create a React Query provider wrapper for hook testing.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  Wrapper.displayName = "Wrapper";
  return Wrapper;
};

/**
 * Test suite for the `useRecalculationPoller` hook.
 */
describe("useRecalculationPoller", () => {
  // Mock function to track if the success callback is invoked.
  const mockOnSuccess = vi.fn();

  // Reset all mock call history before each test to maintain isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the polling query does not execute when disabled.
   */
  it("does not run query when enabled is false", () => {
    // Arrange: Initialize the hook with the `enabled` prop set to false.
    renderHook(
      () =>
        useRecalculationPoller({
          caseId: "case-123",
          enabled: false,
          onSuccess: mockOnSuccess,
        }),
      { wrapper: createWrapper() }
    );

    // Assert: Verify that the `getRecalculationStatus` action was never called.
    expect(getRecalculationStatus).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the polling query is skipped if no case identifier is provided.
   */
  it("does not run query when caseId is null", () => {
    // Arrange: Initialize the hook with a null `caseId`.
    renderHook(
      () =>
        useRecalculationPoller({
          caseId: null,
          enabled: true,
          onSuccess: mockOnSuccess,
        }),
      { wrapper: createWrapper() }
    );

    // Assert: Verify that the `getRecalculationStatus` action was never called.
    expect(getRecalculationStatus).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the polling query triggers when all requirements are met.
   */
  it("runs query when enabled is true and caseId is provided", async () => {
    // Arrange: Mock the status response and initialize the hook.
    vi.mocked(getRecalculationStatus).mockResolvedValue(true);

    renderHook(
      () =>
        useRecalculationPoller({
          caseId: "case-123",
          enabled: true,
          onSuccess: mockOnSuccess,
        }),
      { wrapper: createWrapper() }
    );

    // Assert: Check if the action was called with the correct `caseId`.
    await waitFor(() => {
      expect(getRecalculationStatus).toHaveBeenCalledWith("case-123");
    });
  });

  /**
   * Test case to verify that the success callback is triggered when the status indicates completion.
   */
  it("triggers onSuccess callback when recalculation status becomes false", async () => {
    // Arrange: Mock the status response to return false, indicating recalculation is finished.
    vi.mocked(getRecalculationStatus).mockResolvedValue(false);

    renderHook(
      () =>
        useRecalculationPoller({
          caseId: "case-123",
          enabled: true,
          onSuccess: mockOnSuccess,
        }),
      { wrapper: createWrapper() }
    );

    // Assert: Wait for the `onSuccess` mock function to be called by the hook logic.
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });

  /**
   * Test case to verify that the success callback is not called while recalculation is still active.
   */
  it("does not trigger onSuccess while recalculation status is true", async () => {
    // Arrange: Mock the status response to return true, indicating the process is still running.
    vi.mocked(getRecalculationStatus).mockResolvedValue(true);

    renderHook(
      () =>
        useRecalculationPoller({
          caseId: "case-123",
          enabled: true,
          onSuccess: mockOnSuccess,
        }),
      { wrapper: createWrapper() }
    );

    // Act: Wait for the initial query execution and simulate a passage of time.
    await waitFor(() => {
      expect(getRecalculationStatus).toHaveBeenCalled();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    // Assert: Verify that `onSuccess` has not been invoked because the status is still true.
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that toggling the enabled state allows the hook to restart its polling logic.
   */
  it("resets internal state when enabled toggles from false to true", async () => {
    // Arrange: Start the hook in a disabled state and mock a finished status response.
    const { rerender } = renderHook((props) => useRecalculationPoller(props), {
      wrapper: createWrapper(),
      initialProps: {
        caseId: "case-123",
        enabled: false,
        onSuccess: mockOnSuccess,
      },
    });

    vi.mocked(getRecalculationStatus).mockResolvedValue(false);

    // Act: Enable the hook and verify the first success trigger.
    rerender({
      caseId: "case-123",
      enabled: true,
      onSuccess: mockOnSuccess,
    });

    // Assert: Confirm the first callback execution.
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      },
      { timeout: 1000 }
    );

    // Act: Toggle the `enabled` prop to false and then back to true.
    rerender({
      caseId: "case-123",
      enabled: false,
      onSuccess: mockOnSuccess,
    });

    rerender({
      caseId: "case-123",
      enabled: true,
      onSuccess: mockOnSuccess,
    });

    // Assert: Confirm the internal state reset and second callback execution.
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(2);
      },
      { timeout: 1000 }
    );
  });

  /**
   * Test case to verify that changing the case identifier triggers a fresh polling cycle.
   */
  it("resets internal state when caseId changes", async () => {
    // Arrange: Mock a finished status response and render the hook with an initial ID.
    vi.mocked(getRecalculationStatus).mockResolvedValue(false);

    const { rerender } = renderHook((props) => useRecalculationPoller(props), {
      wrapper: createWrapper(),
      initialProps: {
        caseId: "case-1",
        enabled: true,
        onSuccess: mockOnSuccess,
      },
    });

    // Assert: Verify the first callback execution for the initial `caseId`.
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      },
      { timeout: 1000 }
    );

    // Act: Update the `caseId` prop to a different value.
    rerender({
      caseId: "case-2",
      enabled: true,
      onSuccess: mockOnSuccess,
    });

    // Assert: Verify that the hook treats the new ID as a separate process and triggers the callback again.
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(2);
      },
      { timeout: 1000 }
    );
  });
});
