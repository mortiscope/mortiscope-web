import { describe, expect, it } from "vitest";

import { act, renderHook } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { usePreviewTransform } from "@/features/images/hooks/use-preview-transform";

// Mock files used to simulate switching between different images.
const mockFile1 = { id: "1", name: "image-1.jpg" } as unknown as UploadableFile;
const mockFile2 = { id: "2", name: "image-2.jpg" } as unknown as UploadableFile;

// The expected initial state for image transformations (zoom/pan).
const defaultTransform = {
  scale: 1,
  positionX: 0,
  positionY: 0,
  previousScale: 1,
};

// Test suite for the `usePreviewTransform` hook, verifying zoom, pan, and state reset logic.
describe("usePreviewTransform", () => {
  /**
   * Test case to verify that the hook initializes with default transformation values.
   */
  it("initializes with default transform state", () => {
    // Arrange: Render the hook with a mock file.
    const { result } = renderHook(() => usePreviewTransform(mockFile1, true));

    // Assert: Verify that transform state matches defaults and viewing box is empty.
    expect(result.current.transformState).toEqual(defaultTransform);
    expect(result.current.viewingBox).toEqual({});
  });

  /**
   * Test case to verify that the transform state can be updated manually.
   */
  it("updates transform state correctly", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePreviewTransform(mockFile1, true));

    const newTransform = {
      scale: 2,
      positionX: -100,
      positionY: -50,
      previousScale: 1,
    };

    // Act: Update the transform state with new values.
    act(() => {
      result.current.setTransformState(newTransform);
    });

    // Assert: Verify the state reflects the updates.
    expect(result.current.transformState).toEqual(newTransform);
  });

  /**
   * Test case to verify that the viewing box dimensions can be updated.
   */
  it("updates viewing box state correctly", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePreviewTransform(mockFile1, true));

    const newBox = {
      content: { width: 1000, height: 1000 },
      wrapper: { width: 500, height: 500 },
    };

    // Act: Update the viewing box state.
    act(() => {
      result.current.setViewingBox(newBox);
    });

    // Assert: Verify the viewing box state is updated.
    expect(result.current.viewingBox).toEqual(newBox);
  });

  /**
   * Test case to verify that state resets to defaults when the active file changes.
   */
  it("resets state when activeFile changes", () => {
    // Arrange: Render the hook with the first mock file.
    const { result, rerender } = renderHook(({ file, open }) => usePreviewTransform(file, open), {
      initialProps: { file: mockFile1, open: true },
    });

    // Act: Modify the transform and viewing box state.
    act(() => {
      result.current.setTransformState({
        scale: 3,
        positionX: 50,
        positionY: 50,
        previousScale: 2,
      });
      result.current.setViewingBox({ content: { width: 100, height: 100 } });
    });

    // Assert: Verify the state modification took effect.
    expect(result.current.transformState.scale).toBe(3);

    // Act: Rerender with a different file.
    rerender({ file: mockFile2, open: true });

    // Assert: Verify that state has reset to default values.
    expect(result.current.transformState).toEqual(defaultTransform);
    expect(result.current.viewingBox).toEqual({});
  });

  /**
   * Test case to verify that state resets when the modal is closed and re-opened.
   */
  it("resets state when modal re-opens (isOpen toggles)", () => {
    // Arrange: Render the hook.
    const { result, rerender } = renderHook(({ file, open }) => usePreviewTransform(file, open), {
      initialProps: { file: mockFile1, open: true },
    });

    // Act: Modify the transform state.
    act(() => {
      result.current.setTransformState({
        scale: 1.5,
        positionX: 10,
        positionY: 10,
        previousScale: 1,
      });
    });

    // Act: Close the modal.
    rerender({ file: mockFile1, open: false });

    // Assert: Verify reset occurs immediately on close.
    expect(result.current.transformState).toEqual(defaultTransform);

    // Act: Re-open the modal.
    rerender({ file: mockFile1, open: true });
    // Assert: Verify state remains default.
    expect(result.current.transformState).toEqual(defaultTransform);
  });

  /**
   * Test case to ensure state persists if the activeFile becomes null.
   */
  it("does not reset state when activeFile is null", () => {
    // Arrange: Render the hook.
    const { result, rerender } = renderHook(({ file, open }) => usePreviewTransform(file, open), {
      initialProps: { file: mockFile1, open: true },
    });

    const modifiedState = {
      scale: 2,
      positionX: 100,
      positionY: 100,
      previousScale: 1,
    };
    // Act: Modify the transform state.
    act(() => {
      result.current.setTransformState(modifiedState);
    });
    expect(result.current.transformState).toEqual(modifiedState);

    // Act: Rerender with a null file.
    rerender({ file: null as unknown as UploadableFile, open: true });

    // Assert: Verify state remains unchanged.
    expect(result.current.transformState).toEqual(modifiedState);
  });
});
