import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { PreviewModalHeader } from "@/features/cases/components/preview-modal-header";

// Mock the `framer-motion` component for isolation and to verify layout.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: React.ComponentProps<"div">) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock various icon components used in the toolbar.
vi.mock("react-icons/ai", () => ({ AiOutlineSave: () => <span data-testid="icon-save" /> }));

vi.mock("react-icons/go", () => ({
  GoPencil: () => <span data-testid="icon-rename" />,
  GoVerified: () => <span />,
  GoUnverified: () => <span />,
}));

vi.mock("react-icons/pi", () => ({
  PiSealPercent: () => <span />,
  PiSealWarning: () => <span />,
}));

vi.mock("react-icons/lu", () => ({
  LuDownload: () => <span data-testid="icon-download" />,
  LuLoaderCircle: () => <span data-testid="icon-loader" />,
  LuTrash2: () => <span data-testid="icon-trash" />,
  LuX: () => <span data-testid="icon-close" />,
}));

// Mock the Dialog components to verify header structure.
vi.mock("@/components/ui/dialog", () => ({
  DialogHeader: ({ children, className }: React.ComponentProps<"div">) => (
    <div data-testid="dialog-header" className={className}>
      {children}
    </div>
  ),
  DialogTitle: ({ children }: React.ComponentProps<"h2">) => <h2>{children}</h2>,
  DialogDescription: ({ children }: React.ComponentProps<"p">) => <p>{children}</p>,
}));

// Define a mock file object with necessary metadata.
const mockFile = {
  id: "file-1",
  name: "test-image.jpg",
  size: 1024 * 1024 * 2.5,
  dateUploaded: new Date("2025-01-01").toISOString(),
} as unknown as UploadableFile;

// Define default props for the component under test.
const defaultProps = {
  activeFile: mockFile,
  displayFileName: "test-image.jpg",
  fileNameBase: "test-image",
  imageDimensions: { width: 1920, height: 1080 },
  isMobile: false,
  isRenaming: false,
  isSaving: false,
  isDeleting: false,
  isNameDirty: false,
  isRotationDirty: false,
  renameMutationIsPending: false,
  titleInputRef: React.createRef<HTMLInputElement>(),
  variants: {},
  onClose: vi.fn(),
  onDelete: vi.fn(),
  onDownload: vi.fn(),
  onNameChange: vi.fn(),
  onRenameClick: vi.fn(),
  onSave: vi.fn(),
  onSetIsRenaming: vi.fn(),
};

/**
 * Test suite for the `PreviewModalHeader` component.
 */
describe("PreviewModalHeader", () => {
  /**
   * Test suite for the desktop layout, where the header is inline with content.
   */
  describe("Desktop Layout", () => {
    /**
     * Test case to verify that the file name and all metadata (date, size, dimensions) are correctly rendered.
     */
    it("renders file title and metadata", () => {
      // Arrange: Render the component in desktop mode.
      render(<PreviewModalHeader {...defaultProps} isMobile={false} />);

      // Assert: Check for the displayed file name.
      expect(screen.getByText("test-image.jpg")).toBeInTheDocument();
      // Assert: Check for the presence of formatted date, dimensions, and file size.
      expect(screen.getByText("1/1/2025")).toBeInTheDocument();
      expect(screen.getByText("1920 x 1080")).toBeInTheDocument();
      expect(screen.getByText("2.5 MB")).toBeInTheDocument();
    });

    /**
     * Test case to verify that an editable input field replaces the static title when renaming is active.
     */
    it("renders input field when isRenaming is true", () => {
      // Arrange: Render the component with `isRenaming` set to true.
      render(<PreviewModalHeader {...defaultProps} isMobile={false} isRenaming={true} />);

      // Assert: Check for the presence of the input field displaying the file name base.
      const input = screen.getByDisplayValue("test-image");
      expect(input).toBeInTheDocument();
      // Assert: Check for specific styling applied to the renaming input.
      expect(input).toHaveClass("font-plus-jakarta-sans text-center text-xl");
    });
  });

  /**
   * Test suite for the mobile layout, which uses a floating action bar header.
   */
  describe("Mobile Layout", () => {
    /**
     * Test case to verify that the mobile floating action bar renders with essential control buttons.
     */
    it("renders floating action bar with buttons", () => {
      // Arrange: Render the component in mobile mode.
      render(<PreviewModalHeader {...defaultProps} isMobile={true} />);

      // Assert: Check for the motion wrapper and its sticky mobile positioning.
      const container = screen.getByTestId("motion-div");
      expect(container).toHaveClass("absolute top-0 right-0 left-0");

      // Assert: Check for the presence of all mobile toolbar buttons.
      expect(screen.getByLabelText("Rename image")).toBeInTheDocument();
      expect(screen.getByLabelText("Download")).toBeInTheDocument();
      expect(screen.getByLabelText("Save")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete")).toBeInTheDocument();
      expect(screen.getByLabelText("Close")).toBeInTheDocument();
    });

    /**
     * Test case to verify that clicking each button in the mobile toolbar triggers its corresponding callback function.
     */
    it("calls action callbacks when buttons are clicked", async () => {
      // Arrange: Set up user events and render the component. Set `isNameDirty` to true to enable the Save button.
      const user = userEvent.setup();
      render(<PreviewModalHeader {...defaultProps} isMobile={true} isNameDirty={true} />);

      // Act & Assert: Click each button and verify its corresponding mock function was called.
      await user.click(screen.getByLabelText("Rename image"));
      expect(defaultProps.onRenameClick).toHaveBeenCalled();

      await user.click(screen.getByLabelText("Download"));
      expect(defaultProps.onDownload).toHaveBeenCalled();

      await user.click(screen.getByLabelText("Save"));
      expect(defaultProps.onSave).toHaveBeenCalled();

      await user.click(screen.getByLabelText("Delete"));
      expect(defaultProps.onDelete).toHaveBeenCalled();

      await user.click(screen.getByLabelText("Close"));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    /**
     * Test case to verify that the loading spinner icon replaces the standard icon when specific actions (rename, save, delete) are pending.
     */
    it("shows loaders when actions are pending", () => {
      // Arrange: Test rename pending state.
      const { rerender } = render(
        <PreviewModalHeader {...defaultProps} isMobile={true} renameMutationIsPending={true} />
      );
      expect(screen.getByLabelText("Rename image")).toContainElement(
        screen.getByTestId("icon-loader")
      );

      // Arrange: Test save pending state.
      rerender(
        <PreviewModalHeader {...defaultProps} isMobile={true} isSaving={true} isNameDirty={true} />
      );
      expect(screen.getByLabelText("Save")).toContainElement(screen.getByTestId("icon-loader"));

      // Arrange: Test delete pending state.
      rerender(<PreviewModalHeader {...defaultProps} isMobile={true} isDeleting={true} />);
      expect(screen.getByLabelText("Delete")).toContainElement(screen.getByTestId("icon-loader"));
    });
  });

  /**
   * Test suite for handling user input during the file renaming process.
   */
  describe("Renaming Interactions", () => {
    /**
     * Test case to verify that the `onSetIsRenaming(false)` callback is triggered when the input field loses focus (blurs).
     */
    it("calls onSetIsRenaming(false) on input blur", async () => {
      // Arrange: Define a spy for the renaming toggle and render the component in renaming mode.
      const onSetIsRenamingMock = vi.fn();
      render(
        <PreviewModalHeader
          {...defaultProps}
          isRenaming={true}
          onSetIsRenaming={onSetIsRenamingMock}
        />
      );

      // Act: Find the input, simulate click (to focus), and then fire the blur event.
      const input = screen.getByDisplayValue("test-image");
      await userEvent.click(input);
      fireEvent.blur(input);

      // Assert: Check that the mock function was called to exit renaming mode.
      expect(onSetIsRenamingMock).toHaveBeenCalledWith(false);
    });

    /**
     * Test case to verify that pressing the Enter key while renaming triggers the input's blur event, concluding the renaming process.
     */
    it("blurs input on Enter key press", async () => {
      // Arrange: Define a reference for the input and render the component in renaming mode.
      const inputRef = React.createRef<HTMLInputElement>();
      render(<PreviewModalHeader {...defaultProps} isRenaming={true} titleInputRef={inputRef} />);

      // Arrange: Spy on the native `blur` function of the current input element.
      const input = screen.getByDisplayValue("test-image");
      let blurSpy;
      if (inputRef.current) {
        blurSpy = vi.spyOn(inputRef.current, "blur");
      }

      // Act: Simulate typing the Enter key.
      await userEvent.type(input, "{enter}");

      // Assert: Check that the `blur` function was executed.
      expect(blurSpy).toHaveBeenCalled();
    });

    /**
     * Test case to verify that pressing the Escape key while renaming triggers a cancellation of renaming mode.
     */
    it("cancels renaming on Escape key press", async () => {
      // Arrange: Define a spy for the renaming toggle and render the component in renaming mode.
      const onSetIsRenamingMock = vi.fn();
      render(
        <PreviewModalHeader
          {...defaultProps}
          isRenaming={true}
          onSetIsRenaming={onSetIsRenamingMock}
        />
      );

      // Act: Find the input and simulate typing the Escape key.
      const input = screen.getByDisplayValue("test-image");
      await userEvent.type(input, "{escape}");

      // Assert: Check that the mock function was called to exit renaming mode.
      expect(onSetIsRenamingMock).toHaveBeenCalledWith(false);
    });

    /**
     * Test case to verify that on desktop, if image dimensions are null, they are not displayed, while other metadata remains.
     */
    it("renders desktop header without image dimensions if null", () => {
      // Arrange: Render the component in desktop mode with null image dimensions.
      render(<PreviewModalHeader {...defaultProps} isMobile={false} imageDimensions={null} />);
      // Assert: Check that file size is present.
      expect(screen.getByText("2.5 MB")).toBeInTheDocument();
      // Assert: Check that the dimensions separator ("x") is not rendered.
      expect(screen.queryByText(/x/)).not.toBeInTheDocument();
    });

    /**
     * Test case to verify that renaming blur logic works correctly in mobile layout.
     */
    it("handles mobile renaming input blur", () => {
      // Arrange: Define a spy for the renaming toggle and render the component in mobile renaming mode.
      const onSetIsRenamingMock = vi.fn();
      render(
        <PreviewModalHeader
          {...defaultProps}
          isMobile={true}
          isRenaming={true}
          onSetIsRenaming={onSetIsRenamingMock}
        />
      );

      // Act: Fire the blur event on the renaming input.
      const input = screen.getByDisplayValue("test-image");
      fireEvent.blur(input);

      // Assert: Check that the mock function was called to exit renaming mode.
      expect(onSetIsRenamingMock).toHaveBeenCalledWith(false);
    });

    /**
     * Test case to verify that the save button is correctly enabled only if either the name or rotation is dirty.
     */
    it("correctly enables/disables save button based on dirty state", () => {
      // Arrange: Render with no dirty flags set.
      const { rerender } = render(
        <PreviewModalHeader
          {...defaultProps}
          isMobile={true}
          isRotationDirty={false}
          isNameDirty={false}
        />
      );
      // Assert: Save button should be disabled.
      expect(screen.getByLabelText("Save")).toBeDisabled();

      // Arrange: Rerender with only rotation dirty.
      rerender(
        <PreviewModalHeader
          {...defaultProps}
          isMobile={true}
          isRotationDirty={true}
          isNameDirty={false}
        />
      );
      // Assert: Save button should be enabled.
      expect(screen.getByLabelText("Save")).not.toBeDisabled();

      // Arrange: Rerender with only name dirty.
      rerender(
        <PreviewModalHeader
          {...defaultProps}
          isMobile={true}
          isRotationDirty={false}
          isNameDirty={true}
        />
      );
      // Assert: Save button should be enabled.
      expect(screen.getByLabelText("Save")).not.toBeDisabled();
    });
  });
});
