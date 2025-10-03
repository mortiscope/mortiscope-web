import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { InProgressStatusModal } from "@/features/annotation/components/in-progress-status-modal";

// Mock the base modal container to verify visibility state and backdrop interaction.
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

// Mock the header component to verify title, description, and color branding.
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

// Mock the footer component to verify action buttons and button styling.
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
 * Test suite for the `InProgressStatusModal` component.
 */
describe("InProgressStatusModal", () => {
  // Define a mock function to track modal visibility changes.
  const mockOnOpenChange = vi.fn();

  /**
   * Test case to verify that the modal and its sub-components render when the open flag is true.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the modal in an open state.
    render(<InProgressStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify that the container attributes and sub-components are present.
    const container = screen.getByTestId("modal-container");
    expect(container).toHaveAttribute("data-is-open", "true");

    expect(screen.getByTestId("modal-header")).toBeInTheDocument();
    expect(screen.getByTestId("modal-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the header receives the specific text and color variant for 'in-progress' status.
   */
  it("passes correct configuration to AnnotationModalHeader", () => {
    // Arrange: Render the modal.
    render(<InProgressStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Check for specific color variants and descriptive text content.
    const header = screen.getByTestId("modal-header");
    expect(header).toHaveAttribute("data-color", "sky");
    expect(screen.getByText("In Progress")).toBeInTheDocument();

    const description = screen.getByTestId("modal-description");
    expect(description).toHaveTextContent("Partial Progress");
    expect(description).toHaveTextContent("Ongoing Review");
    expect(description).toHaveTextContent("Action Required");
  });

  /**
   * Test case to verify that the footer is configured with a single informational button.
   */
  it("passes correct configuration to AnnotationModalFooter", () => {
    // Arrange: Render the modal.
    render(<InProgressStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify footer attributes and the presence of the dismissal button.
    const footer = screen.getByTestId("modal-footer");
    expect(footer).toHaveAttribute("data-variant", "info");
    expect(footer).toHaveAttribute("data-single", "true");
    expect(screen.getByRole("button", { name: "Understood" })).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the confirmation button triggers the close callback.
   */
  it("calls onOpenChange(false) when the footer confirm button is clicked", () => {
    // Arrange: Render the modal.
    render(<InProgressStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Act: Click the 'Understood' button.
    fireEvent.click(screen.getByRole("button", { name: "Understood" }));

    // Assert: Verify that the change handler was called to close the modal.
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that clicking the modal backdrop triggers the close callback.
   */
  it("calls onOpenChange when the container requests close (backdrop click)", () => {
    // Arrange: Render the modal.
    render(<InProgressStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Act: Click the modal container (backdrop).
    fireEvent.click(screen.getByTestId("modal-container"));

    // Assert: Verify that the change handler was called to close the modal.
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the modal content is not rendered when the open flag is false.
   */
  it("renders nothing inside container if isOpen is false (based on mock behavior)", () => {
    // Arrange: Render the modal in a closed state.
    render(<InProgressStatusModal isOpen={false} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify that the container reflects the closed state and hides content.
    const container = screen.getByTestId("modal-container");
    expect(container).toHaveAttribute("data-is-open", "false");
    expect(screen.queryByTestId("modal-header")).not.toBeInTheDocument();
  });
});
