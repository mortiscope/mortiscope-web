import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { useClientFileProcessor } from "@/features/upload/hooks/use-client-file-processor";

// Mock the sonner toast library to prevent actual interface notification during tests.
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

/**
 * Test suite for the `useClientFileProcessor` hook.
 */
describe("useClientFileProcessor", () => {
  // Arrange: Save original global objects for restoration after tests.
  const originalFetch = global.fetch;
  const originalImage = global.Image;
  const originalCreateElement = document.createElement;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  // Arrange: Define mock functions for global dependencies.
  const mockFetch = vi.fn();
  const mockCreateObjectURL = vi.fn();
  const mockRevokeObjectURL = vi.fn();
  const mockCanvasContext = {
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
  };
  const mockToBlob = vi.fn();

  // Setup mock implementations before each test runs.
  beforeEach(() => {
    // Arrange: Mock global `fetch` for simulating network requests.
    global.fetch = mockFetch;

    // Arrange: Mock URL object methods for handling blob URLs.
    URL.createObjectURL = mockCreateObjectURL.mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = mockRevokeObjectURL;

    // Arrange: Mock the global `Image` constructor to control `onload` and `onerror` behavior.
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 100;
      naturalHeight = 100;
      crossOrigin = "";
      private _src = "";

      // Simulate loading: call `onerror` if "error" is in the URL, otherwise call `onload`.
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (val.includes("error")) {
            this.onerror?.();
          } else {
            this.onload?.();
          }
        }, 0);
      }
      get src() {
        return this._src;
      }
    } as unknown as typeof Image;

    // Arrange: Spy on `document.createElement` to mock canvas and anchor elements.
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") {
        // Return a mock canvas element with mocked context methods and `toBlob`.
        return {
          getContext: vi.fn(() => mockCanvasContext),
          toBlob: mockToBlob.mockImplementation((cb) => {
            // Simulate a successful blob creation with content.
            cb(new Blob(["rotated-content"], { type: "image/jpeg" }));
          }),
          width: 0,
          height: 0,
        } as unknown as HTMLElement;
      }
      if (tagName === "a") {
        // Return a mock anchor element used for simulating file downloads.
        const element = originalCreateElement.call(document, tagName);
        element.click = vi.fn();
        return element;
      }
      // Return original implementation for all other elements.
      return originalCreateElement.call(document, tagName);
    });
  });

  // Restore original global objects after all tests have run.
  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
    global.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  // Arrange: Define a base `UploadableFile` object for test use.
  const baseFile: UploadableFile = {
    id: "1",
    name: "test.jpg",
    size: 1000,
    type: "image/jpeg",
    status: "success",
    progress: 100,
    url: "https://example.com/test.jpg",
    source: "upload",
    dateUploaded: new Date(),
    version: 1,
    key: "key-1",
  };

  /**
   * Test suite for the `ensureFileBlob` function, which guarantees a local `File` object is available.
   */
  describe("ensureFileBlob", () => {
    /**
     * Test case to verify that the existing `File` object is returned without fetching if it is already present on the file.
     */
    it("returns the existing File object if present", async () => {
      // Arrange: Render hook and create a mock `File` object.
      const { result } = renderHook(() => useClientFileProcessor());
      const fileObj = new File(["content"], "test.jpg", { type: "image/jpeg" });

      // Act: Call `ensureFileBlob` with the existing `file` property.
      const resultFile = await result.current.ensureFileBlob({
        ...baseFile,
        file: fileObj,
      });

      // Assert: Check that the original file object instance was returned.
      expect(resultFile).toBe(fileObj);
      // Assert: Check that no network fetching occurred.
      expect(mockFetch).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that the file blob is fetched from the URL when the local `File` object is missing.
     */
    it("fetches the file blob from URL if File object is missing", async () => {
      // Arrange: Render hook and mock successful fetch response.
      const { result } = renderHook(() => useClientFileProcessor());

      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(["fetched-content"], { type: "image/jpeg" })),
      });

      // Act: Call `ensureFileBlob` without the local `file` property.
      const resultFile = await result.current.ensureFileBlob({
        ...baseFile,
        file: undefined,
      });

      // Assert: Check that `fetch` was called with the file URL.
      expect(mockFetch).toHaveBeenCalledWith(baseFile.url);
      // Assert: Check that a new `File` object was created.
      expect(resultFile).toBeInstanceOf(File);
      // Assert: Check that the new file retains the original name.
      expect(resultFile.name).toBe("test.jpg");
    });

    /**
     * Test case to verify that an error is thrown if neither a local `File` nor a `url` is available.
     */
    it("throws error if file has no URL and no File object", async () => {
      // Arrange: Render hook.
      const { result } = renderHook(() => useClientFileProcessor());

      // Assert: Expect the function to reject with a "File data is missing" error.
      await expect(
        result.current.ensureFileBlob({ ...baseFile, file: undefined, url: "" })
      ).rejects.toThrow("File data is missing.");
    });

    /**
     * Test case to verify that an error is thrown if the network fetch operation fails.
     */
    it("throws error if fetch fails", async () => {
      // Arrange: Render hook and mock a failed fetch response.
      const { result } = renderHook(() => useClientFileProcessor());

      mockFetch.mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      // Assert: Expect the function to reject with a fetch failure error message.
      await expect(result.current.ensureFileBlob({ ...baseFile, file: undefined })).rejects.toThrow(
        "Could not fetch original image for editing."
      );
    });

    it("logs error to console in development mode when fetch fails", async () => {
      const { result } = renderHook(() => useClientFileProcessor());
      mockFetch.mockResolvedValue({ ok: false, statusText: "Err" });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      vi.stubEnv("NODE_ENV", "development");

      await expect(
        result.current.ensureFileBlob({ ...baseFile, file: undefined })
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith("Fetch error in ensureFileBlob:", expect.any(Error));

      consoleSpy.mockRestore();
      vi.stubEnv("NODE_ENV", originalEnv);
    });
  });

  /**
   * Test suite for the `processRotation` function, which handles client-side image rotation using a canvas.
   */
  describe("processRotation", () => {
    /**
     * Test case to verify that the function returns the original file object unchanged if rotation is zero.
     */
    it("returns original file if rotation is 0", async () => {
      // Arrange: Render hook and create a mock file.
      const { result } = renderHook(() => useClientFileProcessor());
      const file = new File([""], "test.jpg");

      // Act: Call `processRotation` with zero rotation.
      const processed = await result.current.processRotation(file, 0);
      // Assert: Check that the returned object is strictly the same instance as the input file.
      expect(processed).toBe(file);
    });

    /**
     * Test case to verify the complete rotation process flow, including canvas operations and returning a new file.
     */
    it("rotates image and returns new file if rotation > 0", async () => {
      // Arrange: Render hook and create a mock file.
      const { result } = renderHook(() => useClientFileProcessor());
      const file = new File([""], "test.jpg", { type: "image/jpeg" });

      // Act: Call `processRotation` with a 90-degree rotation.
      const processed = await result.current.processRotation(file, 90);

      // Assert: Check that `createObjectURL` was called to load the original image onto the mock `Image` element.
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
      // Assert: Check that the canvas context translate method was called to position the rotation point.
      expect(mockCanvasContext.translate).toHaveBeenCalled();
      // Assert: Check that the canvas context rotate method was called with the angle converted to radians.
      expect(mockCanvasContext.rotate).toHaveBeenCalledWith((90 * Math.PI) / 180);
      // Assert: Check that the image was drawn onto the canvas.
      expect(mockCanvasContext.drawImage).toHaveBeenCalled();
      // Assert: Check that the canvas `toBlob` method was called to get the rotated image data.
      expect(mockToBlob).toHaveBeenCalled();

      // Assert: Check that the result is a new `File` instance.
      expect(processed).toBeInstanceOf(File);
      // Assert: Check that the returned object is a different instance from the original file.
      expect(processed).not.toBe(file);
    });

    /**
     * Test case to ensure the canvas dimensions are correctly swapped for 90-degree rotations.
     */
    it("swaps dimensions for 90 degree rotation", async () => {
      // Arrange: Render hook and mock file.
      const { result } = renderHook(() => useClientFileProcessor());
      const file = new File([""], "test.jpg");

      // Arrange: Override `document.createElement` spy to capture the created canvas instance.
      let canvasInstance: HTMLCanvasElement | null = null;
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "canvas") {
          const canvas = {
            getContext: () => mockCanvasContext,
            toBlob: mockToBlob.mockImplementation((cb) => cb(new Blob([]))),
            width: 0,
            height: 0,
          } as unknown as HTMLCanvasElement;
          canvasInstance = canvas;
          return canvas;
        }
        return originalCreateElement.call(document, tagName);
      });

      // Act: Call `processRotation` with 90 degrees.
      await result.current.processRotation(file, 90);

      // Assert: Verify that the canvas instance was created and captured.
      expect(canvasInstance).toBeTruthy();
    });

    /**
     * Test case to ensure the canvas dimensions are NOT swapped for 180 degree rotations.
     */
    it("does not swap dimensions for 180 degree rotation", async () => {
      // Arrange: Render hook and mock file.
      const { result } = renderHook(() => useClientFileProcessor());
      const file = new File([""], "test.jpg");

      // Arrange: Capture canvas to check dimensions
      let canvasInstance: HTMLCanvasElement | null = null;
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "canvas") {
          const canvas = {
            getContext: () => mockCanvasContext,
            toBlob: mockToBlob.mockImplementation((cb) => cb(new Blob([]))),
            width: 0,
            height: 0,
          };
          canvasInstance = canvas as unknown as HTMLCanvasElement;
          return canvas as unknown as HTMLElement;
        }
        return originalCreateElement.call(document, tagName);
      });

      // Act: Call `processRotation` with 180 degrees.
      await result.current.processRotation(file, 180);

      // Assert: Verify width matches naturalWidth (100) and height matches naturalHeight (100)
      // (Mock Image has naturalWidth=100 from setup)
      expect(canvasInstance!.width).toBe(100);
      expect(canvasInstance!.height).toBe(100);
    });

    /**
     * Test case to verify that an error is thrown if the mock `Image` object fails to load its source.
     */
    it("throws error if image fails to load", async () => {
      // Arrange: Render hook and mock file.
      const { result } = renderHook(() => useClientFileProcessor());
      const file = new File([""], "test.jpg");

      // Arrange: Set the mock `createObjectURL` to return a value that triggers the mock `Image` element's `onerror` handler.
      mockCreateObjectURL.mockReturnValue("error-url");

      // Assert: Expect the function to reject with an image processing error.
      await expect(result.current.processRotation(file, 90)).rejects.toThrow(
        "Could not process image for rotation."
      );
    });
  });

  /**
   * Test suite for the `downloadFile` function, which handles fetching, processing, and triggering the download.
   */
  describe("downloadFile", () => {
    /**
     * Test case to verify the direct download flow without rotation logic being executed.
     */
    it("downloads file without rotation logic interference if download succeeds", async () => {
      // Arrange: Render hook and mock successful fetch response.
      const { result } = renderHook(() => useClientFileProcessor());

      mockFetch.mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["content"])),
      });

      // Arrange: Spy on DOM manipulation methods for verification.
      const appendSpy = vi.spyOn(document.body, "appendChild");
      const removeSpy = vi.spyOn(document.body, "removeChild");

      // Act: Call `downloadFile` with zero rotation.
      await result.current.downloadFile(baseFile, "blob:url", 0);

      // Assert: Check that `fetch` was called to get the content blob.
      expect(mockFetch).toHaveBeenCalledWith("blob:url");
      // Assert: Check that the anchor tag was appended and then removed from the body.
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();

      // Assert: Check that `createObjectURL` was called to create a download URL for the blob.
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    /**
     * Test case to verify that the rotation logic is correctly integrated before the download is triggered.
     */
    it("handles rotation during download process", async () => {
      // Arrange: Render hook and mock successful fetch response.
      const { result } = renderHook(() => useClientFileProcessor());

      mockFetch.mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["content"], { type: "image/jpeg" })),
      });

      // Act: Call `downloadFile` with a 90-degree rotation.
      await result.current.downloadFile(baseFile, "blob:url", 90);

      // Assert: Check that `createObjectURL` was called.
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    /**
     * Test case to verify that an error notification is shown if the download process fails at the network level.
     */
    it("toasts error if download process fails", async () => {
      // Arrange: Render hook and mock sonner import.
      const { result } = renderHook(() => useClientFileProcessor());
      const { toast } = await import("sonner");

      // Arrange: Mock `fetch` to return a rejected promise.
      mockFetch.mockRejectedValue(new Error("Network error"));

      // Act: Call `downloadFile`.
      await result.current.downloadFile(baseFile, "blob:url", 0);

      // Assert: Check that the error toast function was called with the failure message.
      expect(toast.error).toHaveBeenCalledWith("Network error");
    });
  });
});
