import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { NoDetectionsStatusModal } from "@/features/annotation/components/no-detections-status-modal";

// Mock the core modal container to track visibility and backdrop click interactions.
vi.mock("@/features/annotation/components/annotation-modal-container", () => ({
  AnnotationModalContainer: ({
    children,
    isOpen,
    onOpenChange,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div
      data-testid="modal-container"
      data-is-open={isOpen}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      {isOpen && children}
    </div>
  ),
}));

// Mock the header sub-component to verify the injection of status-specific text and styling.
vi.mock("@/features/annotation/components/annotation-modal-header", () => ({
  AnnotationModalHeader: ({
    title,
    description,
    colorVariant,
  }: {
    title: string;
    description: React.ReactNode;
    colorVariant: string;
  }) => (
    <div data-testid="modal-header" data-color={colorVariant}>
      <h1>{title}</h1>
      <div data-testid="modal-description">{description}</div>
    </div>
  ),
}));

// Mock the footer sub-component to verify button behavior and variants.
vi.mock("@/features/annotation/components/annotation-modal-footer", () => ({
  AnnotationModalFooter: ({
    onConfirm,
    confirmText,
    buttonVariant,
    singleButton,
  }: {
    onConfirm: () => void;
    confirmText: string;
    buttonVariant: string;
    singleButton: boolean;
  }) => (
    <div data-testid="modal-footer" data-variant={buttonVariant} data-single={singleButton}>
      <button onClick={onConfirm}>{confirmText}</button>
    </div>
  ),
}));

/**
 * Test suite for the `NoDetectionsStatusModal` component.
 */
describe("NoDetectionsStatusModal", () => {
  // Define a mock function to observe modal visibility state changes.
  const mockOnOpenChange = vi.fn();

  /**
   * Test case to verify that the modal structure is rendered when the open flag is true.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the modal in the open state.
    render(<NoDetectionsStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Check that the container state and sub-components are present in the DOM.
    const container = screen.getByTestId("modal-container");
    expect(container).toHaveAttribute("data-is-open", "true");
    expect(screen.getByTestId("modal-header")).toBeInTheDocument();
    expect(screen.getByTestId("modal-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the header is configured with the 'rose' color and appropriate warning text.
   */
  it("passes correct configuration to AnnotationModalHeader", () => {
    // Arrange: Render the modal.
    render(<NoDetectionsStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify the color variant and the specific instructional text strings.
    const header = screen.getByTestId("modal-header");
    expect(header).toHaveAttribute("data-color", "rose");
    expect(screen.getByText("No Detections")).toBeInTheDocument();

    const description = screen.getByTestId("modal-description");
    expect(description).toHaveTextContent("Empty Image");
    expect(description).toHaveTextContent("Manual Addition");
    expect(description).toHaveTextContent("No Action Required");
  });

  /**
   * Test case to verify that the footer uses a destructive button variant in a single-button layout.
   */
  it("passes correct configuration to AnnotationModalFooter", () => {
    // Arrange: Render the modal.
    render(<NoDetectionsStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify the styling variants and the text of the confirmation button.
    const footer = screen.getByTestId("modal-footer");
    expect(footer).toHaveAttribute("data-variant", "destructive");
    expect(footer).toHaveAttribute("data-single", "true");
    expect(screen.getByRole("button", { name: "Understood" })).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the footer button triggers the close callback.
   */
  it("calls onOpenChange(false) when the footer confirm button is clicked", () => {
    // Arrange: Render the modal.
    render(<NoDetectionsStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Act: Simulate a user clicking the 'Understood' button.
    fireEvent.click(screen.getByRole("button", { name: "Understood" }));

    // Assert: Verify the state handler was called with a false value.
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that clicking the backdrop triggers the close callback.
   */
  it("calls onOpenChange(false) when the container backdrop is clicked", () => {
    // Arrange: Render the modal.
    render(<NoDetectionsStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Act: Simulate a click on the outer container backdrop.
    fireEvent.click(screen.getByTestId("modal-container"));

    // Assert: Verify the state handler was called with a false value.
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that modal content is suppressed when the open flag is false.
   */
  it("does not render content if isOpen is false", () => {
    // Arrange: Render the modal in a closed state.
    render(<NoDetectionsStatusModal isOpen={false} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify the container state and the absence of internal header elements.
    const container = screen.getByTestId("modal-container");
    expect(container).toHaveAttribute("data-is-open", "false");
    expect(screen.queryByTestId("modal-header")).not.toBeInTheDocument();
  });
});
