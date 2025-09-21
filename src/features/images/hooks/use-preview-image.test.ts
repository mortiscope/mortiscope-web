import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { usePreviewImage } from "@/features/images/hooks/use-preview-image";

// Mock data representing a file stored on a remote server.
const mockRemoteFile = {
  id: "1",
  url: "https://example.com/image.jpg",
  version: 123,
} as unknown as UploadableFile;

// Mock data representing a file selected locally from the user's device.
const mockLocalFile = {
  id: "2",
  file: new File(["(⌐□_□)"], "test.png", { type: "image/png" }),
} as unknown as UploadableFile;

// Test suite for the `usePreviewImage` hook, verifying image loading and dimension extraction.
describe("usePreviewImage", () => {
  // Store original window properties to restore them after tests.
  const originalImage = window.Image;
  const originalURL = window.URL;

  // Variable to capture the Image.onload callback for manual triggering.
  let capturedOnLoad: (() => void) | null = null;

  // Setup global mocks for Image and URL before each test to simulate browser behavior.
  beforeEach(() => {
    capturedOnLoad = null;

    // Mock the global Image constructor to intercept loading logic.
    class MockImage {
      naturalWidth = 800;
      naturalHeight = 600;
      src = "";

      set onload(callback: () => void) {
        capturedOnLoad = callback;
      }
    }
    window.Image = MockImage as unknown as typeof Image;

    // Mock global URL methods for Object URL management.
    window.URL = {
      createObjectURL: vi.fn(() => "blob:test-url"),
      revokeObjectURL: vi.fn(),
    } as unknown as typeof URL;
  });

  // Cleanup mocks after each test to prevent side effects.
  afterEach(() => {
    window.Image = originalImage;
    window.URL = originalURL;
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the hook initializes with empty state when no file is provided.
   */
  it("initializes with empty state if no active file", () => {
    // Arrange: Render the hook with null input.
    const { result } = renderHook(() => usePreviewImage(null));

    // Assert: Check that preview URL is empty and dimensions are null.
    expect(result.current.previewUrl).toBe("");
    expect(result.current.imageDimensions).toBeNull();
  });

  /**
   * Test case to verify that the hook correctly handles remote files and extracts dimensions.
   */
  it("handles remote files: sets URL and fetches dimensions", async () => {
    // Arrange: Render the hook with a remote file object.
    const { result } = renderHook(() => usePreviewImage(mockRemoteFile));

    // Assert: Verify the URL includes the version query parameter.
    expect(result.current.previewUrl).toBe("https://example.com/image.jpg?v=123");

    // Act: Manually trigger the image load event.
    act(() => {
      if (capturedOnLoad) capturedOnLoad();
    });

    // Assert: Wait for dimensions to update after load.
    await waitFor(() => {
      expect(result.current.imageDimensions).toEqual({ width: 800, height: 600 });
    });
  });

  /**
   * Test case to verify that the hook creates object URLs for local files and extracts dimensions.
   */
  it("handles local files: creates object URL and fetches dimensions", async () => {
    // Arrange: Render the hook with a local file object.
    const { result } = renderHook(() => usePreviewImage(mockLocalFile));

    // Assert: Verify createObjectURL was called and set in state.
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockLocalFile.file);
    expect(result.current.previewUrl).toBe("blob:test-url");

    // Act: Manually trigger the image load event.
    act(() => {
      if (capturedOnLoad) capturedOnLoad();
    });

    // Assert: Wait for dimensions to update after load.
    await waitFor(() => {
      expect(result.current.imageDimensions).toEqual({ width: 800, height: 600 });
    });
  });

  /**
   * Test case to verify that object URLs for local files are revoked upon unmount.
   */
  it("cleans up object URLs when unmounting (for local files)", () => {
    // Arrange: Render the hook with a local file and then unmount it.
    const { unmount } = renderHook(() => usePreviewImage(mockLocalFile));

    // Act: Unmount the component to trigger cleanup effects.
    unmount();

    // Assert: Verify that revokeObjectURL was called to prevent memory leaks.
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });

  /**
   * Test case to verify that remote URLs are not revoked as they are not object URLs.
   */
  it("does NOT cleanup remote URLs (revoke is only for object URLs)", () => {
    // Arrange: Render the hook with a remote file and then unmount it.
    const { unmount } = renderHook(() => usePreviewImage(mockRemoteFile));

    // Act: Unmount the component.
    unmount();

    // Assert: Verify that revokeObjectURL was not called.
    expect(window.URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that state resets when the active file transitions to null.
   */
  it("resets state when activeFile becomes null", () => {
    // Arrange: Render the hook with an initial file.
    const { result, rerender } = renderHook(({ file }) => usePreviewImage(file), {
      initialProps: { file: mockRemoteFile } as { file: UploadableFile | null },
    });

    // Assert: Check initial populated state.
    expect(result.current.previewUrl).toContain("https://example.com");

    // Act: Rerender the hook with null input.
    rerender({ file: null });

    // Assert: Verify that state values reset to defaults.
    expect(result.current.previewUrl).toBe("");
    expect(result.current.imageDimensions).toBeNull();
  });

  /**
   * Test case to verify graceful handling of corrupt file objects missing URL and file properties.
   */
  it("handles activeFile with neither url nor file property (corrupt state)", () => {
    // Arrange: Create a corrupt file object.
    const corruptFile = {
      id: "3",
    } as unknown as UploadableFile;

    // Act: Render the hook with the corrupt file.
    const { result } = renderHook(() => usePreviewImage(corruptFile));

    // Assert: Verify that the hook returns empty state instead of crashing.
    expect(result.current.previewUrl).toBe("");
    expect(result.current.imageDimensions).toBeNull();
  });
});
