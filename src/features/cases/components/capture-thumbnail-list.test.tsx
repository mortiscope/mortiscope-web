import { type UseMutationResult } from "@tanstack/react-query";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { UploadableFile } from "@/features/analyze/store/analyze-store";
import { CaptureThumbnailList } from "@/features/cases/components/capture-thumbnail-list";
import { type ServerActionResponse } from "@/features/cases/constants/types";

// Mock `framer-motion` components to isolate testing to component logic and not animation details.
vi.mock("framer-motion", () => ({
  // Arrange: Mock `AnimatePresence` to directly render its children.
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    // Arrange: Mock `motion.div` as a standard div with a test ID and class passthrough.
    div: ({ children, className, ...props }: React.ComponentProps<"div">) => (
      <div className={className} data-testid="motion-wrapper" {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock `ScrollArea` components from `shadcn/ui` as they are non-essential UI wrappers.
vi.mock("@/components/ui/scroll-area", () => ({
  // Arrange: Mock `ScrollArea` to render its children directly.
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // Arrange: Mock `ScrollBar` to render nothing.
  ScrollBar: () => null,
}));

// Mock the individual `CaptureImageThumbnail` component to simplify the test structure.
vi.mock("@/features/cases/components/capture-image-thumbnail", () => ({
  CaptureImageThumbnail: ({
    uploadableFile,
    onRemove,
    isDeleting,
  }: {
    uploadableFile: UploadableFile;
    onRemove: () => void;
    isDeleting: boolean;
  }) => (
    // Arrange: Render a mock thumbnail item with file name, remove button, and a deleting indicator.
    <div data-testid="thumbnail-item">
      <span>{uploadableFile.name}</span>
      <button onClick={onRemove} disabled={isDeleting} aria-label={`Remove ${uploadableFile.name}`}>
        Remove
      </button>
      {isDeleting && <span data-testid="deleting-indicator">Deleting...</span>}
    </div>
  ),
}));

// Arrange: Define an array of mock `UploadableFile` objects for the `cameraFiles` prop.
const mockFiles: UploadableFile[] = [
  {
    id: "1",
    name: "image-1.jpg",
    key: "key-1",
    status: "pending",
    progress: 0,
  } as unknown as UploadableFile,
  {
    id: "2",
    name: "image-2.jpg",
    key: "key-2",
    status: "pending",
    progress: 0,
  } as unknown as UploadableFile,
];

// Arrange: Define a mock `useMutation` result object, representing no active deletion by default.
const mockDeleteMutation = {
  isPending: false,
  variables: undefined,
  mutate: vi.fn(),
  reset: vi.fn(),
} as unknown as UseMutationResult<ServerActionResponse, Error, { key: string }, unknown>;

// Arrange: Define a standard set of props used across all test cases.
const defaultProps = {
  cameraFiles: mockFiles,
  onRemoveFile: vi.fn(),
  isMobile: false,
  deleteMutation: mockDeleteMutation,
};

/**
 * Test suite for the `CaptureThumbnailList` component, verifying file rendering and deletion state passing.
 */
describe("CaptureThumbnailList", () => {
  /**
   * Test case to ensure nothing is rendered if the file list is empty.
   */
  it("renders nothing if cameraFiles list is empty", () => {
    // Act: Render the component with an empty `cameraFiles` array.
    const { container } = render(<CaptureThumbnailList {...defaultProps} cameraFiles={[]} />);
    // Assert: Verify that the root container element is empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to ensure the correct number of thumbnails are rendered and their names are visible.
   */
  it("renders the correct number of thumbnails", () => {
    // Act: Render the component with the mock file list.
    render(<CaptureThumbnailList {...defaultProps} />);

    // Assert: Verify that two thumbnail items are found.
    const items = screen.getAllByTestId("thumbnail-item");
    expect(items).toHaveLength(2);
    // Assert: Verify the names of both files are present in the document.
    expect(screen.getByText("image-1.jpg")).toBeInTheDocument();
    expect(screen.getByText("image-2.jpg")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking a thumbnail's remove button calls the `onRemoveFile` callback with the correct file object.
   */
  it("calls onRemoveFile with correct file when remove button is clicked", async () => {
    // Arrange: Initialize user event simulation.
    const user = userEvent.setup();
    // Act: Render the component.
    render(<CaptureThumbnailList {...defaultProps} />);

    // Act: Find and click the remove button for the first image.
    const removeBtn = screen.getByLabelText("Remove image-1.jpg");
    await user.click(removeBtn);

    // Assert: Verify that `onRemoveFile` was called exactly once.
    expect(defaultProps.onRemoveFile).toHaveBeenCalledTimes(1);
    // Assert: Verify that the function was called with the specific file object.
    expect(defaultProps.onRemoveFile).toHaveBeenCalledWith(mockFiles[0]);
  });

  /**
   * Test case to ensure the `isDeleting` state is passed only to the specific thumbnail whose key matches the mutation's variables.
   */
  it("passes isDeleting=true only to the item currently being deleted", () => {
    // Arrange: Create a mock mutation state indicating that file "key-1" is currently pending deletion.
    const activeDeleteMutation = {
      ...mockDeleteMutation,
      isPending: true,
      variables: { key: "key-1" },
    } as unknown as UseMutationResult<ServerActionResponse, Error, { key: string }, unknown>;

    // Act: Render the component with the active deletion state.
    render(<CaptureThumbnailList {...defaultProps} deleteMutation={activeDeleteMutation} />);

    // Assert: Find the thumbnail wrapper for image-1.jpg and verify the "Deleting..." indicator is present.
    const item1Wrapper = screen.getByText("image-1.jpg").closest("div");
    expect(item1Wrapper).toHaveTextContent("Deleting...");

    // Assert: Find the thumbnail wrapper for image-2.jpg and verify the "Deleting..." indicator is absent.
    const item2Wrapper = screen.getByText("image-2.jpg").closest("div");
    expect(item2Wrapper).not.toHaveTextContent("Deleting...");
  });

  /**
   * Test case to verify that mobile-specific positioning and styling classes are applied.
   */
  it("applies mobile specific classes when isMobile is true", () => {
    // Act: Render the component with `isMobile` set to true.
    render(<CaptureThumbnailList {...defaultProps} isMobile={true} />);

    // Assert: Find the root motion wrapper and check for mobile positioning classes.
    const wrapper = screen.getByTestId("motion-wrapper");
    expect(wrapper).toHaveClass("absolute bottom-[88px]");
  });

  /**
   * Test case to verify that desktop-specific styling classes are applied.
   */
  it("applies desktop specific classes when isMobile is false", () => {
    // Act: Render the component with default desktop settings.
    render(<CaptureThumbnailList {...defaultProps} isMobile={false} />);

    // Assert: Find the root motion wrapper and check for desktop padding classes.
    const wrapper = screen.getByTestId("motion-wrapper");
    expect(wrapper).toHaveClass("px-6 pb-0");
    // Assert: Verify that mobile positioning classes are absent.
    expect(wrapper).not.toHaveClass("absolute");
  });
});
