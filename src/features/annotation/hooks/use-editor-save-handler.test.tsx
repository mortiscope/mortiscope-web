import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { saveDetections } from "@/features/annotation/actions/save-detections";
import { shouldShowSaveConfirmation } from "@/features/annotation/components/save-confirmation-modal";
import { useEditorSaveHandler } from "@/features/annotation/hooks/use-editor-save-handler";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { calculateDetectionChanges } from "@/features/annotation/utils/calculate-detection-changes";

// Mock the server action responsible for persisting detection data to the database.
vi.mock("@/features/annotation/actions/save-detections", () => ({
  saveDetections: vi.fn(),
}));

// Mock the utility that computes differences between current and original detection states.
vi.mock("@/features/annotation/utils/calculate-detection-changes", () => ({
  calculateDetectionChanges: vi.fn(),
}));

// Mock the logic determining if a confirmation modal should be displayed to the user.
vi.mock("@/features/annotation/components/save-confirmation-modal", () => ({
  shouldShowSaveConfirmation: vi.fn(),
}));

// Mock the annotation store to manage detection state and history tracking.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

type ExtractState<T> = T extends (selector: (state: infer S) => unknown) => unknown ? S : never;
type AnnotationState = ExtractState<typeof useAnnotationStore>;

// Create a wrapper to provide the React Query context required for mutation handling.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

/**
 * Test suite for the `useEditorSaveHandler` hook which coordinates data persistence logic.
 */
describe("useEditorSaveHandler", () => {
  const mockImageId = "img-1";
  const mockResultsId = "case-1";
  const mockCommitChanges = vi.fn();
  const mockDetections = [{ id: "1" }];
  const mockOriginalDetections = [{ id: "1" }];

  // Reset all mocks and define default successful behaviors before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    (useAnnotationStore as unknown as Mock).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        const state = {
          hasChanges: () => true,
          detections: mockDetections,
          originalDetections: mockOriginalDetections,
          commitChanges: mockCommitChanges,
        } as unknown as AnnotationState;
        return selector(state);
      }
    );

    (calculateDetectionChanges as Mock).mockReturnValue({
      added: [],
      modified: [{ id: "1" }],
      deleted: [],
    });

    (saveDetections as Mock).mockResolvedValue({ success: true });

    (shouldShowSaveConfirmation as Mock).mockReturnValue(true);
  });

  /**
   * Verify that the hook triggers the confirmation modal when specific save conditions are met.
   */
  it("handles save click by opening modal if confirmation is required", () => {
    // Arrange: Render the hook within the query provider.
    const { result } = renderHook(() => useEditorSaveHandler(mockImageId, mockResultsId), {
      wrapper: createWrapper(),
    });

    // Act: Simulate a user clicking the save button.
    act(() => {
      result.current.handleSaveClick();
    });

    // Assert: Check that the modal state is updated and the server action is not yet called.
    expect(result.current.isSaveModalOpen).toBe(true);
    expect(saveDetections).not.toHaveBeenCalled();
  });

  /**
   * Verify that the hook skips the modal and persists data immediately when confirmation is unnecessary.
   */
  it("handles save click by saving immediately if confirmation is NOT required", async () => {
    // Arrange: Force the confirmation logic to return false.
    (shouldShowSaveConfirmation as Mock).mockReturnValue(false);

    const { result } = renderHook(() => useEditorSaveHandler(mockImageId, mockResultsId), {
      wrapper: createWrapper(),
    });

    // Act: Simulate a user clicking the save button.
    act(() => {
      result.current.handleSaveClick();
    });

    // Assert: Verify the interaction bypasses the modal and executes the save process.
    expect(result.current.isSaving).toBe(true);

    await waitFor(() => expect(result.current.isSaving).toBe(false));

    expect(result.current.isSaveModalOpen).toBe(false);
    expect(saveDetections).toHaveBeenCalled();
  });

  /**
   * Verify the full successful save lifecycle, including delta calculation and store commitment.
   */
  it("performs save successfully", async () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useEditorSaveHandler(mockImageId, mockResultsId), {
      wrapper: createWrapper(),
    });

    // Act: Manually trigger the internal save logic.
    await act(async () => {
      await result.current.handleSave();
    });

    // Assert: Ensure changes were calculated, sent to the server, and store history was updated.
    expect(calculateDetectionChanges).toHaveBeenCalledWith(
      mockDetections,
      mockOriginalDetections,
      mockImageId
    );
    expect(saveDetections).toHaveBeenCalledWith(mockImageId, mockResultsId, expect.anything());
    expect(mockCommitChanges).toHaveBeenCalled();
  });

  /**
   * Ensure that the save process terminates early if the computed delta contains no changes.
   */
  it("aborts save if there are no actual changes calculated", async () => {
    // Arrange: Mock the utility to return empty change arrays.
    (calculateDetectionChanges as Mock).mockReturnValue({
      added: [],
      modified: [],
      deleted: [],
    });

    const { result } = renderHook(() => useEditorSaveHandler(mockImageId, mockResultsId), {
      wrapper: createWrapper(),
    });

    // Act: Attempt to perform a save.
    await act(async () => {
      await result.current.handleSave();
    });

    // Assert: Verify the server action was bypassed and store state remained unchanged.
    expect(saveDetections).not.toHaveBeenCalled();
    expect(mockCommitChanges).not.toHaveBeenCalled();
  });

  /**
   * Verify that network or server errors are caught and logged without breaking the hook state.
   */
  it("handles save errors gracefully", async () => {
    // Arrange: Spy on the console and force the server action to fail.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (saveDetections as Mock).mockRejectedValue(new Error("Save failed"));

    const { result } = renderHook(() => useEditorSaveHandler(mockImageId, mockResultsId), {
      wrapper: createWrapper(),
    });

    // Act: Trigger the save logic.
    await act(async () => {
      await result.current.handleSave();
    });

    // Assert: Verify the error was logged and saving flags were reset.
    expect(consoleSpy).toHaveBeenCalledWith("Error saving detections:", expect.any(Error));
    expect(result.current.isSaving).toBe(false);
    expect(mockCommitChanges).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  /**
   * Ensure the local store does not clear its dirty state if the server reports a failure.
   */
  it("does not commit changes if server response is not successful", async () => {
    // Arrange: Mock a response indicating a server-side failure.
    (saveDetections as Mock).mockResolvedValue({ success: false });

    const { result } = renderHook(() => useEditorSaveHandler(mockImageId, mockResultsId), {
      wrapper: createWrapper(),
    });

    // Act: Trigger the save logic.
    await act(async () => {
      await result.current.handleSave();
    });

    // Assert: Verify the attempt was made but local changes were not committed to history.
    expect(saveDetections).toHaveBeenCalled();
    expect(mockCommitChanges).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });
});
