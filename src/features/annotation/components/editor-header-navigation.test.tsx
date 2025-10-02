import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { EditorHeaderNavigation } from "@/features/annotation/components/editor-header-navigation";

/**
 * Test suite for the `EditorHeaderNavigation` component.
 */
describe("EditorHeaderNavigation", () => {
  const defaultProps = {
    onPreviousImage: vi.fn(),
    onNextImage: vi.fn(),
    currentImageIndex: 1,
    currentPosition: 2,
    totalImages: 3,
  };

  /**
   * Test case to verify that the navigation buttons and the current position indicator are rendered.
   */
  it("renders navigation controls and status text", () => {
    // Arrange: Render the navigation component with default props.
    render(<EditorHeaderNavigation {...defaultProps} />);

    // Assert: Verify visibility of previous/next buttons and the "X / Y" progress text.
    expect(screen.getByLabelText("Previous image")).toBeInTheDocument();
    expect(screen.getByLabelText("Next image")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the previous button triggers the expected callback.
   */
  it("calls onPreviousImage when previous button is clicked", () => {
    // Arrange: Render the navigation component.
    render(<EditorHeaderNavigation {...defaultProps} />);

    // Act: Click the previous navigation button.
    fireEvent.click(screen.getByLabelText("Previous image"));

    // Assert: Ensure the `onPreviousImage` callback was executed once.
    expect(defaultProps.onPreviousImage).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that clicking the next button triggers the expected callback.
   */
  it("calls onNextImage when next button is clicked", () => {
    // Arrange: Render the navigation component.
    render(<EditorHeaderNavigation {...defaultProps} />);

    // Act: Click the next navigation button.
    fireEvent.click(screen.getByLabelText("Next image"));

    // Assert: Ensure the `onNextImage` callback was executed once.
    expect(defaultProps.onNextImage).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the previous button is disabled when viewing the first image in the set.
   */
  it("disables previous button on the first image", () => {
    // Arrange: Set `currentImageIndex` to 0 to represent the start of the list.
    render(<EditorHeaderNavigation {...defaultProps} currentImageIndex={0} currentPosition={1} />);

    // Act: Locate the previous button and attempt a click.
    const prevBtn = screen.getByLabelText("Previous image");
    expect(prevBtn).toBeDisabled();
    fireEvent.click(prevBtn);

    // Assert: Verify the callback was not triggered due to the disabled state.
    expect(defaultProps.onPreviousImage).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the next button is disabled when viewing the final image in the set.
   */
  it("disables next button on the last image", () => {
    // Arrange: Set indices and positions to match the end of the `totalImages` count.
    render(
      <EditorHeaderNavigation
        {...defaultProps}
        currentImageIndex={2}
        currentPosition={3}
        totalImages={3}
      />
    );

    // Act: Locate the next button and attempt a click.
    const nextBtn = screen.getByLabelText("Next image");
    expect(nextBtn).toBeDisabled();
    fireEvent.click(nextBtn);

    // Assert: Verify the callback was not triggered.
    expect(defaultProps.onNextImage).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure navigation is restricted when only a single image exists in the dataset.
   */
  it("disables both buttons when there is only one image", () => {
    // Arrange: Set `totalImages` to 1.
    render(
      <EditorHeaderNavigation
        {...defaultProps}
        currentImageIndex={0}
        currentPosition={1}
        totalImages={1}
      />
    );

    // Assert: Verify that both previous and next controls are disabled.
    expect(screen.getByLabelText("Previous image")).toBeDisabled();
    expect(screen.getByLabelText("Next image")).toBeDisabled();
  });

  /**
   * Test case to verify navigation is fully enabled when there are images available in both directions.
   */
  it("enables both buttons when in the middle of the list", () => {
    // Arrange: Render with the default middle position (2 of 3).
    render(<EditorHeaderNavigation {...defaultProps} />);

    // Assert: Verify both buttons are interactive.
    expect(screen.getByLabelText("Previous image")).toBeEnabled();
    expect(screen.getByLabelText("Next image")).toBeEnabled();
  });

  /**
   * Test case to verify that disabled buttons reflect the correct visual state via CSS classes.
   */
  it("applies cursor-not-allowed wrapper class when disabled", () => {
    // Arrange: Set state to the first image.
    render(<EditorHeaderNavigation {...defaultProps} currentImageIndex={0} currentPosition={1} />);

    // Act: Check the wrapper element of the disabled button.
    const prevBtn = screen.getByLabelText("Previous image");

    // Assert: Ensure the parent container applies the `cursor-not-allowed` utility class.
    expect(prevBtn.parentElement).toHaveClass("cursor-not-allowed");
  });
});
