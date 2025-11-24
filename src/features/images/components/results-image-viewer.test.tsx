import React from "react";
import { type ReactZoomPanPinchState } from "react-zoom-pan-pinch";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ResultsImageViewer } from "@/features/images/components/results-image-viewer";
import { type ImageFile } from "@/features/images/hooks/use-results-image-viewer";

interface MockImageProps {
  src: string;
  alt: string;
  className?: string;
}

// Mock Next.js Image component to simplify DOM structure and test attribute passing.
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: MockImageProps) =>
    React.createElement("img", {
      src,
      alt,
      className,
      "data-testid": "main-image",
    }),
}));

interface MockMotionProps {
  children: React.ReactNode;
  className?: string;
}

// Mock Framer Motion to bypass animation logic during testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: MockMotionProps) => <div className={className}>{children}</div>,
  },
}));

// Mock react-zoom-pan-pinch to isolate the viewer logic from the zooming library.
vi.mock("react-zoom-pan-pinch", () => ({
  TransformComponent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="transform-component">{children}</div>
  ),
}));

// Mock the bounding box overlay to verify conditional rendering without internal logic.
vi.mock("@/features/images/components/results-bounding-box", () => ({
  ResultsBoundingBox: () => <div data-testid="bounding-box-overlay" />,
}));

// Mock the minimap to verify conditional rendering based on device type.
vi.mock("@/features/images/components/results-images-minimap", () => ({
  ResultsImagesMinimap: () => <div data-testid="minimap" />,
}));

// Mock icons to provide stable test IDs.
vi.mock("react-icons/lu", () => ({
  LuLoaderCircle: () => <div data-testid="loading-spinner" />,
}));

const mockActiveImage = {
  id: "img-1",
  name: "test.jpg",
  url: "https://example.com/test.jpg",
  version: 1,
} as unknown as ImageFile;

const mockTransformState = {
  scale: 1,
  positionX: 0,
  positionY: 0,
} as unknown as ReactZoomPanPinchState;

const mockViewingBox = { content: { width: 100, height: 100 } };
const mockVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };

/**
 * Test suite for the `ResultsImageViewer` component covering loading states, image rendering, overlays, and responsive behavior.
 */
describe("ResultsImageViewer", () => {
  /**
   * Test case to verify that the loading spinner is displayed while the image is loading.
   */
  it("renders the loading spinner when isImageLoaded is false", () => {
    // Arrange: Render the component with isImageLoaded set to false.
    render(
      <ResultsImageViewer
        activeImage={mockActiveImage}
        isImageLoaded={false}
        imageContainerRef={React.createRef()}
        imageDimensions={null}
        renderedImageStyle={null}
        isMobile={false}
        transformState={mockTransformState}
        viewingBox={mockViewingBox}
        variants={mockVariants}
      />
    );

    // Assert: Check that the spinner is present and overlays are absent.
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("bounding-box-overlay")).toBeNull();
  });

  /**
   * Test case to verify that the main image renders with the URL directly once loaded.
   */
  it("renders the main image with the URL directly", () => {
    // Arrange: Render the component with isImageLoaded set to true.
    render(
      <ResultsImageViewer
        activeImage={mockActiveImage}
        isImageLoaded={true}
        imageContainerRef={React.createRef()}
        imageDimensions={{ width: 100, height: 100 }}
        renderedImageStyle={{ width: 100, height: 100, top: 0, left: 0 }}
        isMobile={false}
        transformState={mockTransformState}
        viewingBox={mockViewingBox}
        variants={mockVariants}
      />
    );

    // Assert: Verify image attributes and ensure spinner is removed.
    const img = screen.getByTestId("main-image");
    expect(img).toHaveAttribute("src", "https://example.com/test.jpg");
    expect(img).toHaveAttribute("alt", "Preview of test.jpg");
    expect(screen.queryByTestId("loading-spinner")).toBeNull();
  });

  /**
   * Test case to verify that the bounding box overlay renders only when image dimensions are provided.
   */
  it("renders bounding box overlay only when dimensions are available", () => {
    // Arrange: Render the component with valid image dimensions and styles.
    render(
      <ResultsImageViewer
        activeImage={mockActiveImage}
        isImageLoaded={true}
        imageContainerRef={React.createRef()}
        imageDimensions={{ width: 1000, height: 1000 }}
        renderedImageStyle={{ width: 500, height: 500, top: 0, left: 0 }}
        isMobile={false}
        transformState={mockTransformState}
        viewingBox={mockViewingBox}
        variants={mockVariants}
      />
    );

    // Assert: Check for the presence of the bounding box overlay.
    expect(screen.getByTestId("bounding-box-overlay")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the minimap component renders on desktop devices.
   */
  it("renders minimap on desktop when image is loaded", () => {
    // Arrange: Render the component with isMobile set to false.
    render(
      <ResultsImageViewer
        activeImage={mockActiveImage}
        isImageLoaded={true}
        imageContainerRef={React.createRef()}
        imageDimensions={{ width: 100, height: 100 }}
        renderedImageStyle={{ width: 100, height: 100, top: 0, left: 0 }}
        isMobile={false}
        transformState={mockTransformState}
        viewingBox={mockViewingBox}
        variants={mockVariants}
      />
    );

    // Assert: Verify that the minimap is present in the DOM.
    expect(screen.getByTestId("minimap")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the minimap component is hidden on mobile devices.
   */
  it("hides minimap on mobile", () => {
    // Arrange: Render the component with isMobile set to true.
    render(
      <ResultsImageViewer
        activeImage={mockActiveImage}
        isImageLoaded={true}
        imageContainerRef={React.createRef()}
        imageDimensions={{ width: 100, height: 100 }}
        renderedImageStyle={{ width: 100, height: 100, top: 0, left: 0 }}
        isMobile={true}
        transformState={mockTransformState}
        viewingBox={mockViewingBox}
        variants={mockVariants}
      />
    );

    // Assert: Verify that the minimap is not rendered.
    expect(screen.queryByTestId("minimap")).toBeNull();
  });
});
