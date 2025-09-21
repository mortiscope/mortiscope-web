import { describe, expect, it } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { usePreviewFileState } from "@/features/images/hooks/use-preview-file-state";

// Mock file object used as default test data.
const mockFile = {
  id: "1",
  name: "image.jpg",
} as unknown as UploadableFile;

// Test suite for `usePreviewFileState` hook verifying state initialization and filename parsing logic.
describe("usePreviewFileState", () => {
  /**
   * Test case to verify that the hook initializes state correctly based on the provided file prop.
   */
  it("initializes with the provided file", () => {
    // Arrange: Render the hook with a mock file.
    const { result } = renderHook(() => usePreviewFileState({ file: mockFile, isOpen: true }));

    // Assert: Check that activeFile and displayFileName match the input.
    expect(result.current.activeFile).toEqual(mockFile);
    expect(result.current.displayFileName).toBe("image.jpg");
  });

  /**
   * Test case to verify that the hook correctly splits the file name into base name and extension.
   */
  it("parses base name and extension correctly", () => {
    // Arrange: Render the hook with a standard filename.
    const { result } = renderHook(() => usePreviewFileState({ file: mockFile, isOpen: true }));

    // Assert: Verify the name is split correctly.
    expect(result.current.fileNameBase).toBe("image");
    expect(result.current.fileExtension).toBe("jpg");
  });

  /**
   * Test case to verify that internal state updates when the input file prop changes.
   */
  it("updates state when prop file changes", () => {
    // Arrange: Render the hook with the initial file.
    const { result, rerender } = renderHook(
      ({ file }) => usePreviewFileState({ file, isOpen: true }),
      { initialProps: { file: mockFile } }
    );

    const newFile = { id: "2", name: "document.pdf" } as unknown as UploadableFile;

    // Act: Rerender the hook with a new file object.
    rerender({ file: newFile });

    // Assert: Check that all state variables reflect the new file.
    expect(result.current.activeFile).toEqual(newFile);
    expect(result.current.fileNameBase).toBe("document");
    expect(result.current.fileExtension).toBe("pdf");
  });

  /**
   * Test case to verify correct parsing for file names containing multiple periods.
   */
  it("handles complex file names with multiple dots", () => {
    // Arrange: Create a file object with a complex name.
    const complexFile = { id: "3", name: "my.archive.tar.gz" } as unknown as UploadableFile;

    // Act: Render the hook with the complex file.
    const { result } = renderHook(() => usePreviewFileState({ file: complexFile, isOpen: true }));

    // Assert: Check that the extension is derived from the last segment.
    expect(result.current.fileNameBase).toBe("my.archive.tar");
    expect(result.current.fileExtension).toBe("gz");
  });

  /**
   * Test case to verify behavior when the file name has no extension.
   */
  it("handles files without extensions", () => {
    // Arrange: Create a file object with no file extension.
    const noExtFile = { id: "4", name: "image" } as unknown as UploadableFile;

    // Act: Render the hook with the no-extension file.
    const { result } = renderHook(() => usePreviewFileState({ file: noExtFile, isOpen: true }));

    // Assert: Verify how the split logic handles missing extensions.
    expect(result.current.fileNameBase).toBe("");

    expect(result.current.fileExtension).toBe("image");
  });

  /**
   * Test case to verify hook behavior when initializing with or transitioning to a null file.
   */
  it("handles initialization and updates with null file", () => {
    // Arrange: Initialize the hook with a null file.
    const { result, rerender } = renderHook(
      ({ file }) => usePreviewFileState({ file, isOpen: true }),
      {
        initialProps: { file: null as unknown as UploadableFile },
      }
    );

    // Assert: Verify empty state values for null input.
    expect(result.current.activeFile).toBeNull();
    expect(result.current.fileNameBase).toBe("");
    expect(result.current.fileExtension).toBe("");
    expect(result.current.displayFileName).toBe("");

    // Act: Rerender with a valid file.
    rerender({ file: mockFile });
    // Assert: Verify state updates to reflect the valid file.
    expect(result.current.activeFile).toEqual(mockFile);
    expect(result.current.fileNameBase).toBe("image");

    // Act: Rerender with null again.
    rerender({ file: null as unknown as UploadableFile });

    // Assert: Check that activeFile becomes null.
    expect(result.current.activeFile).toBeNull();

    // Assert: Verify that the previous file name persists despite file being null.
    expect(result.current.fileNameBase).toBe("image");
  });
});
