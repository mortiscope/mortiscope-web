import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { QualityMetricsModal } from "@/features/dashboard/components/quality-metrics-modal";

// Mock Framer Motion to bypass animation logic and render children directly for faster testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

// Mock the UI Dialog components to control visibility and simplify the DOM structure for inspection.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="mock-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
}));

// Mock the modal header to verify that title and description strings are passed correctly.
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

// Mock information items to verify the rendering of different metric categories.
vi.mock("@/features/dashboard/components/dashboard-information-item", () => ({
  DashboardInformationItem: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="info-item">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  ),
}));

/**
 * Test suite for the `QualityMetricsModal` component.
 */
describe("QualityMetricsModal", () => {
  // Mock function to track external state changes for the modal visibility.
  const mockOnOpenChange = vi.fn();

  /**
   * Test case to verify that the modal and its core sub-components appear when active.
   */
  it("renders the modal when isOpen is true", () => {
    // Arrange: Render the modal with the `isOpen` prop set to `true`.
    render(<QualityMetricsModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Confirm the main container and structural sub-components are present in the document.
    expect(screen.getByTestId("mock-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("modal-header")).toBeInTheDocument();
    expect(screen.getByTestId("modal-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal remains unrendered when the visibility state is false.
   */
  it("does not render when isOpen is false", () => {
    // Arrange: Render the modal with the `isOpen` prop set to `false`.
    render(<QualityMetricsModal isOpen={false} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify that the dialog container is missing from the DOM.
    expect(screen.queryByTestId("mock-dialog")).not.toBeInTheDocument();
  });

  /**
   * Test case to ensure the static text in the header matches the design requirements.
   */
  it("displays the correct header information", () => {
    // Arrange: Render the modal in the open state.
    render(<QualityMetricsModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Check that the expected title and description text are visible to the user.
    expect(screen.getByText("Quality Metrics Information")).toBeInTheDocument();
    expect(
      screen.getByText("A guide to understanding AI model performance and data quality indicators.")
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that all defined metric sections are rendered within the modal body.
   */
  it("renders all information items", () => {
    // Arrange: Render the modal in the open state.
    render(<QualityMetricsModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Count the information items and verify specific metric titles are present.
    const items = screen.getAllByTestId("info-item");
    expect(items).toHaveLength(3);

    expect(screen.getByText("Model Performance by Stage")).toBeInTheDocument();
    expect(screen.getByText("User Correction Ratio")).toBeInTheDocument();
    expect(screen.getByText("Confidence Score Distribution")).toBeInTheDocument();
  });

  /**
   * Test case to verify that interaction with the close button triggers the appropriate state update.
   */
  it("calls onOpenChange(false) when close button is clicked", () => {
    // Arrange: Render the modal and prepare the interaction handler.
    render(<QualityMetricsModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Act: Simulate a user clicking the close button in the footer.
    fireEvent.click(screen.getByTestId("close-btn"));

    // Assert: Ensure the `onOpenChange` callback was executed with the value `false`.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
