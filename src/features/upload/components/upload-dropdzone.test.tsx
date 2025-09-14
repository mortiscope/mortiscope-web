import { fireEvent, render, screen } from "@testing-library/react";
import { type DropzoneState } from "react-dropzone";
import { describe, expect, it, vi } from "vitest";

import { UploadDropzone } from "@/features/upload/components/upload-dropzone";

// Mock the 'framer-motion' library components used by the dropzone.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
    }: {
      children: React.ReactNode;
      className?: string;
      onClick?: React.MouseEventHandler;
    }) => (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the constants used for styling the dropzone.
vi.mock("@/features/cases/constants/styles", () => ({
  descriptionTextClasses:
    "font-inter mt-1 max-w-sm text-sm text-slate-500 transition-colors duration-300 ease-in-out group-hover:group-enabled:text-slate-600",
  dropzoneBaseClasses:
    "mt-4 group flex h-96 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center transition-all duration-300 ease-in-out",
  iconClasses:
    "h-12 w-12 text-emerald-500 transition-transform duration-300 ease-in-out group-hover:-translate-y-2 group-hover:scale-110",
  largeTextClasses:
    "font-plus-jakarta-sans mt-4 font-semibold md:text-xl text-lg transition-colors duration-300 ease-in-out group-hover:group-enabled:text-slate-900",
}));

// Mock the application-wide constants.
vi.mock("@/lib/constants", () => ({
  MAX_FILES: 20,
}));

// Helper function to create a mock dropzone object.
const createMockDropzone = (overrides: Partial<DropzoneState> = {}): DropzoneState =>
  ({
    getRootProps: vi.fn((props) => ({
      ...props,
      role: "presentation",
      onClick: (e: React.MouseEvent) => {
        props?.onClick?.(e);
      },
    })),
    getInputProps: vi.fn(() => ({
      type: "file",
      style: { display: "none" },
    })),
    isDragActive: false,
    isDragAccept: false,
    isDragReject: false,
    open: vi.fn(),
    inputRef: { current: null },
    rootRef: { current: null },
    acceptedFiles: [],
    fileRejections: [],
    focused: false,
    isFileDialogActive: false,
    isFocused: false,
    ...overrides,
  }) as unknown as DropzoneState;

/**
 * Test suite for the `UploadDropzone` component.
 */
describe("UploadDropzone", () => {
  // Arrange: Define a default set of props for the component under test.
  const defaultProps = {
    dropzone: createMockDropzone(),
    activeTab: "upload",
    isMaxFilesReached: false,
    caseId: "case-123",
    filesCount: 0,
    onOpenFormatsModal: vi.fn(),
    onOpenCamera: vi.fn(),
  };

  /**
   * Test case to verify that the component renders the expected content for the upload tab.
   */
  it("renders the upload tab content correctly", () => {
    // Arrange: Render the component with default props set to the "upload" tab.
    render(<UploadDropzone {...defaultProps} />);

    // Assert: Check for the presence of the main title and descriptive text for device uploads.
    expect(screen.getByText("Upload from Device")).toBeInTheDocument();
    expect(screen.getByText(/Click to browse or drag and drop/)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component renders the disabled state when the required `caseId` is missing.
   */
  it("renders the disabled state when no caseId is provided", () => {
    // Arrange: Render the component with a `null` value for the required `caseId` prop.
    render(<UploadDropzone {...defaultProps} caseId={null} />);

    // Assert: Check for the presence of the disabled message title and supporting explanation.
    expect(screen.getByText("Save Details First")).toBeInTheDocument();
    expect(
      screen.getByText(/Please complete the previous step to enable uploads/)
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component renders the maximum files reached state.
   */
  it("renders the max files reached state", () => {
    // Arrange: Render the component with the `isMaxFilesReached` flag set to `true` and `filesCount` at the maximum limit.
    render(<UploadDropzone {...defaultProps} isMaxFilesReached={true} filesCount={20} />);

    // Assert: Check for the presence of the "Maximum files reached" message and the explanatory text.
    expect(screen.getByText("Maximum files reached")).toBeInTheDocument();
    expect(screen.getByText(/You have uploaded the maximum of 20 images/)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component renders the expected content for the camera tab.
   */
  it("renders the camera tab content correctly", () => {
    // Arrange: Render the component with the `activeTab` prop set to "camera".
    render(<UploadDropzone {...defaultProps} activeTab="camera" />);

    // Assert: Check for the presence of the "Use Camera" title and the relevant description.
    expect(screen.getByText("Use Camera")).toBeInTheDocument();
    expect(screen.getByText(/Allow access to your device's camera/)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `onOpenCamera` prop function is executed when the dropzone area is clicked in camera mode.
   */
  it("calls onOpenCamera when clicking the dropzone in camera mode", () => {
    // Arrange: Create a mock function for `onOpenCamera` and render the component in "camera" mode.
    const onOpenCameraMock = vi.fn();
    render(<UploadDropzone {...defaultProps} activeTab="camera" onOpenCamera={onOpenCameraMock} />);

    // Act: Find the clickable dropzone area by its role and simulate a click event.
    const dropzoneArea = screen.getByRole("presentation");
    fireEvent.click(dropzoneArea);

    // Assert: Verify that the `onOpenCameraMock` function was called exactly one time.
    expect(onOpenCameraMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that `onOpenCamera` is not called when the maximum file limit has been reached, even in camera mode.
   */
  it("does not call onOpenCamera if max files reached", () => {
    // Arrange: Create a mock function and render the component in "camera" mode with `isMaxFilesReached` set to `true`.
    const onOpenCameraMock = vi.fn();
    render(
      <UploadDropzone
        {...defaultProps}
        activeTab="camera"
        isMaxFilesReached={true}
        onOpenCamera={onOpenCameraMock}
      />
    );

    // Act: Find the dropzone area and simulate a click event.
    const dropzoneArea = screen.getByRole("presentation");
    fireEvent.click(dropzoneArea);

    // Assert: Verify that the `onOpenCameraMock` function was never called because of the file limit constraint.
    expect(onOpenCameraMock).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the `onOpenFormatsModal` prop function is executed when the associated link is clicked.
   */
  it("calls onOpenFormatsModal when clicking the 'here' link", () => {
    // Arrange: Create a mock function for `onOpenFormatsModal` and render the component.
    const onOpenFormatsModalMock = vi.fn();
    render(<UploadDropzone {...defaultProps} onOpenFormatsModal={onOpenFormatsModalMock} />);

    // Act: Find the link element by its text content "here" and simulate a click event.
    const linkButton = screen.getByText("here");
    fireEvent.click(linkButton);

    // Assert: Verify that the `onOpenFormatsModalMock` function was called exactly one time.
    expect(onOpenFormatsModalMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that specific rejection styling is applied when the `isDragReject` flag is `true`.
   */
  it("applies reject styling when isDragReject is true", () => {
    // Arrange: Create a mock `DropzoneState` object with rejection and active drag flags set to `true`.
    const mockDropzone = createMockDropzone({
      isDragReject: true,
      isDragActive: true,
    });

    // Arrange: Render the component with the mock `dropzone` state.
    render(<UploadDropzone {...defaultProps} dropzone={mockDropzone} />);

    // Assert: Retrieve the text element and confirm it has the specific CSS class for rejection styling.
    const dropzoneText = screen.getByText("Upload from Device");
    expect(dropzoneText).toHaveClass("text-rose-500");
  });

  /**
   * Test case to verify that the text changes to the "drop here" message when the `isDragAccept` flag is `true`.
   */
  it("applies accept text when isDragAccept is true", () => {
    // Arrange: Create a mock `DropzoneState` object with acceptance and active drag flags set to `true`.
    const mockDropzone = createMockDropzone({
      isDragAccept: true,
      isDragActive: true,
    });

    // Arrange: Render the component with the mock `dropzone` state.
    render(<UploadDropzone {...defaultProps} dropzone={mockDropzone} />);

    // Assert: Check that the "Drop them here" message, which indicates an acceptable drag state, is present in the document.
    expect(screen.getByText("Drop them here")).toBeInTheDocument();
  });
});
