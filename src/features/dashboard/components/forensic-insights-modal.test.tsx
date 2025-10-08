import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ForensicInsightsModal } from "@/features/dashboard/components/forensic-insights-modal";

// Mock framer-motion to simplify the DOM structure and bypass animation cycles.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

// Mock the Radix UI Dialog primitives to control visibility and verify conditional mounting.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="mock-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
}));

// Mock the reusable modal header to verify correct title and description propagation.
vi.mock("@/features/dashboard/components/dashboard-modal-header", () => ({
  DashboardModalHeader: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="modal-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

// Mock the reusable modal footer to verify the close callback execution.
vi.mock("@/features/dashboard/components/dashboard-modal-footer", () => ({
  DashboardModalFooter: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="modal-footer">
      <button onClick={onClose} data-testid="close-btn">
        Close
      </button>
    </div>
  ),
}));

// Mock the information list item component to verify content categorization.
vi.mock("@/features/dashboard/components/dashboard-information-item", () => ({
  DashboardInformationItem: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="info-item">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  ),
}));

/**
 * Test suite for the ForensicInsightsModal component.
 * This suite verifies that the educational content regarding forensic visualizations
 * is rendered correctly and that the modal lifecycle is managed properly.
 */
describe("ForensicInsightsModal", () => {
  const mockOnOpenChange = vi.fn();

  /**
   * Test case to verify that the modal and its structural children mount when instructed.
   */
  it("renders the modal when isOpen is true", () => {
    // Act: Render the modal in an open state.
    render(<ForensicInsightsModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Check for the presence of the dialog wrapper, header, and footer.
    expect(screen.getByTestId("mock-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("modal-header")).toBeInTheDocument();
    expect(screen.getByTestId("modal-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal remains unmounted when the `isOpen` prop is false.
   */
  it("does not render when isOpen is false", () => {
    // Act: Render the modal in a closed state.
    render(<ForensicInsightsModal isOpen={false} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify that the dialog is absent from the DOM.
    expect(screen.queryByTestId("mock-dialog")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the header displays the correct educational context.
   */
  it("displays the correct header information", () => {
    // Act: Render the open modal.
    render(<ForensicInsightsModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify the static heading and description text.
    expect(screen.getByText("Forensic Insights Information")).toBeInTheDocument();
    expect(
      screen.getByText("A guide to understanding forensic analysis visualizations and metrics.")
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal renders the three primary forensic analysis definitions.
   */
  it("renders all information items", () => {
    // Act: Render the open modal.
    render(<ForensicInsightsModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Assert: Verify the count and titles of the informational items.
    const items = screen.getAllByTestId("info-item");
    expect(items).toHaveLength(3);

    expect(screen.getByText("Life Stage Distribution")).toBeInTheDocument();
    expect(screen.getByText("PMI Distribution")).toBeInTheDocument();
    expect(screen.getByText("Sampling Density")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the footer close button triggers the `onOpenChange` handler with `false`.
   */
  it("calls onOpenChange(false) when close button is clicked", () => {
    // Arrange: Render the open modal.
    render(<ForensicInsightsModal isOpen={true} onOpenChange={mockOnOpenChange} />);

    // Act: Click the close button within the mocked footer.
    fireEvent.click(screen.getByTestId("close-btn"));

    // Assert: Verify that the parent state update function was called correctly.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
