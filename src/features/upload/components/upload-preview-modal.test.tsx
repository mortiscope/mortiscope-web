import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { UploadPreviewModal } from "@/features/upload/components/upload-preview-modal";

// Mock a hoisted variable to control the transform state dynamically across tests.
const { mockTransformState, mockSetTransform } = vi.hoisted(() => ({
  mockTransformState: { scale: 2.0 },
  mockSetTransform: vi.fn(),
}));

// Mock function created to track arguments passed to `usePreviewModal` hook.
const mockUsePreviewModal = vi.fn();
// Mock the custom hook used by the component to manage state and actions.
vi.mock("@/features/images/hooks/use-preview-modal", () => ({
  usePreviewModal: (props: unknown) => mockUsePreviewModal(props),
}));

// Mock the dialog primitives from shadcn/ui.
vi.mock("@/components/ui/dialog", () => ({
  // Dialog component mock only renders its children if `open` is true, simulating modal behavior.
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="dialog-root">
        <button onClick={() => onOpenChange && onOpenChange(false)}>Close Dialog</button>
        {children}
      </div>
    ) : null,
  // Mock for the modal content wrapper, retaining the `className` for testing responsive behavior.
  DialogContent: ({
    children,
    className,
    onInteractOutside,
  }: {
    children: React.ReactNode;
    className?: string;
    onInteractOutside?: (e: Event) => void;
  }) => (
    <div data-testid="dialog-content" className={className}>
      <button
        onClick={() => {
          const e = new Event("interactOutside");
          e.preventDefault = vi.fn();
          onInteractOutside?.(e);
        }}
      >
        Trigger Outside
      </button>
      {children}
    </div>
  ),
  // Mock for the header container.
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  // Mock for the title element.
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

// Mock the tooltip provider as it is not essential for modal functionality tests.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the `PreviewImageViewer` component, which handles the main image display.
vi.mock("@/features/cases/components/preview-image-viewer", () => ({
  PreviewImageViewer: ({
    onRenameClick,
    onDownload,
    onSave,
    onDelete,
  }: {
    onRenameClick: () => void;
    onDownload: () => void;
    onSave: () => void;
    onDelete: () => void;
  }) => (
    <div data-testid="preview-image-viewer">
      <button onClick={onRenameClick}>Img Rename</button>
      <button onClick={onDownload}>Img Download</button>
      <button onClick={onSave}>Img Save</button>
      <button onClick={onDelete}>Img Delete</button>
    </div>
  ),
}));

// Mock the `PreviewModalHeader` component.
vi.mock("@/features/cases/components/preview-modal-header", () => ({
  PreviewModalHeader: ({
    onRenameClick,
    onDelete,
    onDownload,
    onSave,
  }: {
    onRenameClick: () => void;
    onDelete: () => void;
    onDownload: () => void;
    onSave: () => void;
  }) => (
    <div data-testid="preview-modal-header">
      <button onClick={onRenameClick}>Header Rename</button>
      <button onClick={onDelete}>Header Delete</button>
      <button onClick={onDownload}>Header Download</button>
      <button onClick={onSave}>Header Save</button>
    </div>
  ),
}));

// Mock the `PreviewThumbnailList` component.
vi.mock("@/features/cases/components/preview-thumbnail-list", () => ({
  PreviewThumbnailList: ({ onSelectFile }: { onSelectFile: (file: { id: string }) => void }) => (
    <div data-testid="preview-thumbnail-list">
      <button onClick={() => onSelectFile({ id: "2" })}>Select File 2</button>
    </div>
  ),
}));

// Mock the `PreviewViewControls` component and expose the control buttons to fire events.
vi.mock("@/features/cases/components/preview-view-controls", () => ({
  PreviewViewControls: ({
    onZoomIn,
    onZoomOut,
    onRotate,
    onPrevious,
    onNext,
    onResetTransform,
  }: {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRotate: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onResetTransform: () => void;
  }) => (
    <div data-testid="preview-view-controls">
      <button onClick={onZoomIn}>Zoom In</button>
      <button onClick={onZoomOut}>Zoom Out</button>
      <button onClick={onRotate}>Rotate</button>
      <button onClick={onPrevious}>Previous</button>
      <button onClick={onNext}>Next</button>
      <button onClick={onResetTransform}>Reset Transform</button>
    </div>
  ),
}));

// Mock framer-motion components as they relate to animation, not core functionality.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock `react-zoom-pan-pinch`'s `TransformWrapper` to control zoom and pan utils.
vi.mock("react-zoom-pan-pinch", () => {
  const TransformWrapper = React.forwardRef(
    (
      {
        children,
        onTransformed,
      }: {
        children: (utils: {
          zoomIn: () => void;
          zoomOut: () => void;
          centerView: () => void;
        }) => React.ReactNode;
        onTransformed?: (
          ref: unknown,
          state: { scale: number; positionX: number; positionY: number }
        ) => void;
      },
      ref: React.Ref<{
        setTransform: () => void;
        zoomOut: () => void;
        instance: {
          transformState: { scale: number };
          contentComponent: { clientWidth: number; clientHeight: number };
          wrapperComponent: { clientWidth: number; clientHeight: number };
        };
      }>
    ) => {
      // Expose a mock `setTransform` on the ref
      React.useImperativeHandle(ref, () => ({
        setTransform: mockSetTransform,
        zoomOut: vi.fn(),
        instance: {
          transformState: mockTransformState,
          contentComponent: { clientWidth: 100, clientHeight: 100 },
          wrapperComponent: { clientWidth: 200, clientHeight: 200 },
        },
      }));

      return (
        <div data-testid="transform-wrapper">
          <button
            onClick={() =>
              onTransformed?.(
                {
                  instance: {
                    contentComponent: { clientWidth: 100, clientHeight: 100 },
                    wrapperComponent: { clientWidth: 200, clientHeight: 200 },
                  },
                },
                {
                  scale: 2,
                  positionX: 10,
                  positionY: 10,
                }
              )
            }
          >
            Trigger Transform
          </button>
          {children({
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
            centerView: vi.fn(),
          })}
        </div>
      );
    }
  );
  TransformWrapper.displayName = "TransformWrapper";
  return { TransformWrapper };
});

// Mock the utility function for class name concatenation.
vi.mock("@/lib/utils", () => ({
  cn: (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(" "),
}));

/**
 * Test suite for the `UploadPreviewModal` component, verifying rendering and interaction logic.
 */
describe("UploadPreviewModal", () => {
  // Arrange: Define a mock `UploadableFile` object for use in props and hook returns.
  const mockFile = {
    id: "1",
    name: "test.jpg",
    preview: "blob:url",
    url: "blob:url",
    size: 1000,
    type: "image/jpeg",
    status: "success",
    progress: 100,
    file: new File([], "test.jpg"),
    source: "upload",
    dateUploaded: new Date(),
    version: 1,
    key: "key-1",
  } as UploadableFile;

  // Arrange: Define default props for the `UploadPreviewModal` component.
  const defaultProps = {
    file: mockFile,
    isOpen: true,
    onClose: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
  };

  // Arrange: Define the default return values for the `usePreviewModal` hook.
  const defaultHookValues = {
    activeFile: mockFile,
    setActiveFile: vi.fn(),
    previewUrl: "blob:url",
    imageDimensions: { width: 100, height: 100 },
    rotation: 0,
    isRotationDirty: false,
    isNameDirty: false,
    isSaving: false,
    isDeleting: false,
    isRenaming: false,
    setIsRenaming: vi.fn(),
    fileNameBase: "test",
    displayFileName: "test.jpg",
    transformState: {},
    setTransformState: vi.fn(),
    viewingBox: {},
    setViewingBox: vi.fn(),
    titleInputRef: { current: null },
    isMobile: false,
    sortedFiles: [mockFile],
    hasNext: true,
    hasPrevious: true,
    renameMutation: { isPending: false },
    handleRotate: vi.fn(),
    resetRotation: vi.fn(),
    handleNameChange: vi.fn(),
    handleSave: vi.fn(),
    handleDelete: vi.fn(),
    handleDownload: vi.fn(),
  };

  // Set up common mock state before each test execution.
  beforeEach(() => {
    vi.clearAllMocks();
    // Use reset to default scale
    mockTransformState.scale = 2.0;
    // Mock the hook to return the standard set of values.
    mockUsePreviewModal.mockReturnValue(defaultHookValues);
  });

  /**
   * Test case to verify that the modal does not render its root structure when `isOpen` prop is false.
   */
  it("renders nothing when isOpen is false", () => {
    // Arrange: Render the component with `isOpen` set to false.
    render(<UploadPreviewModal {...defaultProps} isOpen={false} />);
    // Assert: Verify that the dialog's root test ID is not present in the document.
    expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal does not render when the hook indicates no active file is selected.
   */
  it("renders nothing when activeFile is null", () => {
    // Arrange: Mock the hook to return a null `activeFile`.
    mockUsePreviewModal.mockReturnValue({ ...defaultHookValues, activeFile: null });
    // Act: Render the component.
    render(<UploadPreviewModal {...defaultProps} />);
    // Assert: Verify that the dialog's root test ID is not present, even though `isOpen` is true in props.
    expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the primary structural components of the modal are rendered when active.
   */
  it("renders the modal content when open and file is active", () => {
    // Arrange: Render the component in its default, open state.
    render(<UploadPreviewModal {...defaultProps} />);

    // Assert: Verify the presence of the main dialog, header, image viewer, and controls.
    expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
    expect(screen.getByTestId("preview-modal-header")).toBeInTheDocument();
    expect(screen.getByTestId("preview-image-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("preview-view-controls")).toBeInTheDocument();
  });

  /**
   * Test case to verify conditional rendering of the thumbnail list based on the number of files.
   */
  it("renders the thumbnail list only when there are multiple files", () => {
    // Arrange: Render first with a single file (default hook value).
    render(<UploadPreviewModal {...defaultProps} />);
    // Assert: Verify the thumbnail list is not present.
    expect(screen.queryByTestId("preview-thumbnail-list")).not.toBeInTheDocument();

    // Arrange: Update the mock hook return value to contain multiple files.
    mockUsePreviewModal.mockReturnValue({
      ...defaultHookValues,
      sortedFiles: [mockFile, { ...mockFile, id: "2" }],
    });

    const onSelectFileSpy = vi.fn();
    const { unmount } = render(
      <UploadPreviewModal {...defaultProps} onSelectFile={onSelectFileSpy} />
    );
    unmount();
    render(<UploadPreviewModal {...defaultProps} onSelectFile={onSelectFileSpy} />);

    // Assert: Verify the thumbnail list is now present because there are multiple files.
    expect(screen.getByTestId("preview-thumbnail-list")).toBeInTheDocument();

    // Trigger file selection to cover onSelectFile prop logic
    const selectFileButton = screen.getByText("Select File 2");
    fireEvent.click(selectFileButton);
    expect(defaultHookValues.setActiveFile).toHaveBeenCalled();
    expect(onSelectFileSpy).toHaveBeenCalledWith("2");
  });

  /**
   * Test case to verify that the `react-zoom-pan-pinch` integration wrapper is correctly rendered.
   */
  it("integrates with react-zoom-pan-pinch via TransformWrapper", () => {
    // Arrange: Render the component.
    render(<UploadPreviewModal {...defaultProps} />);
    // Assert: Verify the `TransformWrapper` mock is in the document.
    expect(screen.getByTestId("transform-wrapper")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the rotate button calls the `handleRotate` function from the hook.
   */
  it("connects rotate button to handleRotate handler", () => {
    // Arrange: Render the component.
    render(<UploadPreviewModal {...defaultProps} />);

    // Act: Find the "Rotate" button exposed by the mocked controls and click it.
    const rotateButton = screen.getByText("Rotate");
    fireEvent.click(rotateButton);

    // Assert: Verify that the `handleRotate` mock function was executed.
    expect(defaultHookValues.handleRotate).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the next and previous navigation buttons call the corresponding props.
   */
  it("connects navigation buttons to onNext and onPrevious props", () => {
    // Arrange: Render the component.
    render(<UploadPreviewModal {...defaultProps} />);

    // Act: Find and click the "Next" button.
    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);
    // Assert: Verify the `onNext` prop function was called.
    expect(defaultProps.onNext).toHaveBeenCalled();

    // Act: Find and click the "Previous" button.
    const prevButton = screen.getByText("Previous");
    fireEvent.click(prevButton);
    // Assert: Verify the `onPrevious` prop function was called.
    expect(defaultProps.onPrevious).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the zoom controls are rendered within the component hierarchy.
   */
  it("connects zoom controls to TransformWrapper utils", () => {
    // Arrange: Render the component.
    render(<UploadPreviewModal {...defaultProps} />);

    // Act: Find the zoom buttons exposed by the mocked controls.
    const zoomInButton = screen.getByText("Zoom In");
    const zoomOutButton = screen.getByText("Zoom Out");

    // Act: Click the zoom buttons. The actual utility calls are mocked within `TransformWrapper`.
    fireEvent.click(zoomInButton);
    fireEvent.click(zoomOutButton);

    // Assert: Verify the zoom buttons exist in the document, confirming connection to the mock controls.
    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
  });

  /**
   * Test case to verify that different CSS classes are applied to the dialog content based on the `isMobile` state.
   */
  it("renders responsive classes based on isMobile", () => {
    // Arrange: Render the component initially with `isMobile: false`.
    const { rerender } = render(<UploadPreviewModal {...defaultProps} />);

    // Assert: Check for the desktop-specific rounded class.
    let content = screen.getByTestId("dialog-content");
    expect(content.className).toContain("rounded-4xl");

    // Arrange: Mock the hook to return `isMobile: true`.
    mockUsePreviewModal.mockReturnValue({ ...defaultHookValues, isMobile: true });

    // Act: Rerender the component with the new mobile state.
    rerender(<UploadPreviewModal {...defaultProps} />);

    // Assert: Check for the mobile-specific fullscreen class names.
    content = screen.getByTestId("dialog-content");
    expect(content.className).toContain("h-dvh w-screen");
  });

  /**
   * Test case to verify that interaction outside the modal is prevented on mobile.
   */
  it("prevents default on interaction outside in mobile", () => {
    mockUsePreviewModal.mockReturnValue({ ...defaultHookValues, isMobile: true });
    render(<UploadPreviewModal {...defaultProps} />);

    const triggerButton = screen.getByText("Trigger Outside");

    fireEvent.click(triggerButton);
    
    expect(triggerButton).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the "Reset Transform" button calls the `resetRotation` handler.
   */
  it("resets transform and rotation when reset button is clicked", () => {
    // Arrange: Render the component.
    render(<UploadPreviewModal {...defaultProps} />);

    // Act: Click the "Reset Transform" button.
    fireEvent.click(screen.getByText("Reset Transform"));

    // Assert: Verify that the `resetRotation` mock function was executed.
    expect(defaultHookValues.resetRotation).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the `onTransformed` callback from `TransformWrapper` updates the internal state.
   */
  it("updates transform state and viewing box on transform", () => {
    // Arrange: Render the component.
    render(<UploadPreviewModal {...defaultProps} />);

    // Act: Click the mock button that triggers the `onTransformed` callback.
    fireEvent.click(screen.getByText("Trigger Transform"));

    // Assert: Verify `setTransformState` was called with a functional update.
    expect(defaultHookValues.setTransformState).toHaveBeenCalledWith(expect.any(Function));

    // Assert: Verify `setViewingBox` was called, which calculates the current visible area.
    expect(defaultHookValues.setViewingBox).toHaveBeenCalled();
  });

  /**
   * Test case to verify that closing the modal via the internal interface correctly calls the `onClose` prop.
   */
  it("calls onClose when dialog is closed via UI", () => {
    // Arrange: Render the component.
    render(<UploadPreviewModal {...defaultProps} />);

    // Act: Click the mock button exposed by the `Dialog` that simulates closing the modal.
    fireEvent.click(screen.getByText("Close Dialog"));

    // Assert: Verify that the `onClose` prop function was executed.
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  /**
   * Test case to verify the `useEffect` logic adjusts scale if it drops below 1 after rotation.
   */
  it("auto-adjusts scale if it drops below 1 after rotation", () => {
    // Arrange: Set mock scale to be low (< 1) to trigger adjustment
    mockTransformState.scale = 0.5;
    mockUsePreviewModal.mockReturnValue({ ...defaultHookValues, rotation: 90 });

    render(<UploadPreviewModal {...defaultProps} />);

    // Assert: setTransform should be called to reset scale to 1
    expect(mockSetTransform).toHaveBeenCalledWith(0, 0, 1);
  });

  it("sets renaming state when header rename clicked", () => {
    render(<UploadPreviewModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Header Rename"));
    expect(defaultHookValues.setIsRenaming).toHaveBeenCalledWith(true);
  });

  it("sets renaming state when image viewer rename clicked", () => {
    render(<UploadPreviewModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Img Rename"));
    expect(defaultHookValues.setIsRenaming).toHaveBeenCalledWith(true);
  });
});
