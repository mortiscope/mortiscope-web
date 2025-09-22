import { act, renderHook } from "@/__tests__/setup/test-utils";
import { useRenderedImage } from "@/features/images/hooks/use-rendered-image";

// Test suite for the `useRenderedImage` hook, verifying image loading, dimension calculation, and responsive resizing logic.
describe("useRenderedImage", () => {
  let originalImage: typeof window.Image;
  let originalResizeObserver: typeof window.ResizeObserver;
  let resizeCallback: ResizeObserverCallback;
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let mockImageInstance: HTMLImageElement;

  // Store original window properties before tests start to restore them later.
  beforeAll(() => {
    originalImage = window.Image;
    originalResizeObserver = window.ResizeObserver;
  });

  // Reset mocks and define custom mock implementations for Image and ResizeObserver before each test.
  beforeEach(() => {
    resizeCallback = vi.fn();
    observeMock = vi.fn();
    disconnectMock = vi.fn();

    // Mock ResizeObserver to capture the callback and expose observe/disconnect methods.
    window.ResizeObserver = class ResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        resizeCallback = cb;
      }
      observe = observeMock;
      disconnect = disconnectMock;
      unobserve = vi.fn();
    } as unknown as typeof window.ResizeObserver;

    // Mock Image constructor to capture the instance and control loading events manually.
    window.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      naturalWidth = 0;
      naturalHeight = 0;
      constructor() {
        mockImageInstance = this as unknown as HTMLImageElement;
      }
    } as unknown as typeof window.Image;
  });

  // Restore original window properties after all tests complete.
  afterAll(() => {
    window.Image = originalImage;
    window.ResizeObserver = originalResizeObserver;
  });

  /**
   * Test case to verify that the hook initializes with null or false values before an image is provided.
   */
  it("should initialize with default null states", () => {
    // Arrange: Render the hook with a null URL.
    const containerRef = { current: document.createElement("div") };
    const { result } = renderHook(() => useRenderedImage({ imageUrl: null, containerRef }));

    // Assert: Verify that loaded status is false and dimensions are null.
    expect(result.current.isImageLoaded).toBe(false);
    expect(result.current.imageDimensions).toBeNull();
    expect(result.current.renderedImageStyle).toBeNull();
  });

  /**
   * Test case to verify that valid images load and report their natural dimensions.
   */
  it("should load image dimensions successfully", () => {
    // Arrange: Render the hook with a valid image URL.
    const containerRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      useRenderedImage({ imageUrl: "http://example.com/image-1.jpg", containerRef })
    );

    // Act: Simulate the asynchronous image load event with defined dimensions.
    act(() => {
      Object.defineProperty(mockImageInstance, "naturalWidth", { value: 800 });
      Object.defineProperty(mockImageInstance, "naturalHeight", { value: 600 });
      if (mockImageInstance.onload) mockImageInstance.onload(new Event("load"));
    });

    // Assert: Verify the image is marked as loaded with correct dimensions.
    expect(result.current.isImageLoaded).toBe(true);
    expect(result.current.imageDimensions).toEqual({ width: 800, height: 600 });
  });

  /**
   * Test case to verify that image load errors are handled gracefully.
   */
  it("should handle image load errors", () => {
    // Arrange: Render the hook with a URL intended to fail.
    const containerRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      useRenderedImage({ imageUrl: "http://example.com/broken.jpg", containerRef })
    );

    // Act: Simulate an image error event.
    act(() => {
      if (mockImageInstance.onerror) mockImageInstance.onerror(new Event("error"));
    });

    // Assert: Verify the image remains unloaded and dimensions are null.
    expect(result.current.isImageLoaded).toBe(false);
    expect(result.current.imageDimensions).toBeNull();
  });

  /**
   * Test case to verify that internal state resets when the imageUrl prop changes to null.
   */
  it("should reset state when imageUrl becomes null", () => {
    // Arrange: Initialize the hook with a valid URL.
    const containerRef = { current: document.createElement("div") };
    const { result, rerender } = renderHook(
      ({ url }) => useRenderedImage({ imageUrl: url, containerRef }),
      { initialProps: { url: "http://example.com/image-1.jpg" as string | null } }
    );

    // Act: Simulate successful image loading.
    act(() => {
      Object.defineProperty(mockImageInstance, "naturalWidth", { value: 800 });
      Object.defineProperty(mockImageInstance, "naturalHeight", { value: 600 });
      if (mockImageInstance.onload) mockImageInstance.onload(new Event("load"));
    });

    expect(result.current.isImageLoaded).toBe(true);

    // Act: Rerender the hook with a null URL.
    rerender({ url: null });

    // Assert: Verify that the state has been reset.
    expect(result.current.isImageLoaded).toBe(false);
    expect(result.current.imageDimensions).toBeNull();
  });

  /**
   * Test case to verify correct styling (letterboxing) when a landscape image fits into a portrait container.
   */
  it("should calculate correct style for landscape image in portrait container (letterboxing)", () => {
    // Arrange: Render the hook.
    const containerRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      useRenderedImage({ imageUrl: "http://example.com/image-1.jpg", containerRef })
    );

    // Act: Load a landscape image (2:1 aspect ratio).
    act(() => {
      Object.defineProperty(mockImageInstance, "naturalWidth", { value: 200 });
      Object.defineProperty(mockImageInstance, "naturalHeight", { value: 100 });
      if (mockImageInstance.onload) mockImageInstance.onload(new Event("load"));
    });

    // Act: Simulate a resize event on a portrait container (100x200).
    act(() => {
      resizeCallback(
        [
          {
            contentRect: { width: 100, height: 200 },
          } as ResizeObserverEntry,
        ],
        window.ResizeObserver as unknown as ResizeObserver
      );
    });

    // Assert: Verify the image width matches container width, height scales to 50, and top is centered (75).
    expect(result.current.renderedImageStyle).toEqual({
      width: 100,
      height: 50,
      top: 75,
      left: 0,
    });
  });

  /**
   * Test case to verify correct styling (pillarboxing) when a portrait image fits into a landscape container.
   */
  it("should calculate correct style for portrait image in landscape container (pillarboxing)", () => {
    // Arrange: Render the hook.
    const containerRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      useRenderedImage({ imageUrl: "http://example.com/image-1.jpg", containerRef })
    );

    // Act: Load a portrait image (1:2 aspect ratio).
    act(() => {
      Object.defineProperty(mockImageInstance, "naturalWidth", { value: 100 });
      Object.defineProperty(mockImageInstance, "naturalHeight", { value: 200 });
      if (mockImageInstance.onload) mockImageInstance.onload(new Event("load"));
    });

    // Act: Simulate a resize event on a landscape container (200x100).
    act(() => {
      resizeCallback(
        [
          {
            contentRect: { width: 200, height: 100 },
          } as ResizeObserverEntry,
        ],
        window.ResizeObserver as unknown as ResizeObserver
      );
    });

    // Assert: Verify the image height matches container height, width scales to 50, and left is centered (75).
    expect(result.current.renderedImageStyle).toEqual({
      width: 50,
      height: 100,
      top: 0,
      left: 75,
    });
  });

  /**
   * Test case to verify correct styling when image and container share the same aspect ratio.
   */
  it("should calculate correct style for perfectly matching aspect ratios", () => {
    // Arrange: Render the hook.
    const containerRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      useRenderedImage({ imageUrl: "http://example.com/image-1.jpg", containerRef })
    );

    // Act: Load a square image.
    act(() => {
      Object.defineProperty(mockImageInstance, "naturalWidth", { value: 100 });
      Object.defineProperty(mockImageInstance, "naturalHeight", { value: 100 });
      if (mockImageInstance.onload) mockImageInstance.onload(new Event("load"));
    });

    // Act: Simulate a resize event on a square container.
    act(() => {
      resizeCallback(
        [
          {
            contentRect: { width: 500, height: 500 },
          } as ResizeObserverEntry,
        ],
        window.ResizeObserver as unknown as ResizeObserver
      );
    });

    // Assert: Verify the image fills the container exactly with no offset.
    expect(result.current.renderedImageStyle).toEqual({
      width: 500,
      height: 500,
      top: 0,
      left: 0,
    });
  });

  /**
   * Test case to verify that no style is returned if the container has no size (e.g., hidden).
   */
  it("should return null style if container dimensions are zero", () => {
    // Arrange: Render the hook.
    const containerRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      useRenderedImage({ imageUrl: "http://example.com/image-1.jpg", containerRef })
    );

    // Act: Load the image.
    act(() => {
      Object.defineProperty(mockImageInstance, "naturalWidth", { value: 100 });
      Object.defineProperty(mockImageInstance, "naturalHeight", { value: 100 });
      if (mockImageInstance.onload) mockImageInstance.onload(new Event("load"));
    });

    // Act: Simulate a resize event with zero dimensions.
    act(() => {
      resizeCallback(
        [
          {
            contentRect: { width: 0, height: 0 },
          } as ResizeObserverEntry,
        ],
        window.ResizeObserver as unknown as ResizeObserver
      );
    });

    // Assert: Verify the calculated style is null.
    expect(result.current.renderedImageStyle).toBeNull();
  });

  /**
   * Test case to verify cleanup of the ResizeObserver upon component unmount.
   */
  it("should disconnect observer on unmount", () => {
    // Arrange: Render the hook.
    const containerRef = { current: document.createElement("div") };
    const { unmount } = renderHook(() =>
      useRenderedImage({ imageUrl: "http://example.com/image-1.jpg", containerRef })
    );

    // Act: Load the image.
    act(() => {
      if (mockImageInstance.onload) mockImageInstance.onload(new Event("load"));
    });

    // Act: Unmount the component.
    unmount();

    // Assert: Verify the disconnect method was called on the observer.
    expect(disconnectMock).toHaveBeenCalled();
  });
});
