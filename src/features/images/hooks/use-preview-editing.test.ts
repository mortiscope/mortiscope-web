import React from "react";
import { describe, expect, it, vi } from "vitest";

import { act, renderHook } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { usePreviewEditing } from "@/features/images/hooks/use-preview-editing";

// Mock file object used as default test data.
const mockFile = {
  id: "1",
  name: "test-file.jpg",
} as unknown as UploadableFile;

// Test suite for the `usePreviewEditing` hook, verifying state management and side effects.
describe("usePreviewEditing", () => {
  /**
   * Test case to verify that the hook initializes with default state values.
   */
  it("initializes with default values", () => {
    // Arrange: Render the hook with a mock file and open state.
    const { result } = renderHook(() => usePreviewEditing(mockFile, true));

    // Assert: Check that all boolean flags default to false.
    expect(result.current.isNameDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.isRenaming).toBe(false);
  });

  /**
   * Test case to ensure state is reset when the activeFile changes.
   */
  it("resets state when activeFile changes", () => {
    // Arrange: Render the hook with ability to rerender with new props.
    const { result, rerender } = renderHook(({ file, open }) => usePreviewEditing(file, open), {
      initialProps: { file: mockFile, open: true },
    });

    // Act: Manually modify the internal state.
    act(() => {
      result.current.setIsNameDirty(true);
      result.current.setIsRenaming(true);
    });

    // Assert: Verify state was modified.
    expect(result.current.isNameDirty).toBe(true);

    // Act: Rerender the hook with a different file ID.
    const newFile = { ...mockFile, id: "2" } as unknown as UploadableFile;
    rerender({ file: newFile, open: true });

    // Assert: Verify that flags reset to false.
    expect(result.current.isNameDirty).toBe(false);
    expect(result.current.isRenaming).toBe(false);
  });

  /**
   * Test case to ensure state is reset when the modal closes (isOpen becomes false).
   */
  it("resets state when modal closes (isOpen changes)", () => {
    // Arrange: Render the hook.
    const { result, rerender } = renderHook(({ file, open }) => usePreviewEditing(file, open), {
      initialProps: { file: mockFile, open: true },
    });

    // Act: Set the deleting state to true.
    act(() => {
      result.current.setIsDeleting(true);
    });

    // Act: Rerender with open set to false.
    rerender({ file: mockFile, open: false });

    // Assert: Verify that deleting state resets to false.
    expect(result.current.isDeleting).toBe(false);
  });

  /**
   * Test case to verify that the dirty state is set upon the first input change event.
   */
  it("sets isNameDirty to true on first change event", () => {
    // Arrange: Render the hook and create a mock setter.
    const { result } = renderHook(() => usePreviewEditing(mockFile, true));
    const setFileNameBaseMock = vi.fn();

    const event = { target: { value: "New Name" } } as React.ChangeEvent<HTMLInputElement>;

    // Act: Trigger the name change handler.
    act(() => {
      result.current.handleNameChange(event, setFileNameBaseMock);
    });

    // Assert: Verify the external setter was called and internal dirty state updated.
    expect(setFileNameBaseMock).toHaveBeenCalledWith("New Name");
    expect(result.current.isNameDirty).toBe(true);
  });

  /**
   * Test case to verify that the input element receives focus and selection when renaming mode is activated.
   */
  it("focuses and selects input when entering renaming mode", () => {
    // Arrange: Render the hook and mock DOM element methods.
    const { result } = renderHook(() => usePreviewEditing(mockFile, true));

    const focusMock = vi.fn();
    const selectMock = vi.fn();

    const mockInputElement = {
      focus: focusMock,
      select: selectMock,
    } as unknown as HTMLInputElement;

    // Arrange: Manually assign the mock element to the ref.
    (result.current.titleInputRef as React.MutableRefObject<HTMLInputElement>).current =
      mockInputElement;

    // Act: Enable renaming mode.
    act(() => {
      result.current.setIsRenaming(true);
    });

    // Assert: Check that focus and select methods were called on the input.
    expect(focusMock).toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalled();
  });

  /**
   * Test case to ensure state persists if the activeFile becomes null.
   */
  it("does not reset state when activeFile is null", () => {
    // Arrange: Render the hook.
    const { result, rerender } = renderHook(({ file, open }) => usePreviewEditing(file, open), {
      initialProps: { file: mockFile, open: true },
    });

    // Act: Modify the state.
    act(() => {
      result.current.setIsNameDirty(true);
    });

    // Act: Rerender with a null file.
    rerender({ file: null as unknown as UploadableFile, open: true });

    // Assert: Verify state remains dirty and did not reset.
    expect(result.current.isNameDirty).toBe(true);
  });

  /**
   * Test case to verify that redundant state updates are avoided if isNameDirty is already true.
   */
  it("does not trigger update if isNameDirty is already true", () => {
    // Arrange: Render the hook and setup mocks.
    const { result } = renderHook(() => usePreviewEditing(mockFile, true));
    const setFileNameBaseMock = vi.fn();
    const event = { target: { value: "New Name" } } as React.ChangeEvent<HTMLInputElement>;

    // Act: Trigger change once to set dirty state.
    act(() => {
      result.current.handleNameChange(event, setFileNameBaseMock);
    });
    expect(result.current.isNameDirty).toBe(true);

    // Act: Trigger change again.
    act(() => {
      result.current.handleNameChange(event, setFileNameBaseMock);
    });
    // Assert: Verify state remains consistent.
    expect(result.current.isNameDirty).toBe(true);
  });
});
