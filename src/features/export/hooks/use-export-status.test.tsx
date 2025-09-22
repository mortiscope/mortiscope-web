import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { getExportStatus } from "@/features/export/actions/get-export-status";
import { useExportStatus } from "@/features/export/hooks/use-export-status";

// Mock the server action for retrieving export status.
vi.mock("@/features/export/actions/get-export-status", () => ({
  getExportStatus: vi.fn(),
}));

// Mock the toast notification library.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper function to create a wrapper with a configured QueryClient.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

/**
 * Test suite for the useExportStatus hook.
 */
describe("useExportStatus", () => {
  const mockOnClose = vi.fn();
  const originalLocation = window.location;

  // Reset mocks and setup window.location before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, href: "" },
    });
  });

  // Restore original window.location after each test.
  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  /**
   * Test case to verify that the hook returns false and skips querying when exportId is null.
   */
  it("returns false and does not query when exportId is null", () => {
    // Arrange: Render the hook with a null exportId.
    const { result } = renderHook(() => useExportStatus({ exportId: null, onClose: mockOnClose }), {
      wrapper: createWrapper(),
    });

    // Assert: Check that the hook returns false and the API was not called.
    expect(result.current).toBe(false);
    expect(getExportStatus).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the hook returns true and starts polling when a valid exportId is provided.
   */
  it("returns true and polls when exportId is provided", async () => {
    // Arrange: Mock the API to return a processing status.
    vi.mocked(getExportStatus).mockResolvedValue({ status: "processing" });

    // Act: Render the hook with a valid exportId.
    const { result } = renderHook(
      () => useExportStatus({ exportId: "export-123", onClose: mockOnClose }),
      { wrapper: createWrapper() }
    );

    // Assert: Check that the hook indicates loading state.
    expect(result.current).toBe(true);

    // Assert: Verify that the API was called with the correct ID.
    await waitFor(() => {
      expect(getExportStatus).toHaveBeenCalledWith({ exportId: "export-123" });
    });
  });

  /**
   * Test case to verify behavior upon successful export completion (toast, redirect, callback).
   */
  it("handles successful export completion", async () => {
    // Arrange: Mock the API to return a completed status with a download URL.
    const mockDownloadUrl = "https://example.com/download.pdf";
    vi.mocked(getExportStatus).mockResolvedValue({
      status: "completed",
      url: mockDownloadUrl,
    });

    // Act: Render the hook.
    renderHook(() => useExportStatus({ exportId: "export-123", onClose: mockOnClose }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that a success toast is displayed.
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Export ready! Download will begin.");
    });

    // Assert: Check that the window location was updated and onClose was called.
    expect(window.location.href).toBe(mockDownloadUrl);
    expect(mockOnClose).toHaveBeenCalled();
  });

  /**
   * Test case to verify error handling when the export process fails.
   */
  it("handles failed export", async () => {
    // Arrange: Mock the API to return a failed status with a reason.
    const mockFailureReason = "Server timeout";
    vi.mocked(getExportStatus).mockResolvedValue({
      status: "failed",
      failureReason: mockFailureReason,
    });

    // Act: Render the hook.
    renderHook(() => useExportStatus({ exportId: "export-123", onClose: mockOnClose }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify that an error toast is displayed with the failure reason.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Export failed during processing.", {
        description: mockFailureReason,
      });
    });

    // Assert: Check that onClose was called and no redirect occurred.
    expect(mockOnClose).toHaveBeenCalled();
    // Ensure download was not triggered
    expect(window.location.href).toBe("");
  });

  /**
   * Test case to verify that no action is taken if the status is completed but the URL is missing.
   */
  it("does nothing if status is completed but URL is missing", async () => {
    // Arrange: Mock the API to return completed status without a URL.
    vi.mocked(getExportStatus).mockResolvedValue({
      status: "completed",
      // url is missing
    });

    // Act: Render the hook.
    renderHook(() => useExportStatus({ exportId: "export-123", onClose: mockOnClose }), {
      wrapper: createWrapper(),
    });

    // Assert: Verify the API was polled.
    await waitFor(() => {
      expect(getExportStatus).toHaveBeenCalled();
    });

    // Assert: Ensure no toasts or callbacks were triggered due to missing data.
    expect(toast.success).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
