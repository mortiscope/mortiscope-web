import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { QualityMetricsToolbar } from "@/features/dashboard/components/quality-metrics-toolbar";

interface MockToolbarProps {
  selectedView: string;
  onViewSelect: (view: string) => void;
  onInfoClick: () => void;
  viewOptions: { label: string; value: string }[];
}

// Mock the generic `DashboardWidgetToolbar` to isolate testing to the QualityMetricsToolbar configuration.
vi.mock("@/features/dashboard/components/dashboard-widget-toolbar", () => ({
  DashboardWidgetToolbar: ({
    selectedView,
    onViewSelect,
    onInfoClick,
    viewOptions,
  }: MockToolbarProps) => (
    <div data-testid="mock-widget-toolbar">
      <span data-testid="selected-view">{selectedView}</span>
      <span data-testid="options-count">{viewOptions.length}</span>
      <span data-testid="option-label-0">{viewOptions[0].label}</span>
      <button onClick={() => onViewSelect("correction")} data-testid="btn-select">
        Select View
      </button>
      <button onClick={onInfoClick} data-testid="btn-info">
        Info
      </button>
    </div>
  ),
}));

/**
 * Test suite for the `QualityMetricsToolbar` component.
 */
describe("QualityMetricsToolbar", () => {
  // Mock functions to monitor callback execution and arguments.
  const mockOnViewSelect = vi.fn();
  const mockOnInfoClick = vi.fn();

  /**
   * Test case to verify that the underlying toolbar component receives the correct initial view state.
   */
  it("renders the DashboardWidgetToolbar with correct initial props", () => {
    // Arrange: Render the toolbar with the `performance` view pre-selected.
    render(
      <QualityMetricsToolbar
        selectedView="performance"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Assert: Verify that the mock toolbar is rendered and displays the correct `selectedView` text.
    expect(screen.getByTestId("mock-widget-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("selected-view")).toHaveTextContent("performance");
  });

  /**
   * Test case to ensure the specific quality metrics view options are correctly passed to the child component.
   */
  it("passes the correct view options configuration to the toolbar", () => {
    // Arrange: Render the component to check its internal prop configuration.
    render(
      <QualityMetricsToolbar
        selectedView="performance"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Assert: Check that the `viewOptions` array length and the first label match the quality metrics requirements.
    expect(screen.getByTestId("options-count")).toHaveTextContent("3");
    expect(screen.getByTestId("option-label-0")).toHaveTextContent("Model Performance by Stage");
  });

  /**
   * Test case to verify that selecting a new metric view triggers the view selection callback.
   */
  it("triggers onViewSelect callback when a view option is selected", () => {
    // Arrange: Render the component for interaction testing.
    render(
      <QualityMetricsToolbar
        selectedView="performance"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Act: Simulate a user clicking the view selection button.
    fireEvent.click(screen.getByTestId("btn-select"));

    // Assert: Confirm that `mockOnViewSelect` was invoked with the expected `correction` view identifier.
    expect(mockOnViewSelect).toHaveBeenCalledWith("correction");
  });

  /**
   * Test case to verify that clicking the info icon triggers the modal opening callback.
   */
  it("triggers onInfoClick callback when info button is clicked", () => {
    // Arrange: Render the component for interaction testing.
    render(
      <QualityMetricsToolbar
        selectedView="performance"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Act: Simulate a user clicking the information button.
    fireEvent.click(screen.getByTestId("btn-info"));

    // Assert: Confirm that the `mockOnInfoClick` function was executed exactly once.
    expect(mockOnInfoClick).toHaveBeenCalledTimes(1);
  });
});
