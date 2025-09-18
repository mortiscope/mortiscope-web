import React from "react";
import type Webcam from "react-webcam";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook } from "@/__tests__/setup/test-utils";
import { useCameraProcessor } from "@/features/cases/hooks/use-camera-processor";

// Mock the `sonner` library to spy on toast notification calls for error handling.
vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

// Mock functions for the canvas 2D context to track image drawing and transformations.
const mockDrawImage = vi.fn();
const mockToDataURL = vi.fn(() => "data:image/jpeg;base64,mocked-data");
const mockTranslate = vi.fn();
const mockRotate = vi.fn();

/**
 * Test suite for the `useCameraProcessor` hook.
 */
describe("useCameraProcessor", () => {
  // Reference object that simulates the `react-webcam` component instance.
  let webcamRef: React.RefObject<Webcam | null>;
  // Mock video element containing properties for video dimensions.
  let mockVideoElement: HTMLVideoElement;
  // Preserve the original `document.createElement` to restore it after mocking.
  const originalCreateElement = document.createElement.bind(document);

  // Setup logic runs before each test case.
  beforeEach(() => {
    // Arrange: Clear all previous mock calls.
    vi.clearAllMocks();

    // Arrange: Define a mock canvas object and its context behavior.
    const mockCanvas = {
      getContext: vi.fn(() => ({
        drawImage: mockDrawImage,
        translate: mockTranslate,
        rotate: mockRotate,
      })),
      toDataURL: mockToDataURL,
      width: 0,
      height: 0,
    };

    // Arrange: Spy on `document.createElement` to intercept canvas creation and return the mock canvas.
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") return mockCanvas as unknown as HTMLCanvasElement;
      return originalCreateElement(tagName);
    });

    // Arrange: Mock the global `Image` constructor to immediately call its `onload` handler for asynchronous testing.
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 1920;
      height = 1080;
      _src = "";
      set src(val: string) {
        this._src = val;
        // Simulate asynchronous image loading success.
        setTimeout(() => this.onload?.(), 0);
      }
    } as unknown as typeof Image;

    // Arrange: Mock the global `fetch` API to simulate conversion of data URL to a `Blob`.
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(["mock-content"], { type: "image/jpeg" })),
    });

    // Arrange: Define the video dimensions on the mock element.
    mockVideoElement = {
      videoWidth: 1920,
      videoHeight: 1080,
    } as unknown as HTMLVideoElement;

    // Arrange: Define the `webcamRef` with the mock video element.
    webcamRef = {
      current: {
        video: mockVideoElement,
      } as unknown as Webcam,
    };
  });

  // Teardown logic runs after each test case.
  afterEach(() => {
    // Arrange: Restore all spies and mocks to their original implementations.
    vi.restoreAllMocks();
  });

  /**
   * Test case to verify error handling when the camera component reference or video element is unavailable.
   */
  it("returns null and toasts error if camera is not ready (ref is null)", async () => {
    // Arrange: Use a ref pointing to null.
    const emptyRef = { current: null };
    const { result } = renderHook(() => useCameraProcessor(emptyRef, 1, 0));

    // Act: Attempt to capture the image.
    const file = await result.current.capture();

    // Assert: Check that the result is null.
    expect(file).toBeNull();

    // Arrange: Use a ref pointing to an object missing the video element.
    const noVideoRef = { current: {} } as unknown as React.RefObject<Webcam>;
    const { result: result2 } = renderHook(() => useCameraProcessor(noVideoRef, 1, 0));

    // Act: Attempt to capture the image using the second hook instance.
    await act(async () => {
      const file2 = await result2.current.capture();
      // Assert: Check that the result is null.
      expect(file2).toBeNull();
    });

    // Assert: Verify that an error toast was shown indicating the camera issue.
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Camera is not ready"));
  });

  /**
   * Test case to verify successful image capture and processing with default settings.
   */
  it("captures and processes image successfully", async () => {
    // Arrange: Render the hook with a 16:9 aspect ratio and no rotation.
    const { result } = renderHook(() => useCameraProcessor(webcamRef, 16 / 9, 0));

    let file: File | null = null;

    // Act: Execute the capture function.
    await act(async () => {
      file = await result.current.capture();
    });

    // Assert: Check that a valid `File` object was returned.
    expect(file).not.toBeNull();
    // Assert: Verify the output file type.
    expect(file!.type).toBe("image/jpeg");
    // Assert: Verify the file name format includes a timestamp.
    expect(file!.name).toMatch(/capture-\d+\.jpg/);

    // Assert: Check that the image was drawn onto the canvas.
    expect(mockDrawImage).toHaveBeenCalled();
    // Assert: Check that the canvas data was converted to a data URL.
    expect(mockToDataURL).toHaveBeenCalled();
  });

  /**
   * Test case to verify that canvas transformations are applied correctly for 90-degree rotation.
   */
  it("handles image rotation correctly (90 deg)", async () => {
    // Arrange: Render the hook with 90-degree rotation specified.
    const { result } = renderHook(() => useCameraProcessor(webcamRef, 1, 90));

    // Act: Execute the capture function.
    await act(async () => {
      await result.current.capture();
    });

    // Assert: Check that canvas translation was called to shift the origin for rotation.
    expect(mockTranslate).toHaveBeenCalled();
    // Assert: Check that canvas rotation was called with the correct radian value (90 degrees).
    expect(mockRotate).toHaveBeenCalledWith((90 * Math.PI) / 180);
  });

  /**
   * Test case to verify that two drawImage calls occur to handle cropping when the aspect ratio changes.
   */
  it("handles cropping when aspect ratio differs (Square crop)", async () => {
    // Arrange: Render the hook with a 1:1 aspect ratio, which differs from the 16:9 mock video input.
    const { result } = renderHook(() => useCameraProcessor(webcamRef, 1, 0));

    // Act: Execute the capture function.
    await act(async () => {
      await result.current.capture();
    });

    // Assert: Check that two `drawImage` calls were made, indicating the initial image data conversion and subsequent cropping/final drawing.
    expect(mockDrawImage).toHaveBeenCalledTimes(2);
  });

  /**
   * Test case to verify graceful failure when an internal error occurs during canvas processing.
   */
  it("handles errors during capture gracefully", async () => {
    // Arrange: Mock `document.createElement` to simulate a failure to get the canvas context (e.g., if canvas is unsupported).
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") {
        return {
          getContext: () => null, // Simulate failure to get context
          width: 0,
          height: 0,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    // Arrange: Render the hook.
    const { result } = renderHook(() => useCameraProcessor(webcamRef, 1, 0));

    let file: File | null = null;
    // Act: Execute the capture function.
    await act(async () => {
      file = await result.current.capture();
    });

    // Assert: Check that the result is null upon failure.
    expect(file).toBeNull();
    // Assert: Verify that a generic error toast was shown to the user.
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("error occurred"));
  });

  /**
   * Test case to prevent concurrent capture attempts using the `isCapturing` internal state.
   */
  it("prevents double capture (isCapturing state)", async () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useCameraProcessor(webcamRef, 1, 0));

    // Arrange: Mock `fetch` to introduce a delay, simulating an ongoing capture operation.
    global.fetch = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    let p1: Promise<File | null>;
    // Act: Start the first capture, which immediately sets `isCapturing` to true.
    act(() => {
      p1 = result.current.capture();
    });

    let p2;
    // Act: Immediately attempt a second capture while the first is pending.
    act(() => {
      p2 = result.current.capture();
    });

    // Assert: Wait for the second capture attempt and verify it returned null immediately without waiting for the first.
    const res2 = await p2;
    expect(res2).toBeNull();

    // Act: Wait for the first promise to resolve to clean up the test.
    await act(async () => {
      await p1;
    });
  });
});
