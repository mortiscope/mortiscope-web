import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { PreviewImageViewer } from "@/features/cases/components/preview-image-viewer";
import { type ViewingBox } from "@/features/images/hooks/use-preview-modal";

// Mock the `framer-motion` component for isolation and to verify container rendering.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: React.ComponentProps<"div">) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock the `next/image` component to prevent external dependency issues and verify style prop passing.
vi.mock("next/image", () => ({
  default: ({ src, alt, style }: React.ComponentProps<"img">) =>
    React.createElement("img", { src, alt, style, "data-testid": "next-image" }),
}));

// Mock the image transformation component from `react-zoom-pan-pinch`.
vi.mock("react-zoom-pan-pinch", () => ({
  TransformComponent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="transform-component">{children}</div>
  ),
}));

// Mock the minimap component.
vi.mock("@/features/upload/components/upload-preview-minimap", () => ({
  UploadPreviewMinimap: () => <div data-testid="minimap" />,
}));

// Mock the Tooltip components to verify button tooltips.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock icon components used in the toolbar.
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
}));

// Define a minimal mock file object for required props.
const mockFile = {
  id: "file-1",
  name: "test-image.jpg",
  preview: "blob:url",
} as unknown as UploadableFile;

// Define default props for the component under test.
const defaultProps = {
  activeFile: mockFile,
  previewUrl: "blob:url",
  rotation: 0,
  isMobile: false,
  variants: {},
  transformState: { scale: 1, positionX: 0, positionY: 0, previousScale: 1 },
  viewingBox: { width: 100, height: 100, x: 0, y: 0 } as unknown as ViewingBox,
  isRenaming: false,
  renameMutationIsPending: false,
  isSaving: false,
  isDeleting: false,
  isRotationDirty: false,
  isNameDirty: false,
  onRenameClick: vi.fn(),
  onDownload: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
};

/**
 * Test suite for the `PreviewImageViewer` component.
 */
describe("PreviewImageViewer", () => {
  /**
   * Test suite for rendering and structural layout concerns.
   */
  describe("Rendering & Layout", () => {
    /**
     * Test case to verify that the image component receives and applies the correct CSS rotation style.
     */
    it("renders the image with correct rotation style", () => {
      // Arrange: Render the component with a 90-degree rotation.
      render(<PreviewImageViewer {...defaultProps} rotation={90} />);

      // Assert: Check that the image element has the expected CSS `transform` style.
      const image = screen.getByTestId("next-image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveStyle({ transform: "rotate(90deg)" });
    });

    /**
     * Test case to verify that the toolbar buttons and minimap are visible on desktop screens.
     */
    it("renders toolbar and minimap on Desktop", () => {
      // Arrange: Render the component with `isMobile` set to false.
      render(<PreviewImageViewer {...defaultProps} isMobile={false} />);

      // Assert: Check for the presence of key toolbar buttons and the minimap.
      expect(screen.getByLabelText("Rename image")).toBeInTheDocument();
      expect(screen.getByLabelText("Download")).toBeInTheDocument();
      expect(screen.getByTestId("minimap")).toBeInTheDocument();
    });

    /**
     * Test case to verify that the toolbar and minimap are hidden on mobile screens.
     */
    it("hides toolbar and minimap on Mobile", () => {
      // Arrange: Render the component with `isMobile` set to true.
      render(<PreviewImageViewer {...defaultProps} isMobile={true} />);

      // Assert: Check for the absence of key toolbar buttons and the minimap.
      expect(screen.queryByLabelText("Rename image")).not.toBeInTheDocument();
      expect(screen.queryByTestId("minimap")).not.toBeInTheDocument();
    });
  });

  /**
   * Test suite for user interaction with the control buttons.
   */
  describe("Interactions", () => {
    /**
     * Test case to verify that clicking the rename button triggers the `onRenameClick` callback.
     */
    it("calls onRenameClick when rename button is clicked", async () => {
      // Arrange: Define a spy for the callback and set up user events.
      const onRenameClickMock = vi.fn();
      const user = userEvent.setup();
      render(<PreviewImageViewer {...defaultProps} onRenameClick={onRenameClickMock} />);

      // Act: Click the rename button.
      await user.click(screen.getByLabelText("Rename image"));
      // Assert: Check that the mock callback was called.
      expect(onRenameClickMock).toHaveBeenCalled();
    });

    /**
     * Test case to verify that clicking the download button triggers the `onDownload` callback.
     */
    it("calls onDownload when download button is clicked", async () => {
      // Arrange: Define a spy for the callback and set up user events.
      const onDownloadMock = vi.fn();
      const user = userEvent.setup();
      render(<PreviewImageViewer {...defaultProps} onDownload={onDownloadMock} />);

      // Act: Click the download button.
      await user.click(screen.getByLabelText("Download"));
      // Assert: Check that the mock callback was called.
      expect(onDownloadMock).toHaveBeenCalled();
    });

    /**
     * Test case to verify that clicking the save button triggers the `onSave` callback when changes exist.
     */
    it("calls onSave when save button is clicked and changes exist", async () => {
      // Arrange: Define a spy for the callback and set up user events.
      const onSaveMock = vi.fn();
      const user = userEvent.setup();

      // Arrange: Render the component with `isRotationDirty` set to true (indicating changes).
      render(<PreviewImageViewer {...defaultProps} onSave={onSaveMock} isRotationDirty={true} />);

      // Act: Click the save button.
      await user.click(screen.getByLabelText("Save"));
      // Assert: Check that the mock callback was called.
      expect(onSaveMock).toHaveBeenCalled();
    });

    /**
     * Test case to verify that clicking the delete button triggers the `onDelete` callback.
     */
    it("calls onDelete when delete button is clicked", async () => {
      // Arrange: Define a spy for the callback and set up user events.
      const onDeleteMock = vi.fn();
      const user = userEvent.setup();
      render(<PreviewImageViewer {...defaultProps} onDelete={onDeleteMock} />);

      // Act: Click the delete button.
      await user.click(screen.getByLabelText("Delete image"));
      // Assert: Check that the mock callback was called.
      expect(onDeleteMock).toHaveBeenCalled();
    });
  });

  /**
   * Test suite for verifying correct display during various loading and dirty states.
   */
  describe("States & Loading", () => {
    /**
     * Test case to verify that the loader icon is shown and the button is disabled when a rename mutation is pending.
     */
    it("shows loader icon when rename mutation is pending", () => {
      // Arrange: Render the component with `renameMutationIsPending` set to true.
      render(<PreviewImageViewer {...defaultProps} renameMutationIsPending={true} />);

      // Assert: Check that the rename button contains the loader icon and is disabled.
      const renameBtn = screen.getByLabelText("Rename image");
      expect(renameBtn).toContainElement(screen.getByTestId("icon-loader"));
      expect(renameBtn).toBeDisabled();
    });

    /**
     * Test case to verify that the loader icon is shown and the button is disabled when saving is in progress.
     */
    it("shows loader icon when saving", () => {
      // Arrange: Render the component with `isSaving` set to true.
      render(<PreviewImageViewer {...defaultProps} isSaving={true} isRotationDirty={true} />);

      // Assert: Check that the save button contains the loader icon and is disabled.
      const saveBtn = screen.getByLabelText("Save");
      expect(saveBtn).toContainElement(screen.getByTestId("icon-loader"));
      expect(saveBtn).toBeDisabled();
    });

    /**
     * Test case to verify that the loader icon is shown and the button is disabled when deleting is in progress.
     */
    it("shows loader icon when deleting", () => {
      // Arrange: Render the component with `isDeleting` set to true.
      render(<PreviewImageViewer {...defaultProps} isDeleting={true} />);

      // Assert: Check that the delete button contains the loader icon and is disabled.
      const deleteBtn = screen.getByLabelText("Delete image");
      expect(deleteBtn).toContainElement(screen.getByTestId("icon-loader"));
      expect(deleteBtn).toBeDisabled();
    });

    /**
     * Test case to verify that the save button is disabled when no changes have been made (both dirty flags are false).
     */
    it("disables save button if no changes (dirty flags false)", () => {
      // Arrange: Render the component with no dirty flags set.
      render(<PreviewImageViewer {...defaultProps} isRotationDirty={false} isNameDirty={false} />);

      // Assert: Check that the save button is disabled.
      expect(screen.getByLabelText("Save")).toBeDisabled();
    });

    /**
     * Test case to verify that the save button is enabled if the file name has been changed.
     */
    it("enables save button if name is dirty", () => {
      // Arrange: Render the component with `isNameDirty` set to true.
      render(<PreviewImageViewer {...defaultProps} isNameDirty={true} />);

      // Assert: Check that the save button is enabled.
      expect(screen.getByLabelText("Save")).not.toBeDisabled();
    });
  });
});
