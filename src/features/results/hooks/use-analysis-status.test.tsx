import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { getAnalysisStatus } from "@/features/results/actions/get-analysis-status";
import { getCaseName } from "@/features/results/actions/get-case-name";
import { useAnalysisStatus } from "@/features/results/hooks/use-analysis-status";

// Mock the server action for retrieving analysis status.
vi.mock("@/features/results/actions/get-analysis-status", () => ({
  getAnalysisStatus: vi.fn(),
}));

// Mock the server action for retrieving the human-readable case name.
vi.mock("@/features/results/actions/get-case-name", () => ({
  getCaseName: vi.fn(),
}));

// Mock the toast notification system to verify user feedback.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Helper function to create a React Query wrapper for hook testing.
 */
const createWrapper = (client?: QueryClient) => {
  const queryClient =
    client ||
    new QueryClient({
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
 * Test suite for the useAnalysisStatus custom hook.
 */
describe("useAnalysisStatus", () => {
  // Mock the Next.js router for redirection testing.
  const mockRouter = {
    push: vi.fn(),
  };

  // Set up the router mock before each test.
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
  });

  // Clean up mocks and reset timers after each test execution.
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  /**
   * Test case to verify that polling does not occur if explicitly disabled via props.
   */
  it("does not poll when isEnabled is false", () => {
    // Arrange: Render the hook with `isEnabled` set to false.
    renderHook(() => useAnalysisStatus({ caseId: "case-123", isEnabled: false }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that the status fetching action was never called.
    expect(getAnalysisStatus).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the hook handles missing case identifiers gracefully.
   */
  it("returns undefined status if caseId is missing", () => {
    // Arrange: Render the hook with a null `caseId`.
    const { result } = renderHook(() => useAnalysisStatus({ caseId: null, isEnabled: true }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the status remains undefined and no database query is made.
    expect(result.current.status).toBeUndefined();
    expect(getAnalysisStatus).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that status polling begins when conditions are met.
   */
  it("polls status when enabled and caseId is present", async () => {
    // Arrange: Mock a processing status return value.
    vi.mocked(getAnalysisStatus).mockResolvedValue("processing");

    // Act: Render the hook with active polling.
    const { result } = renderHook(
      () => useAnalysisStatus({ caseId: "case-123", isEnabled: true }),
      { wrapper: createWrapper() }
    );

    // Assert: Verify the hook eventually reflects the processing state.
    await waitFor(() => {
      expect(result.current.status).toBe("processing");
    });

    expect(getAnalysisStatus).toHaveBeenCalledWith("case-123");
  });

  /**
   * Test case to verify completion logic, including case name retrieval and success notification.
   */
  it("handles completed status correctly with successful case name fetch", async () => {
    // Arrange: Mock successful analysis and case name retrieval.
    vi.mocked(getAnalysisStatus).mockResolvedValue("completed");
    vi.mocked(getCaseName).mockResolvedValue("Mortiscope Case 1");

    // Act: Render the hook.
    const { result } = renderHook(
      () => useAnalysisStatus({ caseId: "case-123", isEnabled: true }),
      { wrapper: createWrapper() }
    );

    // Assert: Verify the status updates and the specific success toast is shown.
    await waitFor(() => {
      expect(result.current.status).toBe("completed");
    });

    await waitFor(() => {
      expect(getCaseName).toHaveBeenCalledWith("case-123");
      expect(toast.success).toHaveBeenCalledWith("Mortiscope Case 1 analysis complete!");
    });

    // Act: Wait for the internal navigation delay.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Assert: Verify the user is redirected to the results page.
    expect(mockRouter.push).toHaveBeenCalledWith("/results/case-123");
  });

  /**
   * Test case to verify that completion still redirects if the case name cannot be fetched.
   */
  it("handles completed status correctly when case name fetch fails", async () => {
    // Arrange: Mock successful analysis but a failed case name fetch.
    vi.mocked(getAnalysisStatus).mockResolvedValue("completed");
    vi.mocked(getCaseName).mockRejectedValue(new Error("Fetch failed"));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act: Render the hook.
    const { result } = renderHook(
      () => useAnalysisStatus({ caseId: "case-123", isEnabled: true }),
      { wrapper: createWrapper() }
    );

    // Assert: Verify the status updates and a generic success toast is shown.
    await waitFor(() => {
      expect(result.current.status).toBe("completed");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Case analysis complete!");
    });

    // Act: Wait for the navigation timeout.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Assert: Verify redirection occurs despite the naming error.
    expect(mockRouter.push).toHaveBeenCalledWith("/results/case-123");
    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify error feedback when an analysis fails.
   */
  it("handles failed status correctly", async () => {
    // Arrange: Mock a failed analysis status.
    vi.mocked(getAnalysisStatus).mockResolvedValue("failed");

    // Act: Render the hook.
    const { result } = renderHook(
      () => useAnalysisStatus({ caseId: "case-123", isEnabled: true }),
      { wrapper: createWrapper() }
    );

    // Assert: Verify the status updates and an error toast is displayed.
    await waitFor(() => {
      expect(result.current.status).toBe("failed");
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Analysis failed. Please contact support or try again."
    );

    // Assert: Ensure no redirection occurs on failure.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that network or server errors during polling are reported via toast.
   */
  it("handles query errors gracefully", async () => {
    // Arrange: Mock a rejected promise from the status action.
    vi.mocked(getAnalysisStatus).mockRejectedValue(new Error("Network error"));

    // Act: Render the hook.
    renderHook(() => useAnalysisStatus({ caseId: "case-123", isEnabled: true }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that the error is intercepted and shown to the user.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "An error occurred while checking status: Network error"
      );
    });
  });

  /**
   * Test case to verify manual refetch behavior when a case identifier is missing.
   */
  it("returns 'not_found' when manually refetching without a caseId", async () => {
    // Arrange: Render hook with polling disabled and no ID.
    const { result } = renderHook(() => useAnalysisStatus({ caseId: null, isEnabled: false }), {
      wrapper: createWrapper(),
    });

    // Act: Manually trigger the `refetch` function.
    const refetchResult = await result.current.refetch();

    // Assert: Verify the custom "not_found" result is returned.
    expect(refetchResult.data).toBe("not_found");
    expect(getAnalysisStatus).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify completion logic when the hook state changes but the cache already contains completion data.
   */
  it("handles completed status correctly when caseId becomes null", async () => {
    // Arrange: Pre-populate the query cache with completion status for a null ID.
    const queryClient = new QueryClient();
    queryClient.setQueryData(["analysisStatus", null], "completed");

    const { result } = renderHook(() => useAnalysisStatus({ caseId: null, isEnabled: true }), {
      wrapper: createWrapper(queryClient),
    });

    // Assert: Verify status reflects the cache and triggers a generic success toast.
    expect(result.current.status).toBe("completed");

    await waitFor(() => {
      expect(getCaseName).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Case analysis complete!");
    });

    // Act: Wait for the navigation timeout.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(mockRouter.push).toHaveBeenCalledWith("/results/null");
  });

  /**
   * Test case to verify fallback naming when the naming action explicitly returns null.
   */
  it("defaults to 'Case' name if fetch returns null", async () => {
    // Arrange: Mock completion and a null return for the case name.
    vi.mocked(getAnalysisStatus).mockResolvedValue("completed");
    vi.mocked(getCaseName).mockResolvedValue(null);

    // Act: Render the hook.
    const { result } = renderHook(
      () => useAnalysisStatus({ caseId: "case-123", isEnabled: true }),
      { wrapper: createWrapper() }
    );

    // Assert: Verify that the fallback "Case" string is used in the success message.
    await waitFor(() => {
      expect(result.current.status).toBe("completed");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Case analysis complete!");
    });

    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(mockRouter.push).toHaveBeenCalledWith("/results/case-123");
  });
});
