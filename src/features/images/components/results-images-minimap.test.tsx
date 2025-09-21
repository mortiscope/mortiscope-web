import React from "react";
import { type ReactZoomPanPinchState } from "react-zoom-pan-pinch";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ResultsImagesMinimap } from "@/features/images/components/results-images-minimap";

interface MockImageProps {
  src: string;
  alt: string;
  className?: string;
}

// Mock Next.js Image component to simplify DOM structure and verify attribute passing.
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: MockImageProps) =>
    React.createElement("img", {
      src,
      alt,
      className,
      "data-testid": "minimap-image",
    }),
}));

const mockUrl = "https://example.com/image.jpg";
const mockAlt = "Test Image";

// Define viewport dimensions where the content is twice the size of the wrapper.
const mockViewingBox = {
  content: { width: 1000, height: 1000 },
  wrapper: { width: 500, height: 500 },
};

// Define initial state where the image is at 100% scale (no zoom).
const mockStateInitial = {
  scale: 1,
  positionX: 0,
  positionY: 0,
  previousScale: 1,
} as unknown as ReactZoomPanPinchState;

// Define zoomed state where the image is at 200% scale and panned.
const mockStateZoomed = {
  scale: 2,
  positionX: -500,
  positionY: -500,
  previousScale: 1,
} as unknown as ReactZoomPanPinchState;

/**
 * Test suite for the `ResultsImagesMinimap` component covering rendering logic and overlay positioning calculations.
 */
describe("ResultsImagesMinimap", () => {
  /**
   * Test case to verify that the component returns null when `viewingBox` data is incomplete.
   */
  it("renders null if content or wrapper dimensions are missing", () => {
    // Arrange: Render the component with an empty viewing box object.
    const { container } = render(
      <ResultsImagesMinimap
        previewUrl={mockUrl}
        alt={mockAlt}
        transformState={mockStateInitial}
        viewingBox={{}}
      />
    );

    // Assert: Check that the container is empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that the minimap image is rendered with the correct source and alt text.
   */
  it("renders the minimap image correctly", () => {
    // Arrange: Render the component with valid props.
    render(
      <ResultsImagesMinimap
        previewUrl={mockUrl}
        alt={mockAlt}
        transformState={mockStateInitial}
        viewingBox={mockViewingBox}
      />
    );

    // Assert: Verify the image presence and attributes.
    const img = screen.getByTestId("minimap-image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", mockUrl);
    expect(img).toHaveAttribute("alt", mockAlt);
  });

  /**
   * Test case to verify that the viewport overlay indicator is hidden when the image is not zoomed.
   */
  it("hides the viewport overlay when scale is 1 (not zoomed)", () => {
    // Arrange: Render the component with initial scale state.
    const { container } = render(
      <ResultsImagesMinimap
        previewUrl={mockUrl}
        alt={mockAlt}
        transformState={mockStateInitial}
        viewingBox={mockViewingBox}
      />
    );

    // Assert: Check that only the image exists (no overlay div).
    const wrapper = container.firstChild;
    expect(wrapper?.childNodes.length).toBe(1);
  });

  /**
   * Test case to verify that the viewport overlay is displayed and correctly positioned when zoomed.
   */
  it("shows and positions viewport overlay correctly when zoomed", () => {
    // Arrange: Render the component with zoomed state.
    const { container } = render(
      <ResultsImagesMinimap
        previewUrl={mockUrl}
        alt={mockAlt}
        transformState={mockStateZoomed}
        viewingBox={mockViewingBox}
      />
    );

    // Assert: Check that the overlay div is present.
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.childNodes.length).toBe(2);

    // Assert: Verify calculated styles based on zoom level and position.
    // Logic: Wrapper(500) / (Content(1000) * Scale(2)) = 25%.
    // Pos: -(-500) / (1000 * 2) = 25%.
    const overlay = wrapper.childNodes[1] as HTMLElement;

    expect(overlay.style.width).toBe("25%");
    expect(overlay.style.height).toBe("25%");
    expect(overlay.style.left).toBe("25%");
    expect(overlay.style.top).toBe("25%");
  });

  /**
   * Test case to verify that the overlay position adapts correctly to non-square aspect ratios.
   */
  it("positions viewport correctly for different aspect ratios", () => {
    // Arrange: Define a wide viewing box configuration.
    const wideBox = {
      content: { width: 2000, height: 1000 },
      wrapper: { width: 500, height: 500 },
    };

    const state = {
      scale: 2,
      positionX: 0,
      positionY: 0,
    } as unknown as ReactZoomPanPinchState;

    // Act: Render the component with the wide configuration.
    const { container } = render(
      <ResultsImagesMinimap
        previewUrl={mockUrl}
        alt={mockAlt}
        transformState={state}
        viewingBox={wideBox}
      />
    );

    const overlay = (container.firstChild as HTMLElement).childNodes[1] as HTMLElement;

    // Assert: Width should be 500 / (2000 * 2) = 12.5%.
    expect(overlay.style.width).toBe("12.5%");

    // Assert: Height should be 500 / (1000 * 2) = 25%.
    expect(overlay.style.height).toBe("25%");

    // Assert: Left position should be 0 based on positionX 0.
    expect(overlay.style.left).toBe("0%");
  });
});
