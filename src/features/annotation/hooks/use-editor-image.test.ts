import { useParams } from "next/navigation";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { getEditorImage } from "@/features/annotation/actions/get-editor-image";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";

// Mock the server action responsible for retrieving detailed image and detection data.
vi.mock("@/features/annotation/actions/get-editor-image", () => ({
  getEditorImage: vi.fn(),
}));

/**
 * Test suite for the `useEditorImage` hook which manages fetching image data based on URL parameters.
 */
describe("useEditorImage", () => {
  // Clear all mock history before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Verify that the hook handles scenarios where the required URL identifiers are missing.
   */
  it("returns null and stops loading if params are missing", async () => {
    // Arrange: Mock `useParams` to return an empty object.
    (useParams as Mock).mockReturnValue({});

    // Act: Render the hook.
    const { result } = renderHook(() => useEditorImage());

    // Assert: Verify that loading concludes and no data fetching was attempted.
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.image).toBeNull();
    expect(getEditorImage).not.toHaveBeenCalled();
  });

  /**
   * Verify that the hook successfully fetches and exposes image data when valid parameters exist.
   */
  it("fetches and returns image data when params are present", async () => {
    // Arrange: Provide valid identifiers via the `useParams` mock.
    (useParams as Mock).mockReturnValue({
      resultsId: "case-1",
      imageId: "img-1",
    });

    const mockDate = new Date("2025-01-01");
    const mockImageData = {
      id: "img-1",
      name: "Test Image",
      url: "http://example.com/image.jpg",
      size: 1024,
      dateUploaded: mockDate,
      detections: [],
    };

    // Act: Mock a successful promise resolution for the image fetch.
    (getEditorImage as Mock).mockResolvedValue(mockImageData);

    const { result } = renderHook(() => useEditorImage());

    // Assert: Verify the transition from loading state to data availability.
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getEditorImage).toHaveBeenCalledWith("img-1", "case-1");
    expect(result.current.image).toEqual(mockImageData);
  });

  /**
   * Ensure that the hook catches errors during the fetch process and logs them accordingly.
   */
  it("handles errors during fetch gracefully", async () => {
    // Arrange: Set up params and spy on the console to verify error logging.
    (useParams as Mock).mockReturnValue({
      resultsId: "case-1",
      imageId: "img-1",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Mock a rejected promise from the fetch action.
    (getEditorImage as Mock).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useEditorImage());

    // Assert: Verify that loading stops, the image is null, and the error is logged.
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.image).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching editor image:", expect.any(Error));

    consoleSpy.mockRestore();
  });

  /**
   * Verify that the hook re-triggers the data fetch when URL parameters change.
   */
  it("updates when params change", async () => {
    // Arrange: Initialize the hook with the first set of parameters.
    (useParams as Mock).mockReturnValue({
      resultsId: "case-1",
      imageId: "img-1",
    });

    (getEditorImage as Mock).mockResolvedValue({ id: "img-1", name: "Image 1" });

    const { result, rerender } = renderHook(() => useEditorImage());

    await waitFor(() => expect(result.current.image?.id).toBe("img-1"));

    // Act: Change the `imageId` parameter and trigger a re-render.
    (useParams as Mock).mockReturnValue({
      resultsId: "case-1",
      imageId: "img-2",
    });

    (getEditorImage as Mock).mockResolvedValue({ id: "img-2", name: "Image 2" });

    rerender();

    // Assert: Verify that a second fetch was initiated with the new `imageId`.
    await waitFor(() => expect(result.current.image?.id).toBe("img-2"));

    expect(getEditorImage).toHaveBeenCalledTimes(2);
    expect(getEditorImage).toHaveBeenLastCalledWith("img-2", "case-1");
  });
});
