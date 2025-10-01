import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDetectionPanel } from "@/features/annotation/hooks/use-detection-panel";
import { Detection } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

// Mock the annotation store to control state selection and track action calls.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

type ExtractState<T> = T extends (selector: (state: infer S) => unknown) => unknown ? S : never;
type AnnotationState = ExtractState<typeof useAnnotationStore>;

/**
 * Utility function to create a standardized detection object for testing purposes.
 */
const createDetection = (id: string, overrides: Partial<Detection> = {}): Detection => ({
  id,
  label: "adult",
  originalLabel: "adult",
  confidence: 0.9,
  originalConfidence: 0.9,
  xMin: 0,
  yMin: 0,
  xMax: 100,
  yMax: 100,
  status: "model_generated",
  uploadId: "img-1",
  createdById: "user-1",
  lastModifiedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

/**
 * Test suite for the `useDetectionPanel` hook which manages the side panel for individual annotations.
 */
describe("useDetectionPanel", () => {
  const mockUpdateDetection = vi.fn();
  const mockRemoveDetection = vi.fn();
  const mockClearSelection = vi.fn();
  const mockSetSelectMode = vi.fn();

  // Initialize mocks with default behavior and sample data before each test execution.
  beforeEach(() => {
    vi.clearAllMocks();

    const defaultDetections = [createDetection("det-1", { label: "adult" })];

    vi.mocked(useAnnotationStore).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        const state = {
          selectedDetectionId: "det-1",
          isPanelOpen: true,
          detections: defaultDetections,
          updateDetection: mockUpdateDetection,
          removeDetection: mockRemoveDetection,
          clearSelection: mockClearSelection,
          setSelectMode: mockSetSelectMode,
        } as unknown as AnnotationState;
        return selector(state);
      }
    );
  });

  /**
   * Verify that the hook correctly identifies the selected detection upon mounting.
   */
  it("initializes with the correct selected detection", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useDetectionPanel());

    // Assert: Verify that store identifiers and the derived detection object are correctly mapped.
    expect(result.current.selectedDetectionId).toBe("det-1");
    expect(result.current.isPanelOpen).toBe(true);
    expect(result.current.displayedDetection).toBeDefined();
    expect(result.current.displayedDetection?.id).toBe("det-1");
  });

  /**
   * Verify that changes in the underlying store data are reflected in the hook output.
   */
  it("updates local state when the selected detection changes in the store", () => {
    // Arrange: Render the hook and prepare an updated data set.
    const { result, rerender } = renderHook(() => useDetectionPanel());
    expect(result.current.displayedDetection?.label).toBe("adult");

    const updatedDetections = [createDetection("det-1", { label: "pupa" })];

    // Act: Update the store mock implementation to return the new label.
    vi.mocked(useAnnotationStore).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        const state = {
          selectedDetectionId: "det-1",
          isPanelOpen: true,
          detections: updatedDetections,
          updateDetection: mockUpdateDetection,
          removeDetection: mockRemoveDetection,
          clearSelection: mockClearSelection,
          setSelectMode: mockSetSelectMode,
        } as unknown as AnnotationState;
        return selector(state);
      }
    );

    rerender();

    // Assert: Verify that the hook now returns the updated label from the store.
    expect(result.current.displayedDetection?.label).toBe("pupa");
  });

  /**
   * Verify that the hook triggers the store update when a new label is selected.
   */
  it("handles label change correctly", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useDetectionPanel());

    // Act: Invoke the label change handler.
    act(() => {
      result.current.handleLabelChange("instar_1");
    });

    // Assert: Check that the store update was called with the target ID and new label.
    expect(mockUpdateDetection).toHaveBeenCalledWith("det-1", { label: "instar_1" });
  });

  /**
   * Ensure that label change requests are ignored if no detection is currently active.
   */
  it("does not update label if no detection is selected", () => {
    // Arrange: Mock a state where no detection is selected.
    const emptyDetections: Detection[] = [];
    vi.mocked(useAnnotationStore).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        const state = {
          selectedDetectionId: null,
          isPanelOpen: false,
          detections: emptyDetections,
          updateDetection: mockUpdateDetection,
          removeDetection: mockRemoveDetection,
          clearSelection: mockClearSelection,
          setSelectMode: mockSetSelectMode,
        } as unknown as AnnotationState;
        return selector(state);
      }
    );

    const { result } = renderHook(() => useDetectionPanel());

    // Act: Attempt to change the label.
    act(() => {
      result.current.handleLabelChange("instar_1");
    });

    // Assert: Verify that the store update was never triggered.
    expect(mockUpdateDetection).not.toHaveBeenCalled();
  });

  /**
   * Verify that user verification updates the detection status in the store.
   */
  it("handles verification correctly", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useDetectionPanel());

    // Act: Invoke the verification handler.
    act(() => {
      result.current.handleVerify();
    });

    // Assert: Verify the status is updated to user_confirmed in the store.
    expect(mockUpdateDetection).toHaveBeenCalledWith("det-1", { status: "user_confirmed" });
  });

  /**
   * Ensure that verification requests are ignored if no detection is currently active.
   */
  it("does not verify if no detection is selected", () => {
    // Arrange: Mock a state where the selection is empty.
    const emptyDetections: Detection[] = [];
    vi.mocked(useAnnotationStore).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        const state = {
          selectedDetectionId: null,
          isPanelOpen: false,
          detections: emptyDetections,
          updateDetection: mockUpdateDetection,
          removeDetection: mockRemoveDetection,
          clearSelection: mockClearSelection,
          setSelectMode: mockSetSelectMode,
        } as unknown as AnnotationState;
        return selector(state);
      }
    );

    const { result } = renderHook(() => useDetectionPanel());

    // Act: Attempt to verify.
    act(() => {
      result.current.handleVerify();
    });

    // Assert: Verify that no store update call was made.
    expect(mockUpdateDetection).not.toHaveBeenCalled();
  });

  /**
   * Verify that the deletion handler triggers the removal of the detection from the store.
   */
  it("handles deletion correctly", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useDetectionPanel());

    // Act: Invoke the deletion handler.
    act(() => {
      result.current.handleDelete();
    });

    // Assert: Check that the store remove action was called with the correct identifier.
    expect(mockRemoveDetection).toHaveBeenCalledWith("det-1");
  });

  /**
   * Ensure that deletion requests are ignored if no detection is currently active.
   */
  it("does not delete if no detection is selected", () => {
    // Arrange: Mock an empty state.
    const emptyDetections: Detection[] = [];
    vi.mocked(useAnnotationStore).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        const state = {
          selectedDetectionId: null,
          isPanelOpen: false,
          detections: emptyDetections,
          updateDetection: mockUpdateDetection,
          removeDetection: mockRemoveDetection,
          clearSelection: mockClearSelection,
          setSelectMode: mockSetSelectMode,
        } as unknown as AnnotationState;
        return selector(state);
      }
    );

    const { result } = renderHook(() => useDetectionPanel());

    // Act: Attempt to delete.
    act(() => {
      result.current.handleDelete();
    });

    // Assert: Verify that the store removal action was not triggered.
    expect(mockRemoveDetection).not.toHaveBeenCalled();
  });

  /**
   * Verify that closing the panel resets the selection and updates the interaction mode.
   */
  it("handles closing the panel correctly", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useDetectionPanel());

    // Act: Invoke the close handler.
    act(() => {
      result.current.handleClose();
    });

    // Assert: Verify that selection is cleared and select mode is disabled.
    expect(mockClearSelection).toHaveBeenCalled();
    expect(mockSetSelectMode).toHaveBeenCalledWith(false);
  });
});
