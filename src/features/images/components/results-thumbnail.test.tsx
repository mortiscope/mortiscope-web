import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/__tests__/setup/test-utils";
import { ResultsThumbnail } from "@/features/images/components/results-thumbnail";
import { type ImageFile } from "@/features/images/hooks/use-results-image-viewer";

// Mock Next.js Image component to verify attribute passing without loading actual images.
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const Img = "img";
    return <Img src={src} alt={alt} className={className} data-testid="next-image" />;
  },
}));

// Mock Framer Motion to bypass animation logic during tests.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

const mockImageFile = {
  id: "image-1",
  name: "test-image.jpg",
  url: "https://example.com/image.jpg",
  version: 123,
} as unknown as ImageFile;

/**
 * Test suite for the `ResultsThumbnail` component covering rendering, interaction, and responsive styling.
 */
describe("ResultsThumbnail", () => {
  /**
   * Test case to verify that the thumbnail renders the image with a versioned URL query parameter.
   */
  it("renders the image with versioned URL", () => {
    // Arrange: Render the component with a valid image file.
    render(
      <ResultsThumbnail
        imageFile={mockImageFile}
        onClick={vi.fn()}
        isActive={false}
        isMobile={false}
      />
    );

    // Assert: Check that the image source includes the version and the alt text is correct.
    const img = screen.getByTestId("next-image");
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg?v=123");
    expect(img).toHaveAttribute("alt", "Thumbnail of test-image.jpg");
  });

  /**
   * Test case to verify that a skeleton loader is displayed when the image URL is missing.
   */
  it("renders a skeleton loader if URL is missing", () => {
    // Arrange: Create a mock image file with an empty URL.
    const noUrlImage = { ...mockImageFile, url: "" };

    const { container } = render(
      <ResultsThumbnail
        imageFile={noUrlImage}
        onClick={vi.fn()}
        isActive={false}
        isMobile={false}
      />
    );

    // Assert: Verify the pulse animation class is present and the image element is absent.
    expect(container.firstChild).toHaveClass("animate-pulse");
    expect(screen.queryByTestId("next-image")).toBeNull();
  });

  /**
   * Test case to verify that the mobile skeleton loader applies specific background styling.
   */
  it("renders a mobile skeleton loader (darker) if URL is missing on mobile", () => {
    // Arrange: Render with empty URL and isMobile set to true.
    const noUrlImage = { ...mockImageFile, url: "" };

    const { container } = render(
      <ResultsThumbnail imageFile={noUrlImage} onClick={vi.fn()} isActive={false} isMobile={true} />
    );

    // Assert: Verify mobile-specific background class along with pulse animation.
    expect(container.firstChild).toHaveClass("animate-pulse");
    expect(container.firstChild).toHaveClass("bg-slate-800");
    expect(screen.queryByTestId("next-image")).toBeNull();
  });

  /**
   * Test case to verify that the click handler is triggered when the thumbnail is not active.
   */
  it("calls onClick when clicked (if not active)", () => {
    // Arrange: Mock the click handler and render the component.
    const handleClick = vi.fn();

    render(
      <ResultsThumbnail
        imageFile={mockImageFile}
        onClick={handleClick}
        isActive={false}
        isMobile={false}
      />
    );

    // Act: Simulate a click on the thumbnail button.
    fireEvent.click(screen.getByRole("button"));
    // Assert: Verify the handler was called once.
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the thumbnail button is disabled when the item is already active.
   */
  it("disables the button when active", () => {
    // Arrange: Render the component with isActive set to true.
    const handleClick = vi.fn();

    render(
      <ResultsThumbnail
        imageFile={mockImageFile}
        onClick={handleClick}
        isActive={true}
        isMobile={false}
      />
    );

    // Assert: Check that the button is disabled.
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    // Act: Attempt to click the button.
    fireEvent.click(button);
    // Assert: Verify the handler was NOT called.
    expect(handleClick).not.toHaveBeenCalled();
  });

  /**
   * Nested test suite focusing on conditional styling based on device type and active state.
   */
  describe("Styling States", () => {
    /**
     * Test case to verify active styling on desktop devices.
     */
    it("applies active styles for desktop", () => {
      // Arrange: Render active thumbnail in desktop mode.
      render(
        <ResultsThumbnail
          imageFile={mockImageFile}
          onClick={vi.fn()}
          isActive={true}
          isMobile={false}
        />
      );

      // Assert: Verify desktop-specific ring color class.
      const button = screen.getByRole("button");
      expect(button).toHaveClass("ring-emerald-500");
      expect(button).not.toHaveClass("ring-amber-400");
    });

    /**
     * Test case to verify active styling on mobile devices.
     */
    it("applies active styles for mobile", () => {
      // Arrange: Render active thumbnail in mobile mode.
      render(
        <ResultsThumbnail
          imageFile={mockImageFile}
          onClick={vi.fn()}
          isActive={true}
          isMobile={true}
        />
      );

      // Assert: Verify mobile-specific ring color class.
      const button = screen.getByRole("button");
      expect(button).toHaveClass("ring-amber-400");
    });

    /**
     * Test case to verify inactive styling on mobile devices.
     */
    it("applies inactive styles for mobile", () => {
      // Arrange: Render inactive thumbnail in mobile mode.
      render(
        <ResultsThumbnail
          imageFile={mockImageFile}
          onClick={vi.fn()}
          isActive={false}
          isMobile={true}
        />
      );

      // Assert: Verify the default ring color class for inactive mobile items.
      const button = screen.getByRole("button");
      expect(button).toHaveClass("ring-emerald-500");
    });
  });
});
