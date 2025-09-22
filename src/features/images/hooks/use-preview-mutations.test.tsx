import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { usePreviewMutations } from "@/features/images/hooks/use-preview-mutations";
import { renameUpload } from "@/features/upload/actions/rename-upload";

// Mock server actions for file management.
vi.mock("@/features/upload/actions/create-upload", () => ({ createUpload: vi.fn() }));
vi.mock("@/features/upload/actions/delete-upload", () => ({ deleteUpload: vi.fn() }));
vi.mock("@/features/upload/actions/update-upload", () => ({ updateUpload: vi.fn() }));
vi.mock("@/features/upload/actions/rename-upload", () => ({ renameUpload: vi.fn() }));

// Mock the analyze store to control state during tests.
vi.mock("@/features/analyze/store/analyze-store", () => ({
  useAnalyzeStore: vi.fn(),
}));

// Mock toast notifications to verify user feedback.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Creates a wrapper component with QueryClientProvider for React Query hooks.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

// Mock functions to track store updates.
const mockSetUploadKey = vi.fn();
const mockSetUploadUrl = vi.fn();

// Mock initial file state for the store.
const mockFiles = [
  { id: "1", key: "original-key.jpg", url: "http://old-url.com" },
  { id: "2", key: "other-file.jpg" },
];

// Mock store state implementation.
const mockStoreState = {
  data: { files: mockFiles },
  setUploadKey: mockSetUploadKey,
  setUploadUrl: mockSetUploadUrl,
};

// Test suite for the `usePreviewMutations` hook, covering various file operations.
describe("usePreviewMutations", () => {
  // Reset mocks and configure the store mock before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAnalyzeStore).mockImplementation((selector: unknown) => {
      if (typeof selector === "function") {
        return selector(mockStoreState);
      }
      return selector;
    });
  });

  /**
   * Test case to verify that all mutation hooks are initialized and defined.
   */
  it("initializes all mutations", () => {
    // Arrange: Render the hook within the test wrapper.
    const { result } = renderHook(() => usePreviewMutations(), { wrapper: createWrapper() });

    // Assert: Check that all mutation objects are present.
    expect(result.current.presignedUrlMutation).toBeDefined();
    expect(result.current.renameMutation).toBeDefined();
    expect(result.current.updateUploadMutation).toBeDefined();
    expect(result.current.deleteMutation).toBeDefined();
  });

  // Test suite specifically for the rename mutation functionality.
  describe("renameMutation", () => {
    /**
     * Test case to verify that the store is updated upon a successful file rename.
     */
    it("updates store on successful rename", async () => {
      // Arrange: Mock the rename action to return success data.
      vi.mocked(renameUpload).mockResolvedValue({
        success: true,
        data: {
          newKey: "new-key.jpg",
          newUrl: "http://new-url.com",
        },
      } as Awaited<ReturnType<typeof renameUpload>>);

      const { result } = renderHook(() => usePreviewMutations(), { wrapper: createWrapper() });

      // Act: Trigger the rename mutation.
      result.current.renameMutation.mutate({
        oldKey: "original-key.jpg",
        newFileName: "new-key.jpg",
      });

      // Assert: Wait for mutation success and verify store update calls.
      await waitFor(() => {
        expect(result.current.renameMutation.isSuccess).toBe(true);
      });

      expect(mockSetUploadKey).toHaveBeenCalledWith("1", "new-key.jpg");
      expect(mockSetUploadUrl).toHaveBeenCalledWith("1", "http://new-url.com");
      expect(toast.error).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that an error toast is displayed when the server returns a failure status.
     */
    it("handles server-side failure (success: false) gracefully", async () => {
      // Arrange: Mock the rename action to return a specific error.
      vi.mocked(renameUpload).mockResolvedValue({
        success: false,
        error: "Duplicate name",
      } as Awaited<ReturnType<typeof renameUpload>>);

      const { result } = renderHook(() => usePreviewMutations(), { wrapper: createWrapper() });

      // Act: Trigger the rename mutation.
      result.current.renameMutation.mutate({
        oldKey: "original-key.jpg",
        newFileName: "duplicate.jpg",
      });

      // Assert: Wait for mutation completion and verify error toast.
      await waitFor(() => {
        expect(result.current.renameMutation.isSuccess).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Duplicate name");
      expect(mockSetUploadKey).not.toHaveBeenCalled();
      expect(mockSetUploadUrl).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that no store updates occur if the file is not found in the local state.
     */
    it("does nothing if the file is not found in the store", async () => {
      // Arrange: Mock success response from server.
      vi.mocked(renameUpload).mockResolvedValue({
        success: true,
        data: { newKey: "k", newUrl: "u" },
      } as Awaited<ReturnType<typeof renameUpload>>);

      const { result } = renderHook(() => usePreviewMutations(), { wrapper: createWrapper() });

      // Act: Trigger mutation with a key that does not exist in mockFiles.
      result.current.renameMutation.mutate({
        oldKey: "non-existent-key.jpg",
        newFileName: "k",
      });

      // Assert: Verify mutation succeeds but store is not updated.
      await waitFor(() => {
        expect(result.current.renameMutation.isSuccess).toBe(true);
      });

      expect(mockSetUploadKey).not.toHaveBeenCalled();
      expect(mockSetUploadUrl).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that a fallback error is shown if success is true but return data is missing.
     */
    it("shows fallback error if success=true but data is missing", async () => {
      // Arrange: Mock success response but omit the data payload.
      vi.mocked(renameUpload).mockResolvedValue({
        success: true,
        data: undefined,
      } as Awaited<ReturnType<typeof renameUpload>>);

      const { result } = renderHook(() => usePreviewMutations(), { wrapper: createWrapper() });

      // Act: Trigger the rename mutation.
      result.current.renameMutation.mutate({
        oldKey: "original-key.jpg",
        newFileName: "k",
      });

      // Assert: Verify fallback error toast.
      await waitFor(() => {
        expect(result.current.renameMutation.isSuccess).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Server-side rename failed.");
    });

    /**
     * Test case to verify that a fallback error is shown if success is false but no error message is provided.
     */
    it("shows fallback error if success=false and error is missing", async () => {
      // Arrange: Mock failure response but omit the error message.
      vi.mocked(renameUpload).mockResolvedValue({
        success: false,
        error: undefined,
      } as Awaited<ReturnType<typeof renameUpload>>);

      const { result } = renderHook(() => usePreviewMutations(), { wrapper: createWrapper() });

      // Act: Trigger the rename mutation.
      result.current.renameMutation.mutate({
        oldKey: "original-key.jpg",
        newFileName: "k",
      });

      // Assert: Verify fallback error toast.
      await waitFor(() => {
        expect(result.current.renameMutation.isSuccess).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith("Server-side rename failed.");
    });
  });
});
