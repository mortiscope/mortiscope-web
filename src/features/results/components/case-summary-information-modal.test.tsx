import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CaseSummaryInformationModal } from "@/features/results/components/case-summary-information-modal";

// Mock the framer-motion library to bypass animation logic and prevent execution of motion-related side effects.
vi.mock("framer-motion", () => ({
  motion: {
    div: vi.fn(({ children }) => <div>{children}</div>),
  },
}));

// Mock the Dialog components to control visibility and simplify the DOM structure for testing.
vi.mock("@/components/ui/dialog", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/ui/dialog")>();
  return {
    ...original,
    Dialog: vi.fn(({ open, children }) => (
      <div data-testid="mock-dialog">{open ? children : null}</div>
    )),
    DialogContent: vi.fn(({ children }) => <div>{children}</div>),
    DialogHeader: vi.fn(({ children }) => <div>{children}</div>),
    DialogTitle: vi.fn(({ children }) => <h2>{children}</h2>),
    DialogDescription: vi.fn(({ children }) => <p>{children}</p>),
    DialogFooter: vi.fn(({ children }) => <footer>{children}</footer>),
  };
});

// Mock the Button component to provide a standard HTML button for event handling verification.
vi.mock("@/components/ui/button", () => ({
  Button: vi.fn(({ onClick, children, ...props }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  )),
}));

// Mock function to track changes to the modal visibility state.
const mockOnOpenChange = vi.fn();

// Set default props required to render the component in an open state.
const defaultProps = {
  isOpen: true,
  onOpenChange: mockOnOpenChange,
};

/**
 * Test suite for the `CaseSummaryInformationModal` component.
 */
describe("CaseSummaryInformationModal", () => {
  // Reset all mock call history before each test to maintain isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the modal content is rendered in the DOM when the `isOpen` prop is true.
   */
  it("renders the modal content when open", () => {
    // Arrange: Render the modal with the `isOpen` prop set to true.
    render(<CaseSummaryInformationModal {...defaultProps} />);

    // Assert: Verify the existence of the main title, description, and action button.
    expect(screen.getByRole("heading", { name: /Case Summary Information/i })).toBeInTheDocument();
    expect(
      screen.getByText(/A guide to interpreting the analytical visualizations/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Got It/i })).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal content is not present in the DOM when `isOpen` is false.
   */
  it("does not render content when closed", () => {
    // Arrange: Render the modal with the `isOpen` prop set to false.
    render(<CaseSummaryInformationModal {...defaultProps} isOpen={false} />);

    // Assert: Confirm that the modal title is not rendered in the document.
    expect(
      screen.queryByRole("heading", { name: /Case Summary Information/i })
    ).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the close callback is triggered when the user acknowledges the information.
   */
  it("calls onOpenChange(false) when the 'Got It' button is clicked", () => {
    // Arrange: Render the modal.
    render(<CaseSummaryInformationModal {...defaultProps} />);
    const gotItButton = screen.getByRole("button", { name: /Got It/i });

    // Act: Simulate a click on the confirmation button.
    fireEvent.click(gotItButton);

    // Assert: Verify that the `onOpenChange` handler was called with false to request closing.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that all educational items regarding chart types are displayed.
   */
  it("displays all Chart Types information items", () => {
    // Arrange: Render the modal.
    render(<CaseSummaryInformationModal {...defaultProps} />);

    // Assert: Check for the category heading.
    expect(screen.getByRole("heading", { name: /Chart Types/i })).toBeInTheDocument();

    // Assert: Check for specific chart type labels and their respective descriptions.
    expect(screen.getByText("Bar Chart")).toBeInTheDocument();
    expect(
      screen.getByText(/A bar chart represents data with rectangular bars/i)
    ).toBeInTheDocument();

    expect(screen.getByText("Line Chart")).toBeInTheDocument();
    expect(
      screen.getByText(/A line chart connects data points with a continuous line/i)
    ).toBeInTheDocument();

    expect(screen.getByText("Composed Chart")).toBeInTheDocument();
    expect(screen.getByText(/A composed chart combines a bar and line chart/i)).toBeInTheDocument();

    expect(screen.getByText("Pie Chart")).toBeInTheDocument();
    expect(
      screen.getByText(/A pie chart displays data as slices of a circle/i)
    ).toBeInTheDocument();

    expect(screen.getByText("Radar Chart")).toBeInTheDocument();
    expect(screen.getByText(/A radar chart plots data on a circular grid/i)).toBeInTheDocument();
  });

  /**
   * Test case to verify that all educational items regarding data sources are displayed.
   */
  it("displays all Data Sources information items", () => {
    // Arrange: Render the modal.
    render(<CaseSummaryInformationModal {...defaultProps} />);

    // Assert: Check for the data sources category heading.
    expect(screen.getByRole("heading", { name: /Data Sources/i })).toBeInTheDocument();

    // Assert: Check for specific data source descriptions.
    expect(screen.getByText("Overall")).toBeInTheDocument();
    expect(screen.getByText(/This view aggregates counts from every image/i)).toBeInTheDocument();

    expect(screen.getByText("Maximum Stages")).toBeInTheDocument();
    expect(
      screen.getByText(/For each life stage, this view identifies the single image/i)
    ).toBeInTheDocument();

    expect(screen.getByText("Individual Images")).toBeInTheDocument();
    expect(
      screen.getByText(/This option filters the chart to show the life stage distribution/i)
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking on static informational items does not trigger the close callback.
   */
  it("InformationItem click does NOT call onOpenChange", () => {
    // Arrange: Render the modal and locate a list item representing a chart type.
    render(<CaseSummaryInformationModal {...defaultProps} />);
    const barChartItem = screen.getByText("Bar Chart").closest("li");

    // Assert: Check that the item has the correct cursor style for a clickable element.
    expect(barChartItem).toHaveClass("cursor-pointer");

    // Act: Click the informational list item.
    fireEvent.click(barChartItem!);

    // Assert: Confirm that the modal close logic was not triggered by this interaction.
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });
});
