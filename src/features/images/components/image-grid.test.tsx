import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ImageGrid } from "@/features/images/components/image-grid";
import { type ImageFile } from "@/features/images/components/results-images";

// Mock Framer Motion to bypass animation logic and render children directly for testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: React.ComponentProps<"div">) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the ImageCard child component to isolate the grid logic from card implementation details.
vi.mock("@/features/images/components/image-card", () => ({
  ImageCard: ({ imageFile, onClick }: { imageFile: ImageFile; onClick: () => void }) => (
    <div data-testid="image-card" data-id={imageFile.id} onClick={() => onClick && onClick()}>
      {imageFile.name}
    </div>
  ),
}));

// Define mock image data to be used across test cases.
const mockImages = [
  {
    id: "img-1",
    name: "image-1.jpg",
    url: "http://test.com/1.jpg",
    dateUploaded: new Date(),
    type: "image/jpeg",
    size: 1000,
    userId: "user-1",
    key: "key-1",
  },
  {
    id: "img-2",
    name: "image-2.jpg",
    url: "http://test.com/2.jpg",
    dateUploaded: new Date(),
    type: "image/jpeg",
    size: 2000,
    userId: "user-1",
    key: "key-2",
  },
] as unknown as ImageFile[];

// Define default props including spy functions for event handlers.
const defaultProps = {
  images: mockImages,
  sortOption: "date-desc",
  isDeleting: false,
  onImageClick: vi.fn(),
  onDelete: vi.fn(),
  onRename: vi.fn(),
  onView: vi.fn(),
  onEdit: vi.fn(),
  onExport: vi.fn(),
};

/**
 * Test suite for the `ImageGrid` component covering rendering behavior and layout structure.
 */
describe("ImageGrid", () => {
  /**
   * Test case to verify that the grid renders a card for each image provided in the props.
   */
  it("renders correct number of ImageCards", () => {
    // Arrange: Render the component with the default list of images.
    render(<ImageGrid {...defaultProps} />);

    // Assert: Verify that the correct number of mocked card elements are present in the DOM.
    const cards = screen.getAllByTestId("image-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("image-1.jpg");
    expect(cards[1]).toHaveTextContent("image-2.jpg");
  });

  /**
   * Test case to verify that the grid renders nothing when the provided images array is empty.
   */
  it("renders empty when images array is empty", () => {
    // Arrange: Render the component with an empty images array.
    render(<ImageGrid {...defaultProps} images={[]} />);

    // Assert: Verify that no card elements are found in the DOM.
    const cards = screen.queryAllByTestId("image-card");
    expect(cards).toHaveLength(0);
  });

  /**
   * Test case to verify that the component successfully passes necessary data to child components.
   */
  it("passes props down to child components", () => {
    // Arrange: Render the component with default props.
    render(<ImageGrid {...defaultProps} />);

    // Assert: Check that the first card exists, implying successful prop passing and rendering.
    const firstCard = screen.getAllByTestId("image-card")[0];
    expect(firstCard).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component applies the correct CSS classes for the responsive grid layout.
   */
  it("renders within a responsive grid layout", () => {
    // Arrange: Render the component with default props.
    render(<ImageGrid {...defaultProps} />);

    // Assert: Select the container and verify it has the expected Tailwind CSS grid classes.
    const container = screen.getByTestId("motion-div").querySelector(".grid");

    expect(container).toHaveClass("grid");
    expect(container).toHaveClass("grid-flow-col");
    expect(container?.className).toContain("auto-cols-[calc(50%-6px)]");
  });
});
