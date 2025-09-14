import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { UploadFileItem } from "@/features/upload/components/upload-file-item";

// Mock the 'framer-motion' library components to simplify testing structure.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      ...props
    }: React.ComponentProps<"div"> & { children: React.ReactNode }) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock the `UploadStatusIcon` component to isolate its rendering.
vi.mock("@/features/upload/components/upload-status-icon", () => ({
  UploadStatusIcon: () => <div data-testid="status-icon" />,
}));

// Mock the `UploadThumbnail` component to isolate its rendering.
vi.mock("@/features/upload/components/upload-thumbnail", () => ({
  UploadThumbnail: () => <div data-testid="upload-thumbnail" />,
}));

// Mock the `Tooltip` components to avoid unnecessary complex rendering in tests.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div hidden>{children}</div>,
}));

// Mock the `formatBytes` utility function to return a constant value for predictable size rendering.
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatBytes: () => "1.0 MB",
  };
});

/**
 * Test suite for the `UploadFileItem` component, which displays a single file's information and controls.
 */
describe("UploadFileItem", () => {
  // Arrange: Define a consistent mock `UploadableFile` object for use across tests.
  const mockFile: UploadableFile = {
    id: "file-123",
    file: new File(["dummy content"], "test-image.png", { type: "image/png" }),
    url: "blob:http://localhost:3000/uuid",
    name: "test-image.png",
    size: 1024 * 1024,
    type: "image/png",
    status: "success",
    progress: 100,
    key: "s3-key-123",
    source: "upload",
    dateUploaded: new Date(),
    version: 1,
  };

  // Arrange: Define a default set of props for the component under test.
  const defaultProps = {
    file: mockFile,
    viewMode: "list" as const,
    onViewFile: vi.fn(),
    onDeleteFile: vi.fn(),
    onRetry: vi.fn(),
    deletingFileId: null,
  };

  /**
   * Test suite for the component behavior when the `viewMode` is set to "list".
   */
  describe("List View Mode", () => {
    /**
     * Test case to verify that the file name, size, thumbnail, and status icon are all rendered in list view.
     */
    it("renders file details correctly", () => {
      // Arrange: Render the component in "list" mode.
      render(<UploadFileItem {...defaultProps} viewMode="list" />);

      // Assert: Check for the presence of the file name, formatted size, and mock thumbnail/status icons.
      expect(screen.getByText("test-image.png")).toBeInTheDocument();
      expect(screen.getByText("1.0 MB")).toBeInTheDocument();
      expect(screen.getByTestId("upload-thumbnail")).toBeInTheDocument();
      expect(screen.getByTestId("status-icon")).toBeInTheDocument();
    });

    /**
     * Test case to verify that the `onViewFile` callback is triggered when the file row itself is clicked.
     */
    it("calls onViewFile when clicking the file container", () => {
      // Arrange: Render the component in "list" mode.
      render(<UploadFileItem {...defaultProps} viewMode="list" />);

      // Act: Find the main file row container using its ARIA label and simulate a click.
      const row = screen
        .getAllByLabelText(`View ${mockFile.name}`)
        .find((el) => el.tagName === "DIV");

      fireEvent.click(row!);
      // Assert: Verify that the `onViewFile` function was called with the mock file object.
      expect(defaultProps.onViewFile).toHaveBeenCalledWith(mockFile);
    });
  });

  /**
   * Test suite for the component behavior when the `viewMode` is set to "grid".
   */
  describe("Grid View Mode", () => {
    /**
     * Test case to verify that the grid view renders a compact layout, excluding textual file details.
     */
    it("renders compact layout without text details", () => {
      // Arrange: Render the component in "grid" mode.
      render(<UploadFileItem {...defaultProps} viewMode="grid" />);

      // Assert: Check that the file name and size text elements are not present.
      expect(screen.queryByText("test-image.png")).not.toBeInTheDocument();
      expect(screen.queryByText("1.0 MB")).not.toBeInTheDocument();

      // Assert: Check that the visual thumbnail is still present.
      expect(screen.getByTestId("upload-thumbnail")).toBeInTheDocument();
    });

    /**
     * Test case to verify that the `onViewFile` callback is triggered when the grid thumbnail container is clicked.
     */
    it("calls onViewFile when clicking the grid thumbnail container", () => {
      // Arrange: Render the component in "grid" mode.
      render(<UploadFileItem {...defaultProps} viewMode="grid" />);

      // Act: Find the clickable thumbnail container using its ARIA label and simulate a click.
      const thumbnailContainer = screen
        .getAllByLabelText(`View ${mockFile.name}`)
        .find((el) => el.tagName === "DIV");

      fireEvent.click(thumbnailContainer!);
      // Assert: Verify that the `onViewFile` function was called with the mock file object.
      expect(defaultProps.onViewFile).toHaveBeenCalledWith(mockFile);
    });

    it("calls onViewFile when clicking the eye icon button in grid mode", () => {
      render(<UploadFileItem {...defaultProps} viewMode="grid" />);
      const viewButtons = screen.getAllByRole("button", { name: `View ${mockFile.name}` });
      // In grid mode, the button is rendered.
      const viewButton = viewButtons.find((btn) => btn.tagName === "BUTTON");
      fireEvent.click(viewButton!);
      expect(defaultProps.onViewFile).toHaveBeenCalledWith(mockFile);
    });

    it("calls onDeleteFile when clicking the trash icon button in grid mode", () => {
      render(<UploadFileItem {...defaultProps} viewMode="grid" />);
      const deleteButton = screen.getByRole("button", { name: `Remove ${mockFile.name}` });
      fireEvent.click(deleteButton);
      expect(defaultProps.onDeleteFile).toHaveBeenCalledWith(mockFile.id, mockFile.key);
    });

    it("passes null key to onDeleteFile in grid mode if file has no key", () => {
      const fileWithoutKey = { ...mockFile, key: undefined };
      render(
        <UploadFileItem
          {...defaultProps}
          viewMode="grid"
          file={fileWithoutKey as unknown as UploadableFile}
        />
      );
      const deleteButton = screen.getByRole("button", { name: `Remove ${mockFile.name}` });
      fireEvent.click(deleteButton);
      expect(defaultProps.onDeleteFile).toHaveBeenCalledWith(mockFile.id, null);
    });

    it("shows spinner in grid mode when deleting this file", () => {
      render(<UploadFileItem {...defaultProps} viewMode="grid" deletingFileId={mockFile.id} />);
      const deleteButton = screen.getByRole("button", { name: `Remove ${mockFile.name}` });
      expect(deleteButton).toBeDisabled();
      const spinner = deleteButton.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  /**
   * Test suite for common user interactions available in both view modes.
   */
  describe("Interactions (Common)", () => {
    /**
     * Test case to verify that the `onViewFile` callback is executed when the explicit "View" icon button is clicked.
     */
    it("calls onViewFile when clicking the eye icon button", () => {
      // Arrange: Render the component in its default list view mode.
      render(<UploadFileItem {...defaultProps} />);

      // Act: Find the specific button using its ARIA role and label, ensuring only the button element is selected, and click it.
      const viewButtons = screen.getAllByRole("button", {
        name: `View ${mockFile.name}`,
      });
      const viewButton = viewButtons.find((btn) => btn.tagName === "BUTTON");

      fireEvent.click(viewButton!);
      // Assert: Verify that the `onViewFile` function was called with the mock file object.
      expect(defaultProps.onViewFile).toHaveBeenCalledWith(mockFile);
    });

    /**
     * Test case to verify that the `onDeleteFile` callback is executed when the "Remove" icon button is clicked.
     */
    it("calls onDeleteFile when clicking the trash icon button", () => {
      // Arrange: Render the component.
      render(<UploadFileItem {...defaultProps} />);

      // Act: Find the delete button using its ARIA role and label, and click it.
      const deleteButton = screen.getByRole("button", {
        name: `Remove ${mockFile.name}`,
      });

      fireEvent.click(deleteButton);
      // Assert: Verify that the `onDeleteFile` function was called with the file's ID and S3 key.
      expect(defaultProps.onDeleteFile).toHaveBeenCalledWith(mockFile.id, mockFile.key);
    });

    /**
     * Test case to verify that a `null` value is passed for the S3 key if the file object is missing a key property.
     */
    it("passes null key to onDeleteFile if file has no key", () => {
      // Arrange: Create a file object explicitly missing the `key` property.
      const fileWithoutKey = { ...mockFile, key: undefined };
      // Arrange: Render the component with the file that has no S3 key.
      render(
        <UploadFileItem {...defaultProps} file={fileWithoutKey as unknown as UploadableFile} />
      );

      // Act: Find and click the delete button.
      const deleteButton = screen.getByRole("button", {
        name: `Remove ${mockFile.name}`,
      });

      fireEvent.click(deleteButton);
      // Assert: Verify that the `onDeleteFile` function was called with the file ID and `null` as the S3 key.
      expect(defaultProps.onDeleteFile).toHaveBeenCalledWith(mockFile.id, null);
    });
  });

  /**
   * Test suite for the component's behavior when a file deletion operation is pending.
   */
  describe("Loading State", () => {
    /**
     * Test case to verify that interactive elements are disabled and a loading spinner is visible when the current file is being deleted.
     */
    it("disables buttons and shows spinner when deleting this file", () => {
      // Arrange: Render the component while passing the current file's ID to `deletingFileId`.
      render(<UploadFileItem {...defaultProps} deletingFileId={mockFile.id} />);

      // Assert: Check that the delete button is disabled.
      const deleteButton = screen.getByRole("button", {
        name: `Remove ${mockFile.name}`,
      });
      // Assert: Check that the view button is disabled.
      const viewButton = screen
        .getAllByRole("button", { name: `View ${mockFile.name}` })
        .find((el) => el.tagName === "BUTTON");

      expect(deleteButton).toBeDisabled();
      expect(viewButton).toBeDisabled();

      // Assert: Check for the presence of the loading spinner class on the delete button.
      const spinner = deleteButton.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    /**
     * Test case to verify that the item remains interactive if a different file is currently being deleted.
     */
    it("does not disable buttons when deleting a different file", () => {
      // Arrange: Render the component while a different file's ID is set for deletion.
      render(<UploadFileItem {...defaultProps} deletingFileId="other-file-id" />);

      // Assert: Check that the delete button is not disabled.
      const deleteButton = screen.getByRole("button", {
        name: `Remove ${mockFile.name}`,
      });

      expect(deleteButton).not.toBeDisabled();
      // Assert: Check that the loading spinner is not visible.
      expect(deleteButton.querySelector(".animate-spin")).not.toBeInTheDocument();
    });
  });
});
