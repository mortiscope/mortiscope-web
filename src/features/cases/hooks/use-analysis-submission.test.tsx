import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { cancelAnalysis } from "@/features/analyze/actions/cancel-analysis";
import { submitAnalysis } from "@/features/analyze/actions/submit-analysis";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useAnalysisSubmission } from "@/features/cases/hooks/use-analysis-submission";

// Mock the server action responsible for submitting the analysis request.
vi.mock("@/features/analyze/actions/submit-analysis", () => ({
  submitAnalysis: vi.fn(),
}));

// Mock the server action responsible for cancelling the analysis request.
vi.mock("@/features/analyze/actions/cancel-analysis", () => ({
  cancelAnalysis: vi.fn(),
}));

// Mock the Zustand store hook used to access global analysis state and controls.
vi.mock("@/features/analyze/store/analyze-store", () => ({
  useAnalyzeStore: vi.fn(),
}));

// Mock the `sonner` library to spy on toast notification calls.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Utility function to create a wrapper component for React Query setup.
const createWrapper = () => {
  // Arrange: Initialize a new `QueryClient` for each test wrapper.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  // Arrange: Define the wrapper component that provides the `QueryClientProvider`.
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "QueryClientWrapper";
  return Wrapper;
};

/**
 * Test suite for the `useAnalysisSubmission` custom hook.
 */
describe("useAnalysisSubmission", () => {
  // Mock functions used to control the state in the `useAnalyzeStore`.
  const startProcessingMock = vi.fn();
  const cancelProcessingMock = vi.fn();

  // Setup for mocking the global state and clearing mocks before each test.
  beforeEach(() => {
    // Arrange: Clear execution history of all spies and mocks.
    vi.clearAllMocks();

    // Arrange: Mock the `useAnalyzeStore` to return controlled state manipulation functions.
    vi.mocked(useAnalyzeStore).mockImplementation((selector: unknown) => {
      const mockState = {
        startProcessing: startProcessingMock,
        cancelProcessing: cancelProcessingMock,
      };
      return (selector as (s: typeof mockState) => unknown)(mockState);
    });
  });

  /**
   * Test suite for the `submit()` function.
   */
  describe("submit()", () => {
    /**
     * Test case to verify that an error toast is shown if the required `caseId` is null.
     */
    it("toasts error if caseId is missing", () => {
      // Arrange: Render the hook with a null `caseId`.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: null }), {
        wrapper: createWrapper(),
      });

      // Act: Call the submission function.
      result.current.submit();

      // Assert: Check that an error toast containing the specific message was called.
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Could not find case ID"));
      // Assert: Verify that the server action was not executed.
      expect(submitAnalysis).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that the `submitAnalysis` server action is called with the correct `caseId`.
     */
    it("calls submitAnalysis mutation with caseId", async () => {
      // Arrange: Mock the server action to resolve successfully.
      vi.mocked(submitAnalysis).mockResolvedValue({ success: true });
      // Arrange: Render the hook with a valid `caseId`.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the submission.
      result.current.submit();

      // Assert: Wait for the mutation to finish and check if `submitAnalysis` was called with the correct payload.
      await waitFor(() => {
        expect(submitAnalysis).toHaveBeenCalledWith({ caseId: "case-123" });
      });
    });

    /**
     * Test case to verify that `startProcessing()` from the global store is called upon successful server action.
     */
    it("calls startProcessing() on success", async () => {
      // Arrange: Mock the server action to resolve successfully.
      vi.mocked(submitAnalysis).mockResolvedValue({ success: true });
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the submission.
      result.current.submit();

      // Assert: Wait for the success callback and check if the state function was called.
      await waitFor(() => {
        expect(startProcessingMock).toHaveBeenCalled();
      });
    });

    /**
     * Test case to verify that an error toast is shown and processing state is not started if the server action indicates failure.
     */
    it("toasts error on server failure (success: false)", async () => {
      // Arrange: Mock the server action to resolve with an error message.
      vi.mocked(submitAnalysis).mockResolvedValue({ success: false, error: "Server says no" });
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the submission.
      result.current.submit();

      // Assert: Wait for the failure callback, verify the error toast, and confirm `startProcessing` was skipped.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Server says no");
        expect(startProcessingMock).not.toHaveBeenCalled();
      });
    });

    /**
     * Test case to verify that a generic error toast is shown if the mutation promise rejects due to an exception.
     */
    it("toasts error on mutation exception", async () => {
      // Arrange: Mock the server action to reject with an error.
      vi.mocked(submitAnalysis).mockRejectedValue(new Error("Network Error"));
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the submission.
      result.current.submit();

      // Assert: Wait for the rejection and check that a generic error toast was called.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("An unexpected error occurred")
        );
      });
    });
  });

  /**
   * Test suite for the `cancel()` function.
   */
  describe("cancel()", () => {
    /**
     * Test case to verify that an error toast is shown if the required `caseId` is null for cancellation.
     */
    it("toasts error if caseId is missing", () => {
      // Arrange: Render the hook with a null `caseId`.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: null }), {
        wrapper: createWrapper(),
      });

      // Act: Call the cancellation function.
      result.current.cancel();

      // Assert: Check that an error toast containing the specific message was called.
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Case ID is missing"));
      // Assert: Verify that the server action was not executed.
      expect(cancelAnalysis).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that the `cancelAnalysis` server action is called with the correct `caseId`.
     */
    it("calls cancelAnalysis mutation with caseId", async () => {
      // Arrange: Mock the server action to resolve successfully.
      vi.mocked(cancelAnalysis).mockResolvedValue({ status: "success", message: "Cancelled" });
      // Arrange: Render the hook with a valid `caseId`.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the cancellation.
      result.current.cancel();

      // Assert: Wait for the mutation to finish and check if `cancelAnalysis` was called with the correct payload.
      await waitFor(() => {
        expect(cancelAnalysis).toHaveBeenCalledWith({ caseId: "case-123" });
      });
    });

    /**
     * Test case to verify that `cancelProcessing()` from the global store is called upon successful server action.
     */
    it("calls cancelProcessing() on success", async () => {
      // Arrange: Mock the server action to resolve successfully and provide a message.
      vi.mocked(cancelAnalysis).mockResolvedValue({ status: "success", message: "Cancelled" });
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the cancellation.
      result.current.cancel();

      // Assert: Wait for the success callback and check if the state function was called and a success toast was shown.
      await waitFor(() => {
        expect(cancelProcessingMock).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Cancelled");
      });
    });

    /**
     * Test case to verify that an error toast is shown and processing state is not changed if the server action indicates cancellation failure.
     */
    it("toasts error on server failure", async () => {
      // Arrange: Mock the server action to resolve with an error status and message.
      vi.mocked(cancelAnalysis).mockResolvedValue({ status: "error", message: "Failed to cancel" });
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the cancellation.
      result.current.cancel();

      // Assert: Wait for the failure, verify the error toast, and confirm `cancelProcessing` was skipped.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to cancel");
        expect(cancelProcessingMock).not.toHaveBeenCalled();
      });
    });

    /**
     * Test case to verify that a generic error toast is shown if the cancellation mutation promise rejects due to an exception.
     */
    it("toasts error on mutation exception", async () => {
      // Arrange: Mock the server action to reject with an error.
      vi.mocked(cancelAnalysis).mockRejectedValue(new Error("Network Cancel Error"));
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the cancellation.
      result.current.cancel();

      // Assert: Wait for the rejection and check that a generic cancellation error toast was called.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("An unexpected error occurred while cancelling")
        );
      });
    });
  });

  /**
   * Test suite for development-specific logging behavior.
   */
  describe("Development Logging", () => {
    // Setup to enable development environment and mock console errors.
    beforeEach(() => {
      // Arrange: Stub the environment variable to simulate a development environment.
      vi.stubEnv("NODE_ENV", "development");
      // Arrange: Spy on `console.error` to track calls without outputting to the test console.
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    // Teardown to restore original environment and mocks.
    afterEach(() => {
      // Arrange: Restore the original environment variables.
      vi.unstubAllEnvs();
      // Arrange: Restore all mock implementations.
      vi.restoreAllMocks();
    });

    /**
     * Test case to verify that the submission error is logged to the console in development mode.
     */
    it("logs duplicate submission error to console in development", async () => {
      // Arrange: Mock the server action to reject with an error.
      vi.mocked(submitAnalysis).mockRejectedValue(new Error("Network Error"));
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the submission.
      result.current.submit();

      // Assert: Wait for the error to propagate and check if `console.error` was called with the descriptive message.
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Submission error:", expect.any(Error));
      });
    });

    /**
     * Test case to verify that the cancellation error is logged to the console in development mode.
     */
    it("logs duplicate cancellation error to console in development", async () => {
      // Arrange: Mock the server action to reject with an error.
      vi.mocked(cancelAnalysis).mockRejectedValue(new Error("Network Cancel Error"));
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalysisSubmission({ caseId: "case-123" }), {
        wrapper: createWrapper(),
      });

      // Act: Execute the cancellation.
      result.current.cancel();

      // Assert: Wait for the error to propagate and check if `console.error` was called with the descriptive message.
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Cancellation error:", expect.any(Error));
      });
    });
  });
});
