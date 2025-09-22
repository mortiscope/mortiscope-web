import { act, renderHook } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { usePreviewRotation } from "@/features/images/hooks/use-preview-rotation";

// Mock file object used as default test data.
const mockFile: UploadableFile = {
  id: "image-1",
  key: "image-1.jpg",
  name: "image-1.jpg",
  url: "http://localhost:3000/image-1.jpg",
  size: 1024,
  type: "image/jpeg",
  status: "success",
  progress: 100,
  source: "db",
  dateUploaded: new Date(),
  version: 1,
};

// Test suite for the `usePreviewRotation` hook, verifying rotation logic and state resets.
describe("usePreviewRotation", () => {
  /**
   * Test case to verify that the hook initializes with default rotation values.
   */
  it("should initialize with default values", () => {
    // Arrange: Render the hook with a mock file and open state.
    const { result } = renderHook(() => usePreviewRotation(mockFile, true));

    // Assert: Verify initial rotation is 0 and dirty state is false.
    expect(result.current.rotation).toBe(0);
    expect(result.current.isRotationDirty).toBe(false);
  });

  /**
   * Test case to verify that handleRotate increments rotation by 90 degrees and updates dirty state.
   */
  it("should rotate by 90 degrees and mark as dirty", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePreviewRotation(mockFile, true));

    // Act: Rotate the image once.
    act(() => {
      result.current.handleRotate();
    });

    // Assert: Verify rotation is 90 and state is dirty.
    expect(result.current.rotation).toBe(90);
    expect(result.current.isRotationDirty).toBe(true);

    // Act: Rotate again to 180 degrees.
    act(() => {
      result.current.handleRotate();
    });

    // Assert: Verify rotation is 180.
    expect(result.current.rotation).toBe(180);

    // Act: Rotate again to 270 degrees.
    act(() => {
      result.current.handleRotate();
    });

    // Assert: Verify rotation is 270.
    expect(result.current.rotation).toBe(270);

    // Act: Rotate again to complete the circle.
    act(() => {
      result.current.handleRotate();
    });

    // Assert: Verify rotation resets to 0.
    expect(result.current.rotation).toBe(0);
  });

  /**
   * Test case to verify that the reset function restores default state.
   */
  it("should reset rotation state explicitly", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePreviewRotation(mockFile, true));

    // Act: Rotate the image to change state.
    act(() => {
      result.current.handleRotate();
    });

    // Assert: Verify rotation is applied.
    expect(result.current.rotation).toBe(90);
    expect(result.current.isRotationDirty).toBe(true);

    // Act: Call the reset function.
    act(() => {
      result.current.resetRotation();
    });

    // Assert: Verify rotation returns to 0 and dirty state is cleared.
    expect(result.current.rotation).toBe(0);
    expect(result.current.isRotationDirty).toBe(false);
  });

  /**
   * Test case to verify that state resets when the active file changes.
   */
  it("should reset state when active file changes", () => {
    // Arrange: Render the hook with the initial file.
    const { result, rerender } = renderHook(
      ({ file, isOpen }) => usePreviewRotation(file, isOpen),
      {
        initialProps: { file: mockFile, isOpen: true },
      }
    );

    // Act: Rotate the image.
    act(() => {
      result.current.handleRotate();
    });

    // Assert: Verify rotation is applied.
    expect(result.current.rotation).toBe(90);

    // Act: Rerender with a new file.
    const newFile = { ...mockFile, id: "image-2" };
    rerender({ file: newFile, isOpen: true });

    // Assert: Verify state resets to defaults for the new file.
    expect(result.current.rotation).toBe(0);
    expect(result.current.isRotationDirty).toBe(false);
  });

  /**
   * Test case to verify that state resets when the modal closes (isOpen becomes false).
   */
  it("should reset state when modal open state changes", () => {
    // Arrange: Render the hook.
    const { result, rerender } = renderHook(
      ({ file, isOpen }) => usePreviewRotation(file, isOpen),
      {
        initialProps: { file: mockFile, isOpen: true },
      }
    );

    // Act: Rotate the image.
    act(() => {
      result.current.handleRotate();
    });

    // Assert: Verify rotation is applied.
    expect(result.current.rotation).toBe(90);

    // Act: Rerender with isOpen set to false.
    rerender({ file: mockFile, isOpen: false });

    // Assert: Verify state resets to defaults.
    expect(result.current.rotation).toBe(0);
    expect(result.current.isRotationDirty).toBe(false);
  });

  /**
   * Test case to verify that dirty state can be manually set.
   */
  it("should allow manual setting of dirty state", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePreviewRotation(mockFile, true));

    // Act: Manually set the dirty flag.
    act(() => {
      result.current.setIsRotationDirty(true);
    });

    // Assert: Verify the dirty flag is true.
    expect(result.current.isRotationDirty).toBe(true);
  });

  /**
   * Test case to ensure state persists if the activeFile becomes null.
   */
  it("does not reset state when activeFile is null", () => {
    // Arrange: Render the hook.
    const { result, rerender } = renderHook(
      ({ file, isOpen }) => usePreviewRotation(file, isOpen),
      {
        initialProps: { file: mockFile, isOpen: true },
      }
    );

    // Act: Rotate the image.
    act(() => {
      result.current.handleRotate();
    });
    expect(result.current.rotation).toBe(90);

    // Act: Rerender with a null file.
    rerender({ file: null as unknown as UploadableFile, isOpen: true });

    // Assert: Verify rotation state remains unchanged.
    expect(result.current.rotation).toBe(90);
  });
});
