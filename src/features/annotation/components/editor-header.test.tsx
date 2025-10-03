import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { EditorHeader } from "@/features/annotation/components/editor-header";
import { useAnnotatedData } from "@/features/annotation/hooks/use-annotated-data";
import { useEditorNavigation } from "@/features/annotation/hooks/use-editor-navigation";
import { useEditorSaveHandler } from "@/features/annotation/hooks/use-editor-save-handler";
import {
  type AnnotationState,
  useAnnotationStore,
} from "@/features/annotation/store/annotation-store";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

// Mock the hook that provides data related to the annotated case and images.
vi.mock("@/features/annotation/hooks/use-annotated-data", () => ({
  useAnnotatedData: vi.fn(),
}));

// Mock the hook responsible for image-to-image and back navigation logic.
vi.mock("@/features/annotation/hooks/use-editor-navigation", () => ({
  useEditorNavigation: vi.fn(),
}));

// Mock the hook that manages the persistence and save state of annotations.
vi.mock("@/features/annotation/hooks/use-editor-save-handler", () => ({
  useEditorSaveHandler: vi.fn(),
}));

// Mock the global annotation store to control detection state in tests.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

// Mock the keyboard shortcut hook to verify listener registration.
vi.mock("react-hotkeys-hook", () => ({
  useHotkeys: vi.fn(),
}));

// Mock sub-component to isolate the header context section.
vi.mock("@/features/annotation/components/editor-header-context", () => ({
  EditorHeaderContext: vi.fn(() => <div data-testid="header-context" />),
}));

// Mock sub-component to isolate the navigation controls section.
vi.mock("@/features/annotation/components/editor-header-navigation", () => ({
  EditorHeaderNavigation: vi.fn(() => <div data-testid="header-navigation" />),
}));

// Mock sub-component to isolate the action buttons section.
vi.mock("@/features/annotation/components/editor-header-actions", () => ({
  EditorHeaderActions: vi.fn(() => <div data-testid="header-actions" />),
}));

// Mock the confirmation modal displayed when manually saving changes.
vi.mock("@/features/annotation/components/save-confirmation-modal", () => ({
  SaveConfirmationModal: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
    isOpen ? (
      <div data-testid="save-confirmation-modal">
        <button onClick={onConfirm}>Confirm Save</button>
      </div>
    ) : null,
}));

// Mock the modal displayed when a user attempts to navigate away with unsaved data.
vi.mock("@/features/annotation/components/unsaved-changes-modal", () => ({
  UnsavedChangesModal: ({
    isOpen,
    onProceed,
  }: {
    isOpen: boolean;
    onProceed: (action: string) => void;
  }) =>
    isOpen ? (
      <div data-testid="unsaved-changes-modal">
        <button onClick={() => onProceed("leave")}>Leave</button>
        <button onClick={() => onProceed("save-and-leave")}>Save and Leave</button>
      </div>
    ) : null,
}));

// Mock the status modal for fully verified annotations.
vi.mock("@/features/annotation/components/verified-status-modal", () => ({
  VerifiedStatusModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="verified-modal" /> : null,
}));

// Mock the status modal for unverified annotations.
vi.mock("@/features/annotation/components/unverified-status-modal", () => ({
  UnverifiedStatusModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="unverified-modal" /> : null,
}));

// Mock the status modal for partially verified annotations.
vi.mock("@/features/annotation/components/in-progress-status-modal", () => ({
  InProgressStatusModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="in-progress-modal" /> : null,
}));

// Mock the status modal for images with no detected objects.
vi.mock("@/features/annotation/components/no-detections-status-modal", () => ({
  NoDetectionsStatusModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="no-detections-modal" /> : null,
}));

/**
 * Test suite for the `EditorHeader` component.
 */
describe("EditorHeader", () => {
  // Define mock functions to track internal component interactions.
  const mockToggleMobileSidebar = vi.fn();
  const mockHandleSave = vi.fn();
  const mockHandleSaveClick = vi.fn();
  const mockHandleBackNavigation = vi.fn();
  const mockHandlePreviousImage = vi.fn();
  const mockHandleNextImage = vi.fn();
  const mockHandleToggleLock = vi.fn();
  const mockPendingNavigation = vi.fn();
  const mockSetPendingNavigation = vi.fn();
  const mockSetIsUnsavedChangesModalOpen = vi.fn();
  const mockSetIsSaveModalOpen = vi.fn();

  // Define default properties for the EditorHeader.
  const defaultProps = {
    isMobileSidebarOpen: false,
    onToggleMobileSidebar: mockToggleMobileSidebar,
    hasOpenPanel: false,
  };

  // Define default data for the annotated images list.
  const defaultAnnotatedData = {
    caseName: "Test Case",
    images: [
      { id: "img-1", name: "Image 1" },
      { id: "img-2", name: "Image 2" },
    ],
    totalImages: 2,
  };

  // Define default state for the navigation hook.
  const defaultNavigationState = {
    isLocked: false,
    isUnsavedChangesModalOpen: false,
    setIsUnsavedChangesModalOpen: mockSetIsUnsavedChangesModalOpen,
    pendingNavigation: null,
    setPendingNavigation: mockSetPendingNavigation,
    handleBackNavigation: mockHandleBackNavigation,
    handlePreviousImage: mockHandlePreviousImage,
    handleNextImage: mockHandleNextImage,
    handleToggleLock: mockHandleToggleLock,
  };

  // Reset all mocks and initialize hook return values before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useParams).mockReturnValue({
      resultsId: "case-123",
      imageId: "img-1",
    });

    vi.mocked(useAnnotatedData).mockReturnValue(
      defaultAnnotatedData as unknown as ReturnType<typeof useAnnotatedData>
    );

    vi.mocked(useAnnotationStore).mockImplementation((selector) =>
      selector({ detections: [] } as unknown as AnnotationState)
    );

    vi.mocked(useEditorSaveHandler).mockReturnValue({
      isSaving: false,
      hasChanges: false,
      isSaveModalOpen: false,
      setIsSaveModalOpen: mockSetIsSaveModalOpen,
      handleSave: mockHandleSave,
      handleSaveClick: mockHandleSaveClick,
    } as unknown as ReturnType<typeof useEditorSaveHandler>);

    vi.mocked(useEditorNavigation).mockReturnValue(
      defaultNavigationState as unknown as ReturnType<typeof useEditorNavigation>
    );
  });

  /**
   * Test case to verify that the main structural components of the header are rendered.
   */
  it("renders the three main header sections", () => {
    // Arrange: Render the header component.
    render(<EditorHeader {...defaultProps} />);

    // Assert: Verify that context, navigation, and actions containers exist.
    expect(screen.getByTestId("header-context")).toBeInTheDocument();
    expect(screen.getByTestId("header-navigation")).toBeInTheDocument();
    expect(screen.getByTestId("header-actions")).toBeInTheDocument();
  });

  /**
   * Test case to verify that image index and position logic calculates values correctly.
   */
  it("calculates current image position and name correctly", async () => {
    // Arrange: Render the header component.
    render(<EditorHeader {...defaultProps} />);

    // Act: Import mocked child components to inspect call arguments.
    const NavMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-navigation")
    ).EditorHeaderNavigation;
    const ContextMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-context")
    ).EditorHeaderContext;

    // Assert: Check that navigation receives the correct indices for the first image.
    expect(NavMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentImageIndex: 0,
        currentPosition: 1,
        totalImages: 2,
      }),
      undefined
    );

    // Assert: Check that context receives the correct image and case names.
    expect(ContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseName: "Test Case",
        currentImageName: "Image 1",
      }),
      undefined
    );
  });

  /**
   * Test case to verify the 'no_detections' status when the detection list is empty.
   */
  it("passes correct verification status 'no_detections' when detections array is empty", async () => {
    // Arrange: Mock the store to return an empty detections array.
    vi.mocked(useAnnotationStore).mockImplementation((selector) =>
      selector({ detections: [] } as unknown as AnnotationState)
    );

    // Act: Render the header.
    render(<EditorHeader {...defaultProps} />);

    // Assert: Verify that 'no_detections' is passed to the actions component.
    const ActionsMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-actions")
    ).EditorHeaderActions;
    expect(ActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ verificationStatus: "no_detections" }),
      undefined
    );
  });

  /**
   * Test case to verify the 'verified' status when all detections are confirmed by a user.
   */
  it("passes correct verification status 'verified' when all detections are confirmed", async () => {
    // Arrange: Mock the store with only confirmed detections.
    vi.mocked(useAnnotationStore).mockImplementation((selector) =>
      selector({
        detections: [{ status: "user_confirmed" }, { status: "user_edited_confirmed" }],
      } as unknown as AnnotationState)
    );

    // Act: Render the header.
    render(<EditorHeader {...defaultProps} />);

    // Assert: Verify that 'verified' is passed to the actions component.
    const ActionsMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-actions")
    ).EditorHeaderActions;
    expect(ActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ verificationStatus: "verified" }),
      undefined
    );
  });

  /**
   * Test case to verify the 'unverified' status when no detections have been confirmed.
   */
  it("passes correct verification status 'unverified' when no detections are confirmed", async () => {
    // Arrange: Mock the store with only unconfirmed detections.
    vi.mocked(useAnnotationStore).mockImplementation((selector) =>
      selector({
        detections: [{ status: "model_generated" }, { status: "user_created" }],
      } as unknown as AnnotationState)
    );

    // Act: Render the header.
    render(<EditorHeader {...defaultProps} />);

    // Assert: Verify that 'unverified' is passed to the actions component.
    const ActionsMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-actions")
    ).EditorHeaderActions;
    expect(ActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ verificationStatus: "unverified" }),
      undefined
    );
  });

  /**
   * Test case to verify the 'in_progress' status when there is a mix of confirmed and unconfirmed detections.
   */
  it("passes correct verification status 'in_progress' when mixed status", async () => {
    // Arrange: Mock the store with a mix of detection statuses.
    vi.mocked(useAnnotationStore).mockImplementation((selector) =>
      selector({
        detections: [{ status: "user_confirmed" }, { status: "model_generated" }],
      } as unknown as AnnotationState)
    );

    // Act: Render the header.
    render(<EditorHeader {...defaultProps} />);

    // Assert: Verify that 'in_progress' is passed to the actions component.
    const ActionsMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-actions")
    ).EditorHeaderActions;
    expect(ActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ verificationStatus: "in_progress" }),
      undefined
    );
  });

  /**
   * Test case to verify that clicking the verification icon opens the appropriate modal.
   */
  it("opens correct modal when verification icon is clicked", async () => {
    // Arrange: Mock the store with a verified state.
    vi.mocked(useAnnotationStore).mockImplementation((selector) =>
      selector({
        detections: [{ status: "user_confirmed" }],
      } as unknown as AnnotationState)
    );

    render(<EditorHeader {...defaultProps} />);

    // Act: Manually trigger the verification click callback from the actions component.
    const ActionsMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-actions")
    ).EditorHeaderActions;
    const { onVerificationClick } = ActionsMock.mock.calls[0][0];

    act(() => {
      onVerificationClick("verified");
    });

    // Assert: Verify that the verified status modal is rendered.
    expect(await screen.findByTestId("verified-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the unverified modal opens when the status is clicked.
   */
  it("opens UnverifiedStatusModal when 'unverified' status is clicked", async () => {
    // Arrange: Mock the store with an unverified state.
    vi.mocked(useAnnotationStore).mockImplementation((selector) =>
      selector({
        detections: [{ status: "model_generated" }],
      } as unknown as AnnotationState)
    );

    render(<EditorHeader {...defaultProps} />);

    // Act: Manually trigger the click callback for unverified status.
    const ActionsMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-actions")
    ).EditorHeaderActions;
    const { onVerificationClick } = ActionsMock.mock.calls[0][0];

    act(() => {
      onVerificationClick("unverified");
    });

    // Assert: Verify that the unverified status modal is rendered.
    expect(await screen.findByTestId("unverified-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the in-progress modal opens when the status is clicked.
   */
  it("opens InProgressStatusModal when 'in_progress' status is clicked", async () => {
    // Arrange: Mock the store with mixed detection statuses.
    vi.mocked(useAnnotationStore).mockImplementation((selector) =>
      selector({
        detections: [{ status: "user_confirmed" }, { status: "model_generated" }],
      } as unknown as AnnotationState)
    );

    render(<EditorHeader {...defaultProps} />);

    // Act: Manually trigger the click callback for in-progress status.
    const ActionsMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-actions")
    ).EditorHeaderActions;
    const { onVerificationClick } = ActionsMock.mock.calls[0][0];

    act(() => {
      onVerificationClick("in_progress");
    });

    // Assert: Verify that the in-progress status modal is rendered.
    expect(await screen.findByTestId("in-progress-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the no-detections modal opens when the status is clicked.
   */
  it("opens NoDetectionsStatusModal when 'no_detections' status is clicked", async () => {
    // Arrange: Mock the store with no detections.
    vi.mocked(useAnnotationStore).mockImplementation((selector) =>
      selector({ detections: [] } as unknown as AnnotationState)
    );

    render(<EditorHeader {...defaultProps} />);

    // Act: Manually trigger the click callback for no detections status.
    const ActionsMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-actions")
    ).EditorHeaderActions;
    const { onVerificationClick } = ActionsMock.mock.calls[0][0];

    act(() => {
      onVerificationClick("no_detections");
    });

    // Assert: Verify that the no-detections status modal is rendered.
    expect(await screen.findByTestId("no-detections-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the unsaved changes modal appears when a navigation block is active.
   */
  it("opens unsaved changes modal when navigation is blocked", async () => {
    // Arrange: Mock navigation state to indicate an open modal and a pending action.
    vi.mocked(useEditorNavigation).mockReturnValue({
      ...defaultNavigationState,
      isUnsavedChangesModalOpen: true,
      pendingNavigation: mockPendingNavigation,
    } as unknown as ReturnType<typeof useEditorNavigation>);

    render(<EditorHeader {...defaultProps} />);

    // Assert: Verify that the unsaved changes modal is visible.
    expect(await screen.findByTestId("unsaved-changes-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify the behavior of discarding changes and proceeding with navigation.
   */
  it("handles 'leave' action in unsaved changes modal", async () => {
    // Arrange: Render the header with the unsaved changes modal open.
    vi.mocked(useEditorNavigation).mockReturnValue({
      ...defaultNavigationState,
      isUnsavedChangesModalOpen: true,
      pendingNavigation: mockPendingNavigation,
    } as unknown as ReturnType<typeof useEditorNavigation>);

    render(<EditorHeader {...defaultProps} />);

    // Act: Click the option to leave without saving.
    fireEvent.click(await screen.findByText("Leave"));

    // Assert: Verify the modal is closed and the pending navigation is executed.
    expect(mockSetIsUnsavedChangesModalOpen).toHaveBeenCalledWith(false);
    expect(mockPendingNavigation).toHaveBeenCalled();
    expect(mockSetPendingNavigation).toHaveBeenCalledWith(null);
  });

  /**
   * Test case to verify the behavior of saving changes before proceeding with navigation.
   */
  it("handles 'save-and-leave' action in unsaved changes modal", async () => {
    // Arrange: Render the header with the unsaved changes modal open.
    vi.mocked(useEditorNavigation).mockReturnValue({
      ...defaultNavigationState,
      isUnsavedChangesModalOpen: true,
      pendingNavigation: mockPendingNavigation,
    } as unknown as ReturnType<typeof useEditorNavigation>);

    render(<EditorHeader {...defaultProps} />);

    // Act: Click the option to save and then leave.
    fireEvent.click(await screen.findByText("Save and Leave"));

    // Assert: Verify the save handler is called and navigation proceeds afterward.
    expect(mockHandleSave).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockSetIsUnsavedChangesModalOpen).toHaveBeenCalledWith(false);
      expect(mockPendingNavigation).toHaveBeenCalled();
      expect(mockSetPendingNavigation).toHaveBeenCalledWith(null);
    });
  });

  /**
   * Test case to verify that global keyboard shortcuts are correctly registered.
   */
  it("registers keyboard shortcuts", () => {
    // Act: Render the header component.
    render(<EditorHeader {...defaultProps} />);

    // Assert: Verify all expected shortcut keys are linked to their respective handlers.
    expect(useHotkeys).toHaveBeenCalledWith(
      KEYBOARD_SHORTCUTS.BACK_NAVIGATION,
      mockHandleBackNavigation,
      expect.any(Object)
    );
    expect(useHotkeys).toHaveBeenCalledWith(
      KEYBOARD_SHORTCUTS.PREVIOUS_IMAGE,
      mockHandlePreviousImage,
      expect.any(Object)
    );
    expect(useHotkeys).toHaveBeenCalledWith(
      KEYBOARD_SHORTCUTS.NEXT_IMAGE,
      mockHandleNextImage,
      expect.any(Object)
    );
    expect(useHotkeys).toHaveBeenCalledWith(
      KEYBOARD_SHORTCUTS.TOGGLE_LOCK,
      mockHandleToggleLock,
      expect.any(Object)
    );
    expect(useHotkeys).toHaveBeenCalledWith(
      KEYBOARD_SHORTCUTS.SAVE,
      mockHandleSaveClick,
      expect.any(Object)
    );
  });

  /**
   * Test case to verify graceful handling of missing image IDs in the current route parameters.
   */
  it("handles case where current image is not found in the list", async () => {
    // Arrange: Mock URL parameters with an ID not present in the image list.
    vi.mocked(useParams).mockReturnValue({
      resultsId: "case-123",
      imageId: "non-existent-img",
    });

    render(<EditorHeader {...defaultProps} />);

    // Act: Import mocked child components.
    const NavMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-navigation")
    ).EditorHeaderNavigation;
    const ContextMock = vi.mocked(
      await import("@/features/annotation/components/editor-header-context")
    ).EditorHeaderContext;

    // Assert: Verify that the component defaults to a fallback index of -1 and position 0.
    expect(NavMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentImageIndex: -1,
        currentPosition: 0,
        totalImages: 2,
      }),
      undefined
    );

    // Assert: Verify that the image name defaults to an empty string.
    expect(ContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseName: "Test Case",
        currentImageName: "",
      }),
      undefined
    );
  });

  /**
   * Test case to verify that the 'leave' action works even if no specific navigation was queued.
   */
  it("handles 'leave' action in unsaved changes modal when no pending navigation exists", async () => {
    // Arrange: Render the header with modal open but no pending function.
    vi.mocked(useEditorNavigation).mockReturnValue({
      ...defaultNavigationState,
      isUnsavedChangesModalOpen: true,
      pendingNavigation: null,
    } as unknown as ReturnType<typeof useEditorNavigation>);

    render(<EditorHeader {...defaultProps} />);

    // Act: Click the leave button.
    fireEvent.click(await screen.findByText("Leave"));

    // Assert: Verify the modal closes without attempting to call a null reference.
    expect(mockSetIsUnsavedChangesModalOpen).toHaveBeenCalledWith(false);
    expect(mockPendingNavigation).not.toHaveBeenCalled();
    expect(mockSetPendingNavigation).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the 'save-and-leave' action works even if no specific navigation was queued.
   */
  it("handles 'save-and-leave' action in unsaved changes modal when no pending navigation exists", async () => {
    // Arrange: Render the header with modal open but no pending function.
    vi.mocked(useEditorNavigation).mockReturnValue({
      ...defaultNavigationState,
      isUnsavedChangesModalOpen: true,
      pendingNavigation: null,
    } as unknown as ReturnType<typeof useEditorNavigation>);

    render(<EditorHeader {...defaultProps} />);

    // Act: Click the save and leave button.
    fireEvent.click(await screen.findByText("Save and Leave"));

    // Assert: Verify the save is triggered and modal closes.
    expect(mockHandleSave).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockSetIsUnsavedChangesModalOpen).toHaveBeenCalledWith(false);
      expect(mockPendingNavigation).not.toHaveBeenCalled();
      expect(mockSetPendingNavigation).not.toHaveBeenCalled();
    });
  });
});
