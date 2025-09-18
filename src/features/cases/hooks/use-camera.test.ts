import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useCamera } from "@/features/cases/hooks/use-camera";
import { useCameraProcessor } from "@/features/cases/hooks/use-camera-processor";
import { useCameraSettings } from "@/features/cases/hooks/use-camera-settings";
import { deleteUpload } from "@/features/upload/actions/delete-upload";

// Mock the state management store used for file handling.
vi.mock("@/features/analyze/store/analyze-store");
// Mock the hook responsible for image processing and canvas manipulation.
vi.mock("@/features/cases/hooks/use-camera-processor");
// Mock the hook responsible for managing user-facing camera settings.
vi.mock("@/features/cases/hooks/use-camera-settings");
// Mock the server action for deleting uploaded files.
vi.mock("@/features/upload/actions/delete-upload", () => ({
  deleteUpload: vi.fn(),
}));
// Mock the toast notification library to spy on success and error calls.
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock environment variables to satisfy module dependencies.
vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  },
}));

// Mock application constants, specifically the file limit for this test suite.
vi.mock("@/lib/constants", () => ({
  MAX_FILES: 5,
  CAMERA_ASPECT_RATIOS: [{ name: "Square", value: 1, className: "aspect-square" }],
}));

// Arrange: Configure a `QueryClient` for testing hooks that rely on React Query.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

// Arrange: Define a wrapper component to provide the `QueryClientProvider` context.
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

/**
 * Test suite for the `useCamera` hook.
 */
describe("useCamera", () => {
  // Mock reference for the webcam component.
  const mockWebcamRef = { current: null };
  // Mock functions from the analysis store.
  const mockAddFiles = vi.fn();
  const mockRemoveFile = vi.fn();
  // Mock capture function from the camera processor hook.
  const mockCapture = vi.fn();

  // Setup runs before each test.
  beforeEach(() => {
    // Arrange: Clear execution history of all spies and mocks.
    vi.clearAllMocks();

    // Arrange: Mock the `useAnalyzeStore` to return file array and state functions.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      data: { files: [] },
      addFiles: mockAddFiles,
      removeFile: mockRemoveFile,
    } as unknown as ReturnType<typeof useAnalyzeStore>);

    // Arrange: Mock the `useCameraSettings` hook to return a fixed set of controls.
    vi.mocked(useCameraSettings).mockReturnValue({
      aspectRatio: { name: "Square", value: 1, className: "aspect-square" },
      rotation: 0,
      facingMode: "environment",
      isMirrored: false,
      handleAspectRatioChange: vi.fn(),
      handleDeviceFlip: vi.fn(),
      handleRotateCamera: vi.fn(),
      handleMirrorCamera: vi.fn(),
    });

    // Arrange: Mock the `useCameraProcessor` hook to return a mock capture function.
    vi.mocked(useCameraProcessor).mockReturnValue({
      capture: mockCapture,
      isCapturing: false,
    });

    // Arrange: Mock the server deletion action to resolve successfully by default.
    vi.mocked(deleteUpload).mockResolvedValue({ success: true });
  });

  /**
   * Test case to verify that the hook initializes with correct default values.
   */
  it("initializes with default state", () => {
    // Act: Render the hook with `isOpen` set to true.
    const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
      wrapper,
    });

    // Assert: Check the initial error state.
    expect(result.current.cameraError).toBeNull();
    // Assert: Check the initial camera facing mode from mocked settings.
    expect(result.current.facingMode).toBe("environment");
    // Assert: Check the initial list of files is empty.
    expect(result.current.cameraFiles).toEqual([]);
    // Assert: Check the initial file limit status.
    expect(result.current.isMaxFilesReached).toBe(false);
  });

  /**
   * Test case to verify that any existing error state is cleared when the camera modal is opened.
   */
  it("resets error state when opened", () => {
    // Arrange: Render the hook initially with `isOpen` set to false.
    const { result, rerender } = renderHook((props) => useCamera(props), {
      wrapper,
      initialProps: { isOpen: false, webcamRef: mockWebcamRef },
    });

    // Act: Set an error state manually.
    act(() => {
      result.current.handleUserMediaError("Some Error");
    });
    // Assert: Verify the error state is set.
    expect(result.current.cameraError).not.toBeNull();

    // Act: Rerender the hook with `isOpen` set to true.
    rerender({ isOpen: true, webcamRef: mockWebcamRef });

    // Assert: Check that the error state has been cleared by the effect hook.
    expect(result.current.cameraError).toBeNull();
  });

  /**
   * Test suite for the `handleUserMediaError` function, which translates DOM exceptions into user-friendly error messages.
   */
  describe("handleUserMediaError", () => {
    /**
     * Test case to verify the correct error message for a `NotAllowedError` (permission denied).
     */
    it("handles NotAllowedError", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      // Arrange: Create a mock DOM exception for permission denial.
      const error = new DOMException("Permission denied", "NotAllowedError");

      // Act: Call the error handler with the mock error.
      act(() => {
        result.current.handleUserMediaError(error);
      });

      // Assert: Check for the specific permission denied error object.
      expect(result.current.cameraError).toEqual({
        title: "Permission Denied",
        description: "Please enable camera access in your browser settings.",
      });
    });

    /**
     * Test case to verify the correct error message for a `NotFoundError` (no camera hardware detected).
     */
    it("handles NotFoundError", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      // Arrange: Create a mock DOM exception for a missing device.
      const error = new DOMException("Not found", "NotFoundError");

      // Act: Call the error handler.
      act(() => {
        result.current.handleUserMediaError(error);
      });

      // Assert: Check for the specific no camera found error object.
      expect(result.current.cameraError).toEqual({
        title: "No Camera Found",
        description: "Please connect a camera and try again.",
      });
    });

    /**
     * Test case to verify the correct error message for a `NotReadableError` (camera is already in use).
     */
    it("handles NotReadableError", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      // Arrange: Create a mock DOM exception for device in use.
      const error = new DOMException("Not readable", "NotReadableError");

      // Act: Call the error handler.
      act(() => {
        result.current.handleUserMediaError(error);
      });

      // Assert: Check for the specific camera in use error object.
      expect(result.current.cameraError).toEqual({
        title: "Camera is in Use",
        description: "Another application might be using your camera.",
      });
    });

    /**
     * Test case to verify handling of generic string errors.
     */
    it("handles string errors", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });

      // Act: Call the error handler with a string message.
      act(() => {
        result.current.handleUserMediaError("Something went wrong");
      });

      // Assert: Check for the generic unknown error object.
      expect(result.current.cameraError).toEqual({
        title: "An Unknown Error Occurred",
        description: "Please check your browser settings.",
      });
    });

    /**
     * Test case to verify the default error message for unhandled `DOMException` names.
     */
    it("handles unknown error name (default case)", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      // Arrange: Create a mock DOM exception with an unhandled name.
      const error = new DOMException("Unknown error", "SomeRandomError");

      // Act: Call the error handler.
      act(() => {
        result.current.handleUserMediaError(error);
      });

      // Assert: Check for the default camera unavailable error object.
      expect(result.current.cameraError).toEqual({
        title: "Camera Unavailable",
        description: "An unexpected error occurred.",
      });
    });

    /**
     * Test case to verify that errors are logged to the console when in development mode.
     */
    it("logs error in development mode", () => {
      // Arrange: Spy on `console.error` to track logging.
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      // Arrange: Stub the environment variable to simulate development mode.
      vi.stubEnv("NODE_ENV", "development");

      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });

      // Act: Trigger the error handler.
      act(() => {
        result.current.handleUserMediaError("Some error");
      });

      // Assert: Check that the error was logged to the console with the expected prefix.
      expect(consoleSpy).toHaveBeenCalledWith("Webcam Error:", "Some error");
      // Arrange: Restore the original console and environment settings.
      consoleSpy.mockRestore();
      vi.unstubAllEnvs();
    });
  });

  /**
   * Test suite for the `handleCapture` function.
   */
  describe("handleCapture", () => {
    /**
     * Test case to verify that an image is captured and added to the store successfully.
     */
    it("captures image successfully", async () => {
      // Arrange: Define a mock file object returned by the capture function.
      const mockFile = { id: "1", source: "camera" } as UploadableFile;
      // Arrange: Mock the `capture` function to resolve with the mock file.
      mockCapture.mockResolvedValue(mockFile);

      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });

      // Act: Call the capture handler.
      await act(async () => {
        await result.current.handleCapture(false);
      });

      // Assert: Check that the underlying capture function was executed.
      expect(mockCapture).toHaveBeenCalled();
      // Assert: Check that the file was correctly added to the state store.
      expect(mockAddFiles).toHaveBeenCalledWith([mockFile], "camera");
    });

    /**
     * Test case to verify that capture is prevented if the maximum file limit has been reached.
     */
    it("prevents capture if max files reached", async () => {
      // Arrange: Mock the store to contain the maximum allowed number of files (5).
      vi.mocked(useAnalyzeStore).mockReturnValue({
        data: { files: Array(5).fill({ source: "camera" }) },
        addFiles: mockAddFiles,
        removeFile: mockRemoveFile,
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });

      // Act: Call the capture handler.
      await act(async () => {
        await result.current.handleCapture(false);
      });

      // Assert: Check that the capture function was never called due to the limit check.
      expect(mockCapture).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that no file is added to the store if the `capture` function returns null (e.g., due to an internal processing error).
     */
    it("does not add file if capture returns null", async () => {
      // Arrange: Mock the `capture` function to resolve with null.
      mockCapture.mockResolvedValue(null);
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });

      // Act: Call the capture handler.
      await act(async () => {
        await result.current.handleCapture(false);
      });

      // Assert: Check that the underlying capture function was called.
      expect(mockCapture).toHaveBeenCalled();
      // Assert: Check that the file adding function was not called because of the null result.
      expect(mockAddFiles).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that a success toast notification is skipped when operating in mobile mode.
     */
    it("does not show success toast on mobile", async () => {
      // Arrange: Define a mock file and mock successful capture.
      const mockFile = { id: "1", source: "camera" } as UploadableFile;
      mockCapture.mockResolvedValue(mockFile);

      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });

      // Act: Call the capture handler, passing `isMobile=true`.
      await act(async () => {
        await result.current.handleCapture(true);
      });

      // Assert: Check that capture and file addition were successful.
      expect(mockCapture).toHaveBeenCalled();
      expect(mockAddFiles).toHaveBeenCalledWith([mockFile], "camera");
      // Assert: Check that the success toast function was not called.
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  /**
   * Test suite for the `handleRemoveFile` function.
   */
  describe("handleRemoveFile", () => {
    /**
     * Test case to verify that a file without a remote `key` is removed directly from the store without calling the server action.
     */
    it("removes local file immediately", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      // Arrange: Define a local file without a `key`.
      const file = { id: "1", source: "camera" } as UploadableFile;

      // Act: Call the remove handler.
      act(() => {
        result.current.handleRemoveFile(file, false);
      });

      // Assert: Check that `removeFile` was called locally.
      expect(mockRemoveFile).toHaveBeenCalledWith("1");
      // Assert: Check that the server action was skipped.
      expect(deleteUpload).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that a file with a remote `key` triggers the server deletion mutation before local removal.
     */
    it("removes uploaded file via mutation", async () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      // Arrange: Define a file with a remote `key`.
      const file = { id: "1", source: "camera", key: "some-key" } as UploadableFile;

      // Act: Call the remove handler.
      act(() => {
        result.current.handleRemoveFile(file, false);
      });

      // Assert: Wait for the server deletion mutation to be called with the correct key.
      await waitFor(() => {
        expect(deleteUpload).toHaveBeenCalledWith({ key: "some-key" });
      });

      // Assert: Wait for the local state removal after server success.
      await waitFor(() => {
        expect(mockRemoveFile).toHaveBeenCalledWith("1");
      });
    });

    /**
     * Test case to verify that local removal is blocked if the server deletion action fails.
     */
    it("handles failed server deletion (success: false)", async () => {
      // Arrange: Mock the server deletion to resolve with a failure status and error message.
      vi.mocked(deleteUpload).mockResolvedValueOnce({ success: false, error: "Server error" });
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      const file = { id: "1", source: "camera", key: "some-key" } as UploadableFile;

      // Act: Call the remove handler.
      act(() => {
        result.current.handleRemoveFile(file, false);
      });

      // Assert: Wait for the server deletion to be attempted.
      await waitFor(() => {
        expect(deleteUpload).toHaveBeenCalled();
      });
      // Arrange: Allow a microtask queue to empty after the mutation completes.
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert: Check that local removal was prevented due to server failure.
      expect(mockRemoveFile).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that a toast error is displayed when the mutation promise rejects (e.g., due to network failure).
     */
    it("handles mutation error", async () => {
      // Arrange: Define a mock network error.
      const error = new Error("Network error");
      // Arrange: Mock the server deletion to reject with the network error.
      vi.mocked(deleteUpload).mockRejectedValueOnce(error);
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      const file = { id: "1", source: "camera", key: "some-key" } as UploadableFile;

      // Act: Call the remove handler.
      act(() => {
        result.current.handleRemoveFile(file, false);
      });

      // Assert: Wait for the server deletion to be attempted.
      await waitFor(() => {
        expect(deleteUpload).toHaveBeenCalled();
      });
      // Arrange: Allow a microtask queue to empty after the rejection.
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert: Check that an error toast was shown with the network error message.
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("An error occurred: Network error")
      );
    });

    /**
     * Test case to verify that a success toast is skipped when removing a file in mobile mode.
     */
    it("does not show success toast on mobile", async () => {
      // Arrange: Mock successful server deletion.
      vi.mocked(deleteUpload).mockResolvedValueOnce({ success: true });
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      const file = { id: "1", source: "camera", key: "some-key" } as UploadableFile;

      // Act: Call the remove handler, passing `isMobile=true`.
      act(() => {
        result.current.handleRemoveFile(file, true);
      });

      // Assert: Wait for the server deletion to be attempted.
      await waitFor(() => {
        expect(deleteUpload).toHaveBeenCalled();
      });
      // Arrange: Allow a microtask queue to empty.
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert: Check that local removal occurred.
      expect(mockRemoveFile).toHaveBeenCalledWith("1");
      // Assert: Check that the success toast was not called.
      expect(toast.success).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that a generic fallback error message is used when the server deletion fails but provides no explicit error message.
     */
    it("uses fallback error message if server returns no error message", async () => {
      // Arrange: Mock the server deletion to resolve with `success: false` but no `error` field.
      vi.mocked(deleteUpload).mockResolvedValueOnce({
        success: false,
      } as unknown as Awaited<ReturnType<typeof deleteUpload>>);
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCamera({ isOpen: true, webcamRef: mockWebcamRef }), {
        wrapper,
      });
      const file = { id: "1", source: "camera", key: "some-key" } as UploadableFile;

      // Act: Call the remove handler.
      act(() => {
        result.current.handleRemoveFile(file, false);
      });

      // Assert: Wait for the server deletion to be attempted.
      await waitFor(() => {
        expect(deleteUpload).toHaveBeenCalled();
      });
      // Arrange: Allow a microtask queue to empty.
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert: Check that the generic fallback error toast was shown.
      expect(toast.error).toHaveBeenCalledWith("Failed to remove captured image.");
    });
  });
});
