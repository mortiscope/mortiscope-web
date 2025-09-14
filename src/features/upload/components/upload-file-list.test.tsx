import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { UploadFileList } from "@/features/upload/components/upload-file-list";

// Mock the 'framer-motion' library components to simplify snapshot and structure testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: React.ComponentProps<"div">) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the `UploadFileItem` component to isolate list testing from item details.
vi.mock("@/features/upload/components/upload-file-item", () => ({
  UploadFileItem: ({ file, viewMode }: { file: UploadableFile; viewMode: string }) => (
    <div data-testid="upload-file-item" data-view-mode={viewMode}>
      {file.name}
    </div>
  ),
}));

/**
 * Test suite for the `UploadFileList` component, which handles the display and layout of multiple files.
 */
describe("UploadFileList", () => {
  // Arrange: Define a mock array of `UploadableFile` objects for testing iteration and rendering.
  const mockFiles: UploadableFile[] = [
    {
      id: "1",
      name: "file-1.jpg",
      size: 1000,
      type: "image/jpeg",
      status: "success",
      progress: 100,
      url: "blob:url1",
      file: new File([""], "file-1.jpg"),
      source: "upload",
      dateUploaded: new Date(),
      version: 1,
      key: "key-1",
    },
    {
      id: "2",
      name: "file-2.jpg",
      size: 2000,
      type: "image/jpeg",
      status: "pending",
      progress: 0,
      url: "blob:url2",
      file: new File([""], "file-2.jpg"),
      source: "upload",
      dateUploaded: new Date(),
      version: 1,
      key: "key-2",
    },
  ];

  // Arrange: Define a default set of props for the component under test.
  const defaultProps = {
    files: mockFiles,
    viewMode: "list" as const,
    onViewFile: vi.fn(),
    onDeleteFile: vi.fn(),
    onRetry: vi.fn(),
    deletingFileId: null,
  };

  /**
   * Test case to verify that the component iterates over the `files` prop and renders a mock `UploadFileItem` for each one.
   */
  it("renders the correct number of file items", () => {
    // Arrange: Render the component with the mock file array.
    render(<UploadFileList {...defaultProps} />);
    // Assert: Verify that the total number of rendered mock items matches the number of files in the array.
    const items = screen.getAllByTestId("upload-file-item");
    expect(items).toHaveLength(2);
    // Assert: Check that the names of the files are correctly passed and rendered by the mock component.
    expect(screen.getByText("file-1.jpg")).toBeInTheDocument();
    expect(screen.getByText("file-2.jpg")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component applies the correct CSS classes for a list view layout.
   */
  it("renders with list view layout classes", () => {
    // Arrange: Render the component in "list" mode.
    const { container } = render(<UploadFileList {...defaultProps} viewMode="list" />);

    // Assert: Retrieve the top-level container element and check for expected responsive CSS grid classes for a list layout.
    const gridContainer = container.firstChild as HTMLElement;

    expect(gridContainer).toHaveClass("grid-cols-1");
    expect(gridContainer).toHaveClass("md:grid-cols-2");
  });

  /**
   * Test case to verify that the component applies the correct CSS classes for a grid view layout.
   */
  it("renders with grid view layout classes", () => {
    // Arrange: Render the component in "grid" mode.
    const { container } = render(<UploadFileList {...defaultProps} viewMode="grid" />);

    // Assert: Retrieve the top-level container element and check for expected responsive CSS grid classes for a grid layout.
    const gridContainer = container.firstChild as HTMLElement;

    expect(gridContainer).toHaveClass("grid-cols-2");
    expect(gridContainer).toHaveClass("lg:grid-cols-5");
  });

  /**
   * Test case to verify that the `viewMode` prop is successfully passed down to every rendered child `UploadFileItem`.
   */
  it("passes the viewMode prop correctly to children", () => {
    // Arrange: Render the component in grid mode.
    render(<UploadFileList {...defaultProps} viewMode="grid" />);

    // Assert: Retrieve all rendered mock items and confirm that each one received the correct `data-view-mode` attribute value.
    const items = screen.getAllByTestId("upload-file-item");
    items.forEach((item) => {
      expect(item).toHaveAttribute("data-view-mode", "grid");
    });
  });

  /**
   * Test case to verify that no file items are rendered when the `files` array is empty.
   */
  it("renders nothing inside container if files array is empty", () => {
    // Arrange: Render the component with an empty array for the `files` prop.
    render(<UploadFileList {...defaultProps} files={[]} />);
    // Assert: Query for all mock items and confirm that zero elements were found.
    const items = screen.queryAllByTestId("upload-file-item");
    expect(items).toHaveLength(0);
  });
});
