import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { getRecentExports } from "@/features/export/actions/get-recent-exports";
import { useExportPoller } from "@/features/export/hooks/use-export-poller";

// Mock the server action to return controlled export data.
vi.mock("@/features/export/actions/get-recent-exports", () => ({
  getRecentExports: vi.fn(),
}));

// Mock the toast library to verify notifications without UI rendering.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  loader: vi.fn(),
}));

type ToastOptions = {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type RecentExport = {
  id: string;
  status: string;
  url?: string;
  failureReason?: string | null;
};

// Helper function to create a React Query wrapper with specific test settings.
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
 * Test suite for the `useExportPoller` hook.
 */
describe("useExportPoller", () => {
  const originalLocation = window.location;

  // Setup: Mock window.location to allow modification during tests.
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, href: "" },
    });
  });

  // Teardown: Restore original window.location after tests.
  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  /**
   * Test case to verify that no toasts are triggered for pending or processing exports.
   */
  it("does not trigger toasts for pending or processing exports", async () => {
    // Arrange: Mock the API to return unfinished exports.
    vi.mocked(getRecentExports).mockResolvedValue([
      { id: "1", status: "pending" },
      { id: "2", status: "processing" },
    ]);

    // Act: Render the hook.
    renderHook(() => useExportPoller(), { wrapper: createWrapper() });

    // Assert: Wait for the API call and verify no toasts were shown.
    await waitFor(() => {
      expect(getRecentExports).toHaveBeenCalled();
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that success toast and download logic are triggered for completed exports.
   */
  it("triggers toast and download for completed exports", async () => {
    // Arrange: Mock the API to return a completed export with a URL.
    const mockUrl = "https://example.com/download.pdf";
    vi.mocked(getRecentExports).mockResolvedValue([{ id: "3", status: "completed", url: mockUrl }]);

    // Act: Render the hook.
    renderHook(() => useExportPoller(), { wrapper: createWrapper() });

    // Assert: Verify success toast is called.
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Export ready!", expect.any(Object));
    });

    // Assert: Verify window location is updated to the download URL.
    expect(window.location.href).toBe(mockUrl);

    // Assert: Verify toast action button behavior.
    const toastCall = vi.mocked(toast.success).mock.calls[0];
    const toastOptions = toastCall[1] as ToastOptions;
    expect(toastOptions?.description).toBe("Your download will begin automatically.");
    expect(toastOptions?.action?.label).toBe("Download");

    // Act: Manually trigger the toast action click.
    window.location.href = "";
    toastOptions?.action?.onClick();

    // Assert: Verify download is triggered again on click.
    expect(window.location.href).toBe(mockUrl);
  });

  /**
   * Test case to verify that an error toast is triggered for failed exports with a reason.
   */
  it("triggers error toast for failed exports", async () => {
    // Arrange: Mock the API to return a failed export with a specific reason.
    const failureReason = "Database timeout";
    vi.mocked(getRecentExports).mockResolvedValue([{ id: "4", status: "failed", failureReason }]);

    // Act: Render the hook.
    renderHook(() => useExportPoller(), { wrapper: createWrapper() });

    // Assert: Verify error toast displays the failure reason.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Export failed",
        expect.objectContaining({
          description: failureReason,
        })
      );
    });
  });

  /**
   * Test case to verify that a default error message is used when failure reason is missing.
   */
  it("uses default error message if failure reason is missing", async () => {
    // Arrange: Mock the API to return a failed export without a reason.
    vi.mocked(getRecentExports).mockResolvedValue([
      { id: "5", status: "failed", failureReason: null },
    ]);

    // Act: Render the hook.
    renderHook(() => useExportPoller(), { wrapper: createWrapper() });

    // Assert: Verify error toast displays the default message.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Export failed",
        expect.objectContaining({
          description: "An unknown error occurred.",
        })
      );
    });
  });

  /**
   * Test case to verify that duplicate toasts are not shown for the same export ID.
   */
  it("does not trigger duplicate toasts for already handled exports", async () => {
    // Arrange: Mock the API to return a completed export.
    const mockUrl = "https://example.com/download.pdf";
    vi.mocked(getRecentExports).mockResolvedValue([{ id: "6", status: "completed", url: mockUrl }]);

    // Act: Render the hook and wait for the first toast.
    const { rerender } = renderHook(() => useExportPoller(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    // Act: Re-render the hook to simulate a subsequent poll.
    rerender();

    // Assert: Verify toast count remains 1.
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that finished exports are removed from the React Query cache.
   */
  it("removes completed and failed exports from the query cache", async () => {
    // Arrange: Setup a fresh QueryClient and wrapper.
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Arrange: Mock a mix of completed, failed, and pending exports.
    vi.mocked(getRecentExports).mockResolvedValue([
      { id: "7", status: "completed", url: "url" },
      { id: "8", status: "failed", failureReason: "error" },
      { id: "9", status: "pending" },
    ]);

    // Act: Render the hook.
    renderHook(() => useExportPoller(), { wrapper });

    // Assert: Wait for toasts to ensure processing occured.
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    // Act: Check the cache state.
    const cachedData = queryClient.getQueryData<RecentExport[]>(["recentExports"]);

    // Assert: Verify only the pending export remains in cache.
    expect(cachedData).toHaveLength(1);
    expect(cachedData?.[0].id).toBe("9");
    expect(cachedData?.[0].status).toBe("pending");
  });

  /**
   * Test case to verify that processing is skipped if an export ID is already marked as handled.
   */
  it("skips processing for exports that are already handled (line 41 coverage)", async () => {
    // Arrange: Setup client and wrapper.
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const exportItem = { id: "10", status: "completed", url: "http://example.com" };

    // Arrange: Mock initial API response.
    vi.mocked(getRecentExports).mockResolvedValue([exportItem]);

    // Act: Render hook and wait for initial toast.
    renderHook(() => useExportPoller(), { wrapper });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    // Arrange: Clear mock history to isolate the next assertion.
    vi.mocked(toast.success).mockClear();

    // Simulate a new fetch returning the same item again.
    vi.mocked(getRecentExports).mockResolvedValue([{ ...exportItem }]);

    // Act: Trigger a refetch manually.
    await queryClient.refetchQueries({ queryKey: ["recentExports"] });

    // Assert: Wait for the second API call.
    await waitFor(() => {
      expect(getRecentExports).toHaveBeenCalledTimes(2);
    });

    // Assert: Verify no new toast was triggered because the ID was already handled.
    expect(toast.success).not.toHaveBeenCalled();
  });
});
