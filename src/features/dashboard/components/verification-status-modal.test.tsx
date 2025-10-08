import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { VerificationStatusModal } from "@/features/dashboard/components/verification-status-modal";

// Mock Framer Motion to bypass animation logic and render children directly for immediate DOM availability.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

// Mock the UI Dialog components to control visibility and simplify the DOM structure for unit testing.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="mock-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
}));

// Mock the modal header to verify that title and description props are correctly injected.
vi.mock("@/features/dashboard/components/dashboard-modal-header", () => ({
  DashboardModalHeader: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="modal-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

// Mock the modal footer to provide a testable close button interface.
vi.mock("@/features/dashboard/components/dashboard-modal-footer", () => ({
  DashboardModalFooter: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="modal-footer">
      <button onClick={onClose} data-testid="close-btn">
        Close
      </button>
    </div>
  ),
}));

// Mock information items to verify that verification workflow categories are displayed.
vi.mock("@/features/dashboard/components/dashboard-information-item", () => ({
  DashboardInformationItem: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="info-item">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  ),
}));

/**
 * Test suite for the `VerificationStatusModal` component.
 */
describe("VerificationStatusModal", () => {
  // Mock function to track external state changes for modal visibility.
  const mockOnOpenChange = vi.fn();

  /**
   * Test case to verify that the modal and its structural components appear when the open state is active.
   */
  it("renders the modal when isOpen is true", () => {
    // Arrange: Render the modal with the `isOpen` prop set to `true`.
    render(<VerificationStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify that the dialog container, header, and footer are present.
    expect(screen.getByTestId("mock-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("modal-header")).toBeInTheDocument();
    expect(screen.getByTestId("modal-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal is not present in the DOM when the open state is inactive.
   */
  it("does not render when isOpen is false", () => {
    // Arrange: Render the modal with the `isOpen` prop set to `false`.
    render(<VerificationStatusModal isOpen={false} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify that the mock dialog element is missing from the document.
    expect(screen.queryByTestId("mock-dialog")).not.toBeInTheDocument();
  });

  /**
   * Test case to ensure the specific verification status labels are correctly passed to the header.
   */
  it("displays the correct header information", () => {
    // Arrange: Render the modal in the open state.
    render(<VerificationStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Check for the presence of the specific verification title and guide description.
    expect(screen.getByText("Verification Status Information")).toBeInTheDocument();
    expect(
      screen.getByText("A guide to understanding the verification workflow and progress tracking.")
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component renders the three specific verification hierarchy sections.
   */
  it("renders all information items", () => {
    // Arrange: Render the modal in the open state.
    render(<VerificationStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Confirm three information items exist and check for Case, Image, and Detection titles.
    const items = screen.getAllByTestId("info-item");
    expect(items).toHaveLength(3);

    expect(screen.getByText("Case Verification Status")).toBeInTheDocument();
    expect(screen.getByText("Image Verification Status")).toBeInTheDocument();
    expect(screen.getByText("Detection Verification Status")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the close button triggers the appropriate callback to update parent state.
   */
  it("calls onOpenChange(false) when close button is clicked", () => {
    // Arrange: Render the modal and prepare for interaction.
    render(<VerificationStatusModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Act: Simulate a user clicking the close button.
    fireEvent.click(screen.getByTestId("close-btn"));

    // Assert: Verify that the `mockOnOpenChange` callback was executed with the argument `false`.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
