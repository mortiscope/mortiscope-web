import React, { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { CameraView } from "@/features/cases/components/camera-view";

// Mock the `react-webcam` library to prevent actual camera access during tests.
vi.mock("react-webcam", () => {
  // Arrange: Create a mock functional component that forwards a ref and exposes key props as data attributes.
  const MockWebcam = React.forwardRef<
    HTMLDivElement,
    {
      mirrored?: boolean;
      videoConstraints?: { facingMode?: string };
      style?: React.CSSProperties;
    }
  >((props, ref) => (
    <div
      ref={ref}
      data-testid="mock-webcam"
      data-mirrored={props.mirrored}
      data-facing-mode={props.videoConstraints?.facingMode}
      style={props.style}
    >
      Mock Webcam
    </div>
  ));

  MockWebcam.displayName = "MockWebcam";
  return { default: MockWebcam };
});

// Mock `framer-motion` components to simplify the DOM structure and focus on core logic.
vi.mock("framer-motion", () => ({
  // Arrange: Mock `AnimatePresence` to render its children directly.
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    // Arrange: Mock `motion.div` as a standard div, passing through props and styles.
    div: ({ children, className, style, ...props }: ComponentProps<"div">) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
  },
}));

// Arrange: Define a mock ref object for the `webcamRef` prop.
const mockWebcamRef = { current: null };
// Arrange: Define a standard set of props used across all test cases.
const defaultProps = {
  cameraError: null,
  facingMode: "user" as const,
  aspectRatio: { value: 1.77, className: "aspect-video" },
  isMirrored: false,
  rotation: 0,
  webcamRef: mockWebcamRef,
  onUserMediaError: vi.fn(),
  isMobile: false,
};

/**
 * Test suite for the `CameraView` component.
 */
describe("CameraView", () => {
  /**
   * Test case to ensure the `MockWebcam` component is rendered when no camera error is present.
   */
  it("renders the webcam when there is no error", () => {
    // Arrange/Act: Render the component with default (no error) props.
    render(<CameraView {...defaultProps} />);

    // Assert: Verify the presence of the mock webcam component.
    expect(screen.getByTestId("mock-webcam")).toBeInTheDocument();
    // Assert: Verify that no error message is displayed.
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
  });

  /**
   * Test case to ensure the correct error message is displayed when `cameraError` is provided, and the webcam is suppressed.
   */
  it("renders the error message when cameraError is provided", () => {
    // Arrange: Define a camera error object.
    const error = { title: "Access Denied", description: "Please allow camera access." };
    // Arrange/Act: Render the component with the camera error.
    render(<CameraView {...defaultProps} cameraError={error} />);

    // Assert: Verify that the error title and description are displayed.
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.getByText("Please allow camera access.")).toBeInTheDocument();
    // Assert: Verify that the mock webcam component is not rendered.
    expect(screen.queryByTestId("mock-webcam")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that desktop-specific default styling is applied when `isMobile` is false.
   */
  it("applies desktop styling by default (isMobile=false)", () => {
    // Arrange/Act: Render the component with default desktop settings.
    const { container } = render(<CameraView {...defaultProps} />);

    // Assert: Check the root wrapper's classes for desktop centering and background.
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("mx-auto");
    expect(wrapper).toHaveClass("bg-slate-100");
  });

  /**
   * Test case to verify that mobile-specific styling is applied when `isMobile` is true.
   */
  it("applies mobile styling when isMobile=true", () => {
    // Arrange/Act: Render the component with `isMobile` set to true.
    const { container } = render(<CameraView {...defaultProps} isMobile={true} />);

    // Assert: Check the root wrapper's classes for mobile full-screen size.
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("h-full w-full");
    // Assert: Check that desktop centering class is not applied.
    expect(wrapper).not.toHaveClass("mx-auto");
  });

  /**
   * Test case to ensure key props like `isMirrored`, `facingMode`, and `rotation` are correctly passed and applied to the `Webcam` component.
   */
  it("passes correct props to the Webcam component", () => {
    // Arrange/Act: Render the component with non-default values for webcam props.
    render(
      <CameraView {...defaultProps} isMirrored={true} facingMode="environment" rotation={90} />
    );

    // Assert: Retrieve the mock webcam component.
    const webcam = screen.getByTestId("mock-webcam");

    // Assert: Verify the `mirrored` prop is correctly passed as a data attribute.
    expect(webcam).toHaveAttribute("data-mirrored", "true");

    // Assert: Verify the `facingMode` constraint is correctly passed.
    expect(webcam).toHaveAttribute("data-facing-mode", "environment");

    // Assert: Verify that the `rotation` is applied as a CSS transform style.
    expect(webcam).toHaveStyle({ transform: "rotate(90deg)" });
  });

  /**
   * Test case to verify that error-specific styling is applied to the container when an error is present on desktop.
   */
  it("applies error styling to the container when error exists on desktop", () => {
    // Arrange/Act: Render the component with a `cameraError` and default desktop settings.
    const { container } = render(
      <CameraView
        {...defaultProps}
        cameraError={{ title: "Error", description: "Desc" }}
        isMobile={false}
      />
    );

    // Assert: Check the root wrapper's class list for the error background style.
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("bg-rose-50");
  });
});
