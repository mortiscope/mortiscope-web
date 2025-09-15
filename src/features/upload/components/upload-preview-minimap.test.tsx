import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { UploadPreviewMinimap } from "@/features/upload/components/upload-preview-minimap";

// Mock the Next.js Image component to replace it with a standard HTML img tag for testing.
vi.mock("next/image", () => ({
  default: ({ src, alt, style, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", {
      src,
      alt,
      style,
      "data-testid": "minimap-image",
      ...props,
    }),
}));

/**
 * Test suite for the `UploadPreviewMinimap` component.
 */
describe("UploadPreviewMinimap", () => {
  // Arrange: Define a set of default props for reuse across test cases.
  const defaultProps = {
    previewUrl: "http://example.com/image.jpg",
    rotation: 0,
    alt: "Test Image",
    transformState: {
      scale: 1,
      positionX: 0,
      positionY: 0,
      previousScale: 1,
      previousPositionX: 0,
      previousPositionY: 0,
    },
    viewingBox: {
      content: { width: 1000, height: 1000 },
      wrapper: { width: 500, height: 500 },
    },
  };

  /**
   * Test case to verify that the component returns null when necessary viewing box dimensions are undefined.
   */
  it("returns null if viewingBox dimensions are missing", () => {
    // Act: Render the component with missing content and wrapper dimensions in `viewingBox`.
    const { container } = render(
      <UploadPreviewMinimap
        {...defaultProps}
        viewingBox={{ content: undefined, wrapper: undefined }}
      />
    );

    // Assert: Check that the rendered container is empty, indicating the component rendered null.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that the minimap image is rendered with the specified rotation applied.
   */
  it("renders the minimap image with correct rotation", () => {
    // Arrange: Render the component with a specific `rotation` prop value of 90 degrees.
    render(<UploadPreviewMinimap {...defaultProps} rotation={90} />);

    // Assert: Check for the presence of the mock image element.
    const image = screen.getByTestId("minimap-image");
    expect(image).toBeInTheDocument();
    // Assert: Verify the `src` attribute is correctly passed from `defaultProps.previewUrl`.
    expect(image).toHaveAttribute("src", defaultProps.previewUrl);
    // Assert: Verify the `alt` attribute is correctly passed from `defaultProps.alt`.
    expect(image).toHaveAttribute("alt", defaultProps.alt);
    // Assert: Verify the CSS transform style includes the 90 degree rotation.
    expect(image).toHaveStyle({ transform: "rotate(90deg)" });
  });

  /**
   * Test case to verify that the viewport overlay is not rendered when the scale is 1.
   */
  it("does not render viewport overlay when scale is 1 (not zoomed)", () => {
    // Arrange: Render the component with the default `transformState` where `scale` is 1.
    render(<UploadPreviewMinimap {...defaultProps} />);

    // Act: Retrieve the parent container of the minimap image.
    const container = screen.getByTestId("minimap-image").parentElement;

    // Assert: Check that the container has only one child element, meaning no overlay is present.
    expect(container?.childElementCount).toBe(1);
  });

  /**
   * Test case to verify that the viewport overlay is rendered and its dimensions/position are calculated correctly when the image is zoomed and panned.
   */
  it("renders and calculates viewport overlay correctly when zoomed in", () => {
    // Arrange: Render the component with `transformState` simulating a 2x zoom and a pan.
    render(
      <UploadPreviewMinimap
        {...defaultProps}
        transformState={{
          ...defaultProps.transformState,
          scale: 2,
          positionX: -500,
          positionY: -500,
        }}
      />
    );

    // Act: Retrieve the parent container and check its children.
    const container = screen.getByTestId("minimap-image").parentElement;

    // Assert: Check that the container has two children (image + overlay).
    expect(container?.childElementCount).toBe(2);

    // Act: Select the second child, which is expected to be the overlay.
    const overlay = container?.children[1] as HTMLElement;

    // Assert: Verify the overlay element is present in the document.
    expect(overlay).toBeInTheDocument();
    // Assert: Verify the calculated width of the viewport on the minimap.
    expect(overlay.style.width).toBe("25%");
    // Assert: Verify the calculated height of the viewport on the minimap.
    expect(overlay.style.height).toBe("25%");
    // Assert: Verify the calculated left position of the viewport on the minimap.
    expect(overlay.style.left).toBe("25%");
    // Assert: Verify the calculated top position of the viewport on the minimap.
    expect(overlay.style.top).toBe("25%");
  });
});
