import { render, screen } from "@testing-library/react";
import React, { CSSProperties } from "react";
import { describe, expect, it, vi } from "vitest";

import { EditorImageMinimap } from "@/features/annotation/components/editor-image-minimap";

// Mock framer-motion to bypass animations and treat motion components as standard layout elements.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      "aria-label": ariaLabel,
    }: {
      children?: React.ReactNode;
      className?: string;
      style?: CSSProperties;
      "aria-label"?: string;
    }) => (
      <div className={className} style={style} aria-label={ariaLabel}>
        {children}
      </div>
    ),
  },
}));

// Mock Next.js image component to allow for standard attribute assertions on the generated img tag.
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) =>
    React.createElement("img", { src, alt, className, "data-testid": "minimap-image" }),
}));

/**
 * Test suite for the `EditorImageMinimap` component.
 */
describe("EditorImageMinimap", () => {
  const defaultProps = {
    imageUrl: "/test-image.jpg",
    alt: "Test Image",
    transformState: { scale: 1, positionX: 0, positionY: 0, previousScale: 1 },
    viewingBox: {
      content: { width: 1000, height: 1000 },
      wrapper: { width: 500, height: 500 },
    },
    hasOpenPanel: false,
  };

  /**
   * Test case to ensure the component remains hidden if essential dimension data is unavailable.
   */
  it("renders nothing if viewingBox dimensions are missing", () => {
    // Arrange: Provide undefined values for the viewingBox dimensions.
    const { container } = render(
      <EditorImageMinimap
        {...defaultProps}
        viewingBox={{ content: undefined, wrapper: undefined }}
      />
    );

    // Assert: Verify that the component does not render any DOM elements.
    expect(container.firstChild).toBeNull();
  });

  /**
   * Test case to verify that the minimap container and source image render when valid props are provided.
   */
  it("renders the container and image when dimensions are present", () => {
    // Arrange: Render the minimap with default props.
    render(<EditorImageMinimap {...defaultProps} />);

    // Assert: Verify the container is accessible and the image maintains the correct source and alt text.
    const container = screen.getByLabelText("Image minimap");
    expect(container).toBeInTheDocument();

    const image = screen.getByTestId("minimap-image");
    expect(image).toHaveAttribute("src", "/test-image.jpg");
    expect(image).toHaveAttribute("alt", "Test Image");
  });

  /**
   * Test case to ensure the viewport highlight is hidden when the main editor is at base zoom or lower.
   */
  it("does not render the viewport overlay when scale is <= 1", () => {
    // Arrange: Set the transform scale to 1.
    render(
      <EditorImageMinimap
        {...defaultProps}
        transformState={{ ...defaultProps.transformState, scale: 1 }}
      />
    );

    // Assert: Verify the absence of the viewport overlay element.
    const container = screen.getByLabelText("Image minimap");
    const overlay = container.querySelector(".absolute.border-2.border-emerald-400");
    expect(overlay).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the viewport highlight appears when the user zooms into the image.
   */
  it("renders the viewport overlay when scale is > 1", () => {
    // Arrange: Set the transform scale to a value greater than 1.
    render(
      <EditorImageMinimap
        {...defaultProps}
        transformState={{ ...defaultProps.transformState, scale: 2 }}
      />
    );

    // Assert: Verify the presence of the emerald-colored border element representing the viewport.
    const container = screen.getByLabelText("Image minimap");
    const overlay = container.querySelector(".absolute.border-2.border-emerald-400");
    expect(overlay).toBeInTheDocument();
  });

  /**
   * Test case to verify that the viewport overlay positioning and size correctly reflect the editor state.
   */
  it("calculates viewport overlay styles correctly", () => {
    // Arrange: Mock a specific zoom and pan state in the editor.
    const props = {
      ...defaultProps,
      transformState: {
        scale: 2,
        positionX: -500,
        positionY: -500,
        previousScale: 1,
      },
    };

    render(<EditorImageMinimap {...props} />);

    // Act: Locate the overlay element.
    const container = screen.getByLabelText("Image minimap");
    const overlay = container.querySelector(".absolute.border-2.border-emerald-400");

    // Assert: Check the calculated percentage-based styles for the viewport box.
    expect(overlay).toHaveStyle({
      width: "25%",
      height: "25%",
      left: "25%",
      top: "25%",
    });
  });

  /**
   * Test case to verify the accuracy of viewport calculations for non-square images.
   */
  it("handles non-uniform aspect ratios correctly", () => {
    // Arrange: Provide dimensions for an image with a 2:1 aspect ratio.
    const props = {
      ...defaultProps,
      viewingBox: {
        content: { width: 2000, height: 1000 },
        wrapper: { width: 1000, height: 500 },
      },
      transformState: {
        scale: 4,
        positionX: -2000,
        positionY: 0,
        previousScale: 1,
      },
    };

    render(<EditorImageMinimap {...props} />);

    // Act: Locate the viewport overlay.
    const container = screen.getByLabelText("Image minimap");
    const overlay = container.querySelector(".absolute.border-2.border-emerald-400");

    // Assert: Verify that dimensions and offsets scale correctly according to the aspect ratio.
    expect(overlay).toHaveStyle({
      width: "12.5%",
      height: "12.5%",
      left: "25%",
      top: "0%",
    });
  });

  /**
   * Test case to verify that the minimap image updates when the primary editor image changes.
   */
  it("updates when imageUrl changes", () => {
    // Arrange: Render the minimap with an initial image URL.
    const { rerender } = render(<EditorImageMinimap {...defaultProps} />);

    const firstImage = screen.getByTestId("minimap-image");
    expect(firstImage).toHaveAttribute("src", "/test-image.jpg");

    // Act: Re-render the component with a new image URL.
    rerender(<EditorImageMinimap {...defaultProps} imageUrl="/new-image.jpg" />);

    // Assert: Ensure the img tag source attribute has been updated.
    const secondImage = screen.getByTestId("minimap-image");
    expect(secondImage).toHaveAttribute("src", "/new-image.jpg");
  });
});
