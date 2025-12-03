import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { mockUploads } from "@/__tests__/mocks/fixtures/uploads.fixtures";
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
    ...mockUploads.firstUpload,
    file: new File(["dummy content"], mockUploads.firstUpload.name, {
      type: mockUploads.firstUpload.type,
    }),
    status: "success",
    progress: 100,
    source: "upload",
    dateUploaded: new Date(mockUploads.firstUpload.createdAt),
    version: 1,
    imageType: null,
  };

  // Arrange: Define a default set of props for the component under test.
  const defaultProps = {
    file: mockFile,
    viewMode: "list" as const,
    onViewFile: vi.fn(),
    onDeleteFile: vi.fn(),
    onRetry: vi.fn(),
    deletingFileId: null,
    onSetImageType: vi.fn(),
  };

  /**
   * Test suite for the Image Type Indicator within the Upload File Item component.
   */
  describe("Image Type Indicator", () => {
    /**
     * Test case to verify that the macro icon is rendered when the file type is set to macro.
     */
    it("renders macro icon when imageType is macro", () => {
      // Arrange: Create a file mock with the `imageType` property set to `macro`.
      const macroFile = { ...mockFile, imageType: "macro" as const };
      render(<UploadFileItem {...defaultProps} file={macroFile} />);

      // Act: Locate the button using the accessible label associated with the file name.
      const setImageTypeBtn = screen.getByLabelText(`Set image type for ${macroFile.name}`);

      // Assert: Verify the button is in the document and contains the expected styling classes.
      expect(setImageTypeBtn).toBeInTheDocument();
      expect(setImageTypeBtn).toHaveClass("text-slate-500");
    });

    /**
     * Test case to verify that the field icon is rendered when the file type is set to field.
     */
    it("renders field icon when imageType is field", () => {
      // Arrange: Create a file mock with the `imageType` property set to `field`.
      const fieldFile = { ...mockFile, imageType: "field" as const };
      render(<UploadFileItem {...defaultProps} file={fieldFile} />);

      // Act: Locate the button using the accessible label associated with the file name.
      const setImageTypeBtn = screen.getByLabelText(`Set image type for ${fieldFile.name}`);

      // Assert: Verify the button is present and styled correctly for the field state.
      expect(setImageTypeBtn).toBeInTheDocument();
      expect(setImageTypeBtn).toHaveClass("text-slate-500");
    });

    /**
     * Test case to verify that the image type selection button is hidden when a file upload fails.
     */
    it("does not render image type button if file status is error", () => {
      // Arrange: Create a file mock where the `status` property is set to `error`.
      const errorFile = { ...mockFile, status: "error" as const };
      render(<UploadFileItem {...defaultProps} file={errorFile} />);

      // Act: Attempt to find the image type button in the document.
      const setImageTypeBtn = screen.queryByLabelText(`Set image type for ${errorFile.name}`);

      // Assert: Ensure the button is not rendered when the file is in an error state.
      expect(setImageTypeBtn).not.toBeInTheDocument();
    });
  });

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
      expect(screen.getByText(mockFile.name)).toBeInTheDocument();
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

    /**
     * Test case to verify that the onSetImageType callback is executed when the interaction button is clicked in list view.
     */
    it("calls onSetImageType when clicking the set image type button in list mode", () => {
      // Arrange: Render the component with the `viewMode` prop set to "list".
      render(<UploadFileItem {...defaultProps} viewMode="list" />);

      // Act: Locate the image type button by its accessible label and simulate a user click.
      const setImageTypeBtn = screen.getByLabelText(`Set image type for ${mockFile.name}`);
      fireEvent.click(setImageTypeBtn);

      // Assert: Ensure the `onSetImageType` function was triggered with the correct `mockFile` object.
      expect(defaultProps.onSetImageType).toHaveBeenCalledWith(mockFile);
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
      expect(screen.queryByText(mockFile.name)).not.toBeInTheDocument();
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

    /**
     * Test case to verify that the onViewFile callback is triggered when the view button is clicked in grid mode.
     */
    it("calls onViewFile when clicking the eye icon button in grid mode", () => {
      // Arrange: Render the component in "grid" mode.
      render(<UploadFileItem {...defaultProps} viewMode="grid" />);

      // Act: Filter the available buttons to identify the specific button element for viewing the file.
      const viewButtons = screen.getAllByRole("button", { name: `View ${mockFile.name}` });
      const viewButton = viewButtons.find((btn) => btn.tagName === "BUTTON");
      fireEvent.click(viewButton!);

      // Assert: Ensure the `onViewFile` callback is invoked with the `mockFile` data.
      expect(defaultProps.onViewFile).toHaveBeenCalledWith(mockFile);
    });

    /**
     * Test case to verify that the onDeleteFile callback is triggered when the removal button is clicked in grid mode.
     */
    it("calls onDeleteFile when clicking the trash icon button in grid mode", () => {
      // Arrange: Render the component in "grid" mode.
      render(<UploadFileItem {...defaultProps} viewMode="grid" />);

      // Act: Locate the deletion button by its accessible name and simulate a click event.
      const deleteButton = screen.getByRole("button", { name: `Remove ${mockFile.name}` });
      fireEvent.click(deleteButton);

      // Assert: Ensure `onDeleteFile` is called with both the file `id` and `key`.
      expect(defaultProps.onDeleteFile).toHaveBeenCalledWith(mockFile.id, mockFile.key);
    });

    /**
     * Test case to verify that the onSetImageType callback is triggered when the type selection button is clicked in grid mode.
     */
    it("calls onSetImageType when clicking the set image type button in grid mode", () => {
      // Arrange: Render the component in "grid" mode.
      render(<UploadFileItem {...defaultProps} viewMode="grid" />);

      // Act: Locate the image type button via its label and trigger a click.
      const setImageTypeBtn = screen.getByLabelText(`Set image type for ${mockFile.name}`);
      fireEvent.click(setImageTypeBtn);

      // Assert: Verify that `onSetImageType` receives the current `mockFile` as an argument.
      expect(defaultProps.onSetImageType).toHaveBeenCalledWith(mockFile);
    });

    /**
     * Test case to verify that a null key is passed to the delete callback if the file metadata is incomplete.
     */
    it("passes null key to onDeleteFile in grid mode if file has no key", () => {
      // Arrange: Create a file object where the `key` property is `undefined`.
      const fileWithoutKey = { ...mockFile, key: undefined };
      render(
        <UploadFileItem
          {...defaultProps}
          viewMode="grid"
          file={fileWithoutKey as unknown as UploadableFile}
        />
      );

      // Act: Trigger the deletion logic by clicking the removal button.
      const deleteButton = screen.getByRole("button", { name: `Remove ${mockFile.name}` });
      fireEvent.click(deleteButton);

      // Assert: Confirm that the callback handles the missing key by passing `null`.
      expect(defaultProps.onDeleteFile).toHaveBeenCalledWith(mockFile.id, null);
    });

    /**
     * Test case to verify that the UI displays a loading spinner and disables interaction during file deletion.
     */
    it("shows spinner in grid mode when deleting this file", () => {
      // Arrange: Render the component with a `deletingFileId` matching the current file.
      render(<UploadFileItem {...defaultProps} viewMode="grid" deletingFileId={mockFile.id} />);

      // Act: Locate the deletion button in the DOM.
      const deleteButton = screen.getByRole("button", { name: `Remove ${mockFile.name}` });

      // Assert: Verify the button is non-interactive and contains a child element with the animation class.
      expect(deleteButton).toBeDisabled();
      const spinner = deleteButton.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    /**
     * Test case to verify that a red visual indicator is displayed in grid mode when the image type is missing.
     */
    it("renders red icon if imageType is unset in grid mode", () => {
      // Arrange: Render the component in "grid" mode with the `imageType` prop set to `null`.
      render(
        <UploadFileItem {...defaultProps} viewMode="grid" file={{ ...mockFile, imageType: null }} />
      );

      // Act: Locate the image type selection button by its accessible label.
      const setImageTypeBtn = screen.getByLabelText(`Set image type for ${mockFile.name}`);

      // Assert: Ensure the button contains the `text-red-500` class to signal a required action.
      expect(setImageTypeBtn).toHaveClass("text-red-500");
    });

    /**
     * Test case to verify that a standard slate visual indicator is displayed in grid mode when the image type is defined.
     */
    it("renders indigo icon if imageType is set in grid mode", () => {
      // Arrange: Render the component in "grid" mode with a valid `imageType` provided.
      render(
        <UploadFileItem
          {...defaultProps}
          viewMode="grid"
          file={{ ...mockFile, imageType: "macro" }}
        />
      );

      // Act: Locate the image type selection button by its accessible label.
      const setImageTypeBtn = screen.getByLabelText(`Set image type for ${mockFile.name}`);

      // Assert: Ensure the button contains the `text-slate-500` class indicating a completed state.
      expect(setImageTypeBtn).toHaveClass("text-slate-500");
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
