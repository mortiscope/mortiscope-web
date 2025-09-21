import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/__tests__/setup/test-utils";
import { ResultsThumbnailList } from "@/features/images/components/results-thumbnail-list";
import { type ImageFile } from "@/features/images/hooks/use-results-image-viewer";

// Hoist mock configuration to control rendering behavior dynamically within tests.
const { mockConfig } = vi.hoisted(() => {
  return { mockConfig: { renderChildren: true } };
});

// Mock Framer Motion to bypass animation logic and render children directly.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: React.ComponentProps<"div">) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the `ScrollArea` component to control rendering of children based on the hoisted config.
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{mockConfig.renderChildren ? children : null}</div>
  ),
  ScrollBar: () => <div data-testid="scrollbar" />,
}));

interface ResultsThumbnailProps {
  imageFile: { name: string };
  isActive: boolean;
  onClick: () => void;
  isMobile: boolean;
}

// Mock the child Thumbnail component to isolate list logic from individual thumbnail rendering.
vi.mock("@/features/images/components/results-thumbnail", () => ({
  ResultsThumbnail: ({ imageFile, isActive, onClick, isMobile }: ResultsThumbnailProps) => (
    <button data-testid="thumbnail" data-active={isActive} data-mobile={isMobile} onClick={onClick}>
      {imageFile.name}
    </button>
  ),
}));

const mockImages = [
  { id: "1", name: "image-1.jpg" },
  { id: "2", name: "image-2.jpg" },
  { id: "3", name: "image-3.jpg" },
] as unknown as ImageFile[];

const mockVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/**
 * Test suite for the `ResultsThumbnailList` component covering rendering, interaction, and styling.
 */
describe("ResultsThumbnailList", () => {
  /**
   * Test case to verify that the list renders a thumbnail for every image in the array.
   */
  it("renders the correct number of thumbnails", () => {
    // Arrange: Render the component with a list of mock images.
    render(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[0]}
        isMobile={false}
        variants={mockVariants}
      />
    );

    // Assert: Verify that the correct number of thumbnail elements are present.
    const thumbnails = screen.getAllByTestId("thumbnail");
    expect(thumbnails).toHaveLength(3);
    expect(thumbnails[0]).toHaveTextContent("image-1.jpg");
  });

  /**
   * Test case to verify that the currently selected image is visually marked as active.
   */
  it("marks the correct thumbnail as active", () => {
    // Arrange: Render the component with the second image selected.
    render(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[1]}
        isMobile={false}
        variants={mockVariants}
      />
    );

    // Assert: Check the data attributes on the thumbnails to ensure correct active state.
    const thumbnails = screen.getAllByTestId("thumbnail");
    expect(thumbnails[0]).toHaveAttribute("data-active", "false");
    expect(thumbnails[1]).toHaveAttribute("data-active", "true");
    expect(thumbnails[2]).toHaveAttribute("data-active", "false");
  });

  /**
   * Test case to verify that clicking a thumbnail triggers the selection callback.
   */
  it("calls onSelectImage with correct ID when clicked", () => {
    // Arrange: Mock the selection handler and render the component.
    const handleSelect = vi.fn();
    render(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[0]}
        isMobile={false}
        onSelectImage={handleSelect}
        variants={mockVariants}
      />
    );

    // Act: Click on the third thumbnail.
    const thumbnails = screen.getAllByTestId("thumbnail");
    fireEvent.click(thumbnails[2]);

    // Assert: Verify the handler was called with the ID of the third image.
    expect(handleSelect).toHaveBeenCalledWith("3");
  });

  /**
   * Test case to verify that the component does not crash if the selection callback is missing.
   */
  it("does not throw error when clicked if onSelectImage is undefined", () => {
    // Arrange: Render the component without providing an onSelectImage handler.
    render(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[0]}
        isMobile={false}
        variants={mockVariants}
      />
    );

    // Act: Click a thumbnail to ensure no error is thrown.
    const thumbnails = screen.getAllByTestId("thumbnail");
    fireEvent.click(thumbnails[0]);
  });

  /**
   * Test case to verify that specific CSS classes and props are applied in mobile mode.
   */
  it("applies mobile styling when isMobile is true", () => {
    // Arrange: Render the component with isMobile set to true.
    const { container } = render(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[0]}
        isMobile={true}
        variants={mockVariants}
      />
    );

    // Assert: Check for mobile-specific positioning classes on the wrapper.
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("absolute bottom-[88px]");

    // Assert: Verify the mobile prop is passed down to the thumbnail.
    const thumbnail = screen.getAllByTestId("thumbnail")[0];
    expect(thumbnail).toHaveAttribute("data-mobile", "true");
  });

  /**
   * Test case to verify that standard layout classes are applied in desktop mode.
   */
  it("applies desktop styling when isMobile is false", () => {
    // Arrange: Render the component with isMobile set to false.
    const { container } = render(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[0]}
        isMobile={false}
        variants={mockVariants}
      />
    );

    // Assert: Check for desktop-specific padding classes and absence of absolute positioning.
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("px-6 pt-2");
    expect(wrapper).not.toHaveClass("absolute");
  });

  /**
   * Test case to verify that the scroll position is preserved when the active image changes.
   */
  it("maintains scroll position when active image changes", () => {
    // Arrange: Render the component and capture the scroll container.
    const { rerender } = render(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[0]}
        isMobile={false}
        variants={mockVariants}
      />
    );

    const scrollContainer = screen.getByText("image-1.jpg").parentElement as HTMLElement;

    // Act: Simulate a user scrolling the container.
    fireEvent.scroll(scrollContainer, { target: { scrollLeft: 100 } });

    // Act: Update the component with a new active image.
    rerender(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[2]}
        isMobile={false}
        variants={mockVariants}
      />
    );

    // Assert: Verify the scroll position remains at the manually set value.
    expect(scrollContainer.scrollLeft).toBe(100);
  });

  /**
   * Test case to verify that the component handles scenarios where the scroll container ref is invalid.
   */
  it("handles missing scroll container ref gracefully", () => {
    // Arrange: Disable child rendering in the mock config to simulate missing DOM nodes.
    mockConfig.renderChildren = false;

    const { rerender } = render(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[0]}
        isMobile={false}
        variants={mockVariants}
      />
    );

    // Act: Update props to trigger internal logic that usually accesses the ref.
    rerender(
      <ResultsThumbnailList
        images={mockImages}
        activeImage={mockImages[1]}
        isMobile={false}
        variants={mockVariants}
      />
    );

    // Cleanup: Reset the mock config for other tests.
    mockConfig.renderChildren = true;
  });
});
