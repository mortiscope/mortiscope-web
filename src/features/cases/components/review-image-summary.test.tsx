import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { ReviewImageSummary } from "@/features/cases/components/review-image-summary";

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

// Mock the `next/image` component to prevent external dependency issues.
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: React.ComponentProps<"img">) =>
    React.createElement("img", { src, alt, className, "data-testid": "next-image" }),
}));

// Mock the Card components to isolate the structure of the summary display.
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Define mock file data for the list.
const mockFiles = Array.from({ length: 10 }, (_, i) => ({
  id: `id-${i}`,
  name: `image-${i}.jpg`,
  url: `http://example.com/img-${i}.jpg`,
})) as unknown as UploadableFile[];

// Define default props for the component under test.
const defaultProps = {
  sortedFiles: [],
  onImageClick: vi.fn(),
  getPreviewUrl: (file: UploadableFile) => (file as unknown as { url: string }).url,
  variants: {},
};

/**
 * Test suite for the `ReviewImageSummary` component.
 */
describe("ReviewImageSummary", () => {
  /**
   * Test case to verify that an empty state message is rendered when the file list is empty.
   */
  it("renders empty state message when no files are provided", () => {
    // Arrange: Render the component with an empty file list.
    render(<ReviewImageSummary {...defaultProps} sortedFiles={[]} />);

    // Assert: Check for the presence of the specific empty state text.
    expect(screen.getByText("No images were uploaded.")).toBeInTheDocument();
  });

  /**
   * Test suite for verifying the correct responsive rendering logic based on screen size (simulated by checking class names).
   */
  describe("Responsive Layouts", () => {
    /**
     * Test case to verify the grid and summary logic for large screens (displaying 4 images + a summary button).
     */
    it("renders correct logic for Large Screens (5+ grid)", () => {
      // Arrange: Render with 6 files (to exceed the threshold and trigger the summary button).
      render(<ReviewImageSummary {...defaultProps} sortedFiles={mockFiles.slice(0, 6)} />);

      // Assert: Check for the large screen grid container class.
      const largeGrid = document.querySelector(".lg\\:grid");
      expect(largeGrid).toBeInTheDocument();

      // Assert: Check that only 5 interactive elements (4 images + 1 View All button) are rendered.
      const buttons = largeGrid?.querySelectorAll("button");
      expect(buttons).toHaveLength(5);

      // Assert: Check that the summary text shows the correct count of remaining images (+2: files 4 and 5).
      expect(largeGrid).toHaveTextContent("+2");
      expect(largeGrid).toHaveTextContent("View All");
    });

    /**
     * Test case to verify the grid and summary logic for medium screens (displaying 2 images + a summary button).
     */
    it("renders correct logic for Medium Screens (3 grid)", () => {
      // Arrange: Render with 4 files (to exceed the medium threshold).
      render(<ReviewImageSummary {...defaultProps} sortedFiles={mockFiles.slice(0, 4)} />);

      // Assert: Check for the medium screen grid container class (visible on sm, hidden on lg).
      const mediumGrid = document.querySelector(".sm\\:grid.lg\\:hidden");
      expect(mediumGrid).toBeInTheDocument();

      // Assert: Check that only 3 interactive elements (2 images + 1 View All button) are rendered.
      const buttons = mediumGrid?.querySelectorAll("button");
      expect(buttons).toHaveLength(3);

      // Assert: Check that the summary text shows the correct count of remaining images (+2: files 2 and 3).
      expect(mediumGrid).toHaveTextContent("+2");
    });

    /**
     * Test case to verify the grid and summary logic for small screens (displaying 1 image + a summary button).
     */
    it("renders correct logic for Small Screens (2 grid)", () => {
      // Arrange: Render with 3 files (to exceed the small threshold).
      render(<ReviewImageSummary {...defaultProps} sortedFiles={mockFiles.slice(0, 3)} />);

      // Assert: Check for the small screen grid container class (grid-cols-2, hidden on sm).
      const smallGrid = document.querySelector(".grid-cols-2.sm\\:hidden");
      expect(smallGrid).toBeInTheDocument();

      // Assert: Check that only 2 interactive elements (1 image + 1 View All button) are rendered.
      const buttons = smallGrid?.querySelectorAll("button");
      expect(buttons).toHaveLength(2);

      // Assert: Check that the summary text shows the correct count of remaining images (+2: files 1 and 2).
      expect(smallGrid).toHaveTextContent("+2");
    });
  });

  /**
   * Test suite for interactions, verifying that clicks on image previews trigger the correct callback.
   */
  describe("Interactions", () => {
    /**
     * Test case to verify that clicking an individual image thumbnail on a large screen triggers `onImageClick` with the correct file object.
     */
    it("Large Screen: Calls onImageClick for individual image", async () => {
      // Arrange: Define a spy for the click callback and set up user events.
      const onImageClickMock = vi.fn();
      const user = userEvent.setup();
      const testFiles = mockFiles.slice(0, 4);

      // Arrange: Render the component.
      render(
        <ReviewImageSummary
          {...defaultProps}
          sortedFiles={testFiles}
          onImageClick={onImageClickMock}
        />
      );

      // Act: Find and click the first image button in the large grid view.
      const largeGrid = document.querySelector(".lg\\:grid");
      const firstButton = largeGrid?.querySelectorAll("button")[0];

      await user.click(firstButton!);
      // Assert: Check that the callback was called with the first file object.
      expect(onImageClickMock).toHaveBeenCalledWith(testFiles[0]);
    });

    /**
     * Test case to verify that clicking the "View All" button on a large screen triggers `onImageClick`, opening the first hidden image (index 4).
     */
    it("Large Screen: Calls onImageClick for 'View All' button", async () => {
      // Arrange: Define a spy for the click callback and set up user events.
      const onImageClickMock = vi.fn();
      const user = userEvent.setup();
      const testFiles = mockFiles.slice(0, 6);

      // Arrange: Render the component.
      render(
        <ReviewImageSummary
          {...defaultProps}
          sortedFiles={testFiles}
          onImageClick={onImageClickMock}
        />
      );

      // Act: Find and click the "View All" button (the 5th button, index 4).
      const largeGrid = document.querySelector(".lg\\:grid");
      const viewAllButton = largeGrid?.querySelectorAll("button")[4];

      await user.click(viewAllButton!);

      // Assert: Check that the callback was called with the file that would normally be displayed in the summary's place (index 4).
      expect(onImageClickMock).toHaveBeenCalledWith(testFiles[4]);
    });

    /**
     * Test case to verify that clicking an individual image thumbnail on a medium screen triggers `onImageClick` with the correct file object.
     */
    it("Medium Screen: Calls onImageClick for individual image", async () => {
      // Arrange: Define a spy for the click callback and set up user events.
      const onImageClickMock = vi.fn();
      const user = userEvent.setup();
      const testFiles = mockFiles.slice(0, 4);

      // Arrange: Render the component.
      render(
        <ReviewImageSummary
          {...defaultProps}
          sortedFiles={testFiles}
          onImageClick={onImageClickMock}
        />
      );

      // Act: Find and click the first image button in the medium grid view.
      const mediumGrid = document.querySelector(".sm\\:grid.lg\\:hidden");
      const firstButton = mediumGrid?.querySelectorAll("button")[0];

      await user.click(firstButton!);

      // Assert: Check that the callback was called with the first file object.
      expect(onImageClickMock).toHaveBeenCalledWith(testFiles[0]);
    });

    /**
     * Test case to verify that clicking the "View All" button on a medium screen triggers `onImageClick`, opening the first hidden image (index 2).
     */
    it("Medium Screen: Calls onImageClick for 'View All' button", async () => {
      // Arrange: Define a spy for the click callback and set up user events.
      const onImageClickMock = vi.fn();
      const user = userEvent.setup();
      const testFiles = mockFiles.slice(0, 4);

      // Arrange: Render the component.
      render(
        <ReviewImageSummary
          {...defaultProps}
          sortedFiles={testFiles}
          onImageClick={onImageClickMock}
        />
      );

      // Act: Find and click the "View All" button (the 3rd button, index 2).
      const mediumGrid = document.querySelector(".sm\\:grid.lg\\:hidden");
      const viewAllButton = mediumGrid?.querySelectorAll("button")[2];

      await user.click(viewAllButton!);
      // Assert: Check that the callback was called with the file that would normally be displayed in the summary's place (index 2).
      expect(onImageClickMock).toHaveBeenCalledWith(testFiles[2]);
    });

    /**
     * Test case to verify that clicking an individual image thumbnail on a small screen triggers `onImageClick` with the correct file object.
     */
    it("Small Screen: Calls onImageClick for individual image", async () => {
      // Arrange: Define a spy for the click callback and set up user events.
      const onImageClickMock = vi.fn();
      const user = userEvent.setup();
      const testFiles = mockFiles.slice(0, 2);

      // Arrange: Render the component.
      render(
        <ReviewImageSummary
          {...defaultProps}
          sortedFiles={testFiles}
          onImageClick={onImageClickMock}
        />
      );

      // Act: Find and click the first image button in the small grid view.
      const smallGrid = document.querySelector(".grid-cols-2.sm\\:hidden");
      const firstButton = smallGrid?.querySelectorAll("button")[0];

      await user.click(firstButton!);

      // Assert: Check that the callback was called with the first file object.
      expect(onImageClickMock).toHaveBeenCalledWith(testFiles[0]);
    });

    /**
     * Test case to verify that clicking the "View All" button on a small screen triggers `onImageClick`, opening the first hidden image (index 1).
     */
    it("Small Screen: Calls onImageClick for 'View All' button", async () => {
      // Arrange: Define a spy for the click callback and set up user events.
      const onImageClickMock = vi.fn();
      const user = userEvent.setup();
      const testFiles = mockFiles.slice(0, 2);

      // Arrange: Render the component.
      render(
        <ReviewImageSummary
          {...defaultProps}
          sortedFiles={testFiles}
          onImageClick={onImageClickMock}
        />
      );

      // Act: Find and click the "View All" button (the 2nd button, index 1).
      const smallGrid = document.querySelector(".grid-cols-2.sm\\:hidden");
      const viewAllButton = smallGrid?.querySelectorAll("button")[1];

      await user.click(viewAllButton!);
      // Assert: Check that the callback was called with the file that would normally be displayed in the summary's place (index 1).
      expect(onImageClickMock).toHaveBeenCalledWith(testFiles[1]);
    });
  });
});
