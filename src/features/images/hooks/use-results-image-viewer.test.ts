import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import {
  type ImageFile,
  useResultsImageViewer,
} from "@/features/images/hooks/use-results-image-viewer";

// Mock the mobile detection hook to control responsive behavior.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

// Mock the rendered image hook to track image loading and dimensions.
vi.mock("@/features/images/hooks/use-rendered-image", () => ({
  useRenderedImage: vi.fn(),
}));

// Mock the list navigation hook to control next/previous logic.
vi.mock("@/features/results/hooks/use-list-navigation", () => ({
  useListNavigation: vi.fn(),
}));

import { useRenderedImage } from "@/features/images/hooks/use-rendered-image";
import { useListNavigation } from "@/features/results/hooks/use-list-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

// Define mock image data for testing.
const mockImage1 = { id: "1", url: "image-1.jpg", version: 1 } as unknown as ImageFile;
const mockImage2 = { id: "2", url: "image-2.jpg", version: 1 } as unknown as ImageFile;
const mockImages = [mockImage1, mockImage2];

/**
 * Test suite for the `useResultsImageViewer` hook, responsible for managing image states in the results viewer modal.
 */
describe("useResultsImageViewer", () => {
  // Reset mocks and establish default behavior before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useIsMobile).mockReturnValue(false);

    vi.mocked(useRenderedImage).mockReturnValue({
      isImageLoaded: true,
      imageDimensions: { width: 100, height: 100 },
      renderedImageStyle: { width: 50, height: 50, top: 0, left: 0 },
    });

    vi.mocked(useListNavigation).mockReturnValue({
      hasNext: true,
      hasPrevious: false,
    });
  });

  /**
   * Test case to verify that the hook initializes the active image state with the provided prop.
   */
  it("initializes with the provided image", () => {
    // Arrange: Render the hook with a specific image.
    const { result } = renderHook(() =>
      useResultsImageViewer({ image: mockImage1, images: mockImages, isOpen: true })
    );

    // Assert: Check that the active image matches the input.
    expect(result.current.activeImage).toEqual(mockImage1);
  });

  /**
   * Test case to verify that the active image state updates when the image prop changes.
   */
  it("updates activeImage when image prop changes", () => {
    // Arrange: Render the hook with initial props.
    const { result, rerender } = renderHook(
      ({ image }) => useResultsImageViewer({ image, images: mockImages, isOpen: true }),
      { initialProps: { image: mockImage1 } }
    );

    // Assert: Verify initial image state.
    expect(result.current.activeImage).toEqual(mockImage1);

    // Act: Rerender the hook with a new image.
    rerender({ image: mockImage2 });

    // Assert: Verify the active image updated.
    expect(result.current.activeImage).toEqual(mockImage2);
  });

  /**
   * Test case to verify that the active image state is reset to null when the modal is closed.
   */
  it("resets activeImage to null when modal closes (isOpen -> false)", () => {
    // Arrange: Render the hook with the modal open.
    const { result, rerender } = renderHook(
      ({ isOpen }) => useResultsImageViewer({ image: mockImage1, images: mockImages, isOpen }),
      { initialProps: { isOpen: true } }
    );

    // Assert: Verify active image is present.
    expect(result.current.activeImage).toEqual(mockImage1);

    // Act: Close the modal by updating props.
    rerender({ isOpen: false });

    // Assert: Verify active image is reset to null.
    expect(result.current.activeImage).toBeNull();
  });

  /**
   * Test case to verify that the hook correctly aggregates and exposes state from dependent child hooks.
   */
  it("aggregates data from child hooks correctly", () => {
    // Arrange: Configure mocks to return specific mobile and navigation states.
    vi.mocked(useIsMobile).mockReturnValue(true);
    vi.mocked(useListNavigation).mockReturnValue({ hasNext: false, hasPrevious: true });
    vi.mocked(useRenderedImage).mockReturnValue({
      isImageLoaded: false,
      imageDimensions: null,
      renderedImageStyle: null,
    });

    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useResultsImageViewer({ image: mockImage1, images: mockImages, isOpen: true })
    );

    // Assert: Verify that the hook exposes the mocked values correctly.
    expect(result.current.isMobile).toBe(true);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.isImageLoaded).toBe(false);
    expect(result.current.imageContainerRef).toBeDefined();
  });

  /**
   * Test case to verify that the correct image URL with version query is passed to the rendering hook.
   */
  it("passes correct derived URL to useRenderedImage", () => {
    // Arrange: Render the hook with a versioned image.
    renderHook(() =>
      useResultsImageViewer({ image: mockImage1, images: mockImages, isOpen: true })
    );

    // Assert: Verify useRenderedImage was called with the correct versioned URL.
    expect(useRenderedImage).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: "image-1.jpg?v=1",
      })
    );
  });

  /**
   * Test case to verify that a null URL is passed to the rendering hook when no image is active.
   */
  it("passes null URL to useRenderedImage if activeImage is null", () => {
    // Arrange: Render the hook with no image.
    renderHook(() => useResultsImageViewer({ image: null, images: mockImages, isOpen: true }));

    // Assert: Verify useRenderedImage received a null URL.
    expect(useRenderedImage).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: null,
      })
    );
  });
});
