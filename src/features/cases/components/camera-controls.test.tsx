import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { CameraControls } from "@/features/cases/components/camera-controls";

// Arrange: Define a standard set of props used across all test cases.
const defaultProps = {
  onAspectRatioChange: vi.fn(),
  onRotateCamera: vi.fn(),
  onCapture: vi.fn(),
  onMirrorCamera: vi.fn(),
  onDeviceFlip: vi.fn(),
  cameraError: null,
  isMaxFilesReached: false,
  isCapturing: false,
  aspectRatio: { name: "Square", value: 1 },
  rotation: 0,
  filesCount: 0,
  isMirrored: false,
  facingMode: "user" as const,
  isMobile: false,
};

/**
 * Test suite for the `CameraControls` component.
 */
describe("CameraControls", () => {
  /**
   * Test case to ensure all interactive control buttons are rendered in the document.
   */
  it("renders all control buttons correctly", () => {
    // Arrange/Act: Render the component with default props.
    render(<CameraControls {...defaultProps} />);

    // Assert: Verify the presence of each control button by its accessible label.
    expect(screen.getByLabelText("Change aspect ratio")).toBeInTheDocument();
    expect(screen.getByLabelText("Rotate camera")).toBeInTheDocument();
    expect(screen.getByLabelText("Take picture")).toBeInTheDocument();
    expect(screen.getByLabelText("Flip horizontally")).toBeInTheDocument();
    expect(screen.getByLabelText("Flip camera")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking each button executes its corresponding callback function.
   */
  it("calls the appropriate callbacks when buttons are clicked", async () => {
    // Arrange: Initialize user event simulation.
    const user = userEvent.setup();
    // Arrange/Act: Render the component.
    render(<CameraControls {...defaultProps} />);

    // Act: Click the aspect ratio button.
    await user.click(screen.getByLabelText("Change aspect ratio"));
    // Assert: Verify the `onAspectRatioChange` prop function was called once.
    expect(defaultProps.onAspectRatioChange).toHaveBeenCalledTimes(1);

    // Act: Click the rotation button.
    await user.click(screen.getByLabelText("Rotate camera"));
    // Assert: Verify the `onRotateCamera` prop function was called once.
    expect(defaultProps.onRotateCamera).toHaveBeenCalledTimes(1);

    // Act: Click the capture button.
    await user.click(screen.getByLabelText("Take picture"));
    // Assert: Verify the `onCapture` prop function was called once.
    expect(defaultProps.onCapture).toHaveBeenCalledTimes(1);

    // Act: Click the mirror button.
    await user.click(screen.getByLabelText("Flip horizontally"));
    // Assert: Verify the `onMirrorCamera` prop function was called once.
    expect(defaultProps.onMirrorCamera).toHaveBeenCalledTimes(1);

    // Act: Click the device flip button.
    await user.click(screen.getByLabelText("Flip camera"));
    // Assert: Verify the `onDeviceFlip` prop function was called once.
    expect(defaultProps.onDeviceFlip).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to ensure all control buttons are disabled when a `cameraError` is present.
   */
  it("disables all buttons when there is a camera error", () => {
    // Arrange/Act: Render the component with a defined `cameraError`.
    render(<CameraControls {...defaultProps} cameraError="Permission denied" />);

    // Assert: Verify that every control button is disabled.
    expect(screen.getByLabelText("Change aspect ratio")).toBeDisabled();
    expect(screen.getByLabelText("Rotate camera")).toBeDisabled();
    expect(screen.getByLabelText("Take picture")).toBeDisabled();
    expect(screen.getByLabelText("Flip horizontally")).toBeDisabled();
    expect(screen.getByLabelText("Flip camera")).toBeDisabled();
  });

  /**
   * Test case to ensure only the capture button is disabled when the maximum file limit has been reached.
   */
  it("disables only the capture button when max files are reached", () => {
    // Arrange/Act: Render the component with `isMaxFilesReached` set to true.
    render(<CameraControls {...defaultProps} isMaxFilesReached={true} />);

    // Assert: Verify the capture button is disabled.
    expect(screen.getByLabelText("Take picture")).toBeDisabled();
    // Assert: Verify that another button, like the aspect ratio button, is not disabled.
    expect(screen.getByLabelText("Change aspect ratio")).not.toBeDisabled();
  });

  /**
   * Test case to ensure only the capture button is disabled while a picture is currently being taken.
   */
  it("disables only the capture button when currently capturing", () => {
    // Arrange/Act: Render the component with `isCapturing` set to true.
    render(<CameraControls {...defaultProps} isCapturing={true} />);

    // Assert: Verify the capture button is disabled.
    expect(screen.getByLabelText("Take picture")).toBeDisabled();
    // Assert: Verify that another button, like the rotation button, is not disabled.
    expect(screen.getByLabelText("Rotate camera")).not.toBeDisabled();
  });

  /**
   * Test case to verify that specific mobile-related CSS classes are applied when `isMobile` is true.
   */
  it("applies mobile-specific styles when isMobile is true", () => {
    // Arrange/Act: Render the component with `isMobile` set to true.
    const { container } = render(<CameraControls {...defaultProps} isMobile={true} />);

    // Assert: Check the class names on the root element to ensure mobile positioning styles are present.
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("absolute bottom-0 left-0 z-10 w-full");
  });

  /**
   * Test case to verify the tooltip text for the device flip button when the camera is set to "user" (front).
   */
  it("displays the correct tooltip text for front camera", async () => {
    // Arrange: Initialize user event simulation.
    const user = userEvent.setup();
    // Arrange/Act: Render the component with `facingMode` set to "user".
    render(<CameraControls {...defaultProps} facingMode="user" />);

    // Act: Find the device flip button.
    const flipButton = screen.getByLabelText("Flip camera");

    // Act: Simulate hovering over and focusing the button to reveal the tooltip.
    await user.hover(flipButton);
    fireEvent.focus(flipButton);

    // Assert: Find all elements containing the expected tooltip text "Switch to Back Camera".
    const tooltips = await screen.findAllByText("Switch to Back Camera");
    expect(tooltips.length).toBeGreaterThan(0);
    expect(tooltips[0]).toBeInTheDocument();
  });

  /**
   * Test case to verify the tooltip text for the device flip button when the camera is set to "environment" (back).
   */
  it("displays the correct tooltip text for back camera", async () => {
    // Arrange: Initialize user event simulation.
    const user = userEvent.setup();
    // Arrange/Act: Render the component with `facingMode` set to "environment".
    render(<CameraControls {...defaultProps} facingMode="environment" />);

    // Act: Find the device flip button.
    const flipButton = screen.getByLabelText("Flip camera");

    // Act: Simulate hovering over and focusing the button to reveal the tooltip.
    await user.hover(flipButton);
    fireEvent.focus(flipButton);

    // Assert: Find all elements containing the expected tooltip text "Switch to Front Camera".
    const tooltips = await screen.findAllByText("Switch to Front Camera");
    expect(tooltips.length).toBeGreaterThan(0);
    expect(tooltips[0]).toBeInTheDocument();
  });

  /**
   * Test case to verify that the aspect ratio button's tooltip content is dynamically updated based on the current ratio prop.
   */
  it("updates the aspect ratio tooltip content", async () => {
    // Arrange: Initialize user event simulation.
    const user = userEvent.setup();
    // Arrange/Act: Render the component with the aspect ratio name set to "Landscape".
    render(<CameraControls {...defaultProps} aspectRatio={{ name: "Landscape", value: 1.77 }} />);

    // Act: Find the aspect ratio button.
    const ratioButton = screen.getByLabelText("Change aspect ratio");

    // Act: Simulate hovering over and focusing the button to reveal the tooltip.
    await user.hover(ratioButton);
    fireEvent.focus(ratioButton);

    // Assert: Find all elements containing the expected tooltip text "Aspect Ratio: Landscape".
    const tooltips = await screen.findAllByText("Aspect Ratio: Landscape");
    expect(tooltips.length).toBeGreaterThan(0);
    expect(tooltips[0]).toBeInTheDocument();
  });
});
