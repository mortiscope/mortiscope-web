import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ForensicInsightsToolbar } from "@/features/dashboard/components/forensic-insights-toolbar";

interface MockToolbarProps {
  selectedView: string;
  onViewSelect: (view: string) => void;
  onInfoClick: () => void;
  viewOptions: { label: string; value: string }[];
}

// Mock the `DashboardWidgetToolbar` component to isolate the `ForensicInsightsToolbar` logic and verify prop drilling.
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
      <button onClick={() => onViewSelect("pmi")} data-testid="btn-select">
        Select View
      </button>
      <button onClick={onInfoClick} data-testid="btn-info">
        Info
      </button>
    </div>
  ),
}));

/**
 * Test suite for the `ForensicInsightsToolbar` component.
 */
describe("ForensicInsightsToolbar", () => {
  // Mock callback functions to track event emission.
  const mockOnViewSelect = vi.fn();
  const mockOnInfoClick = vi.fn();

  /**
   * Test case to verify that the component renders with the expected initial property values.
   */
  it("renders the DashboardWidgetToolbar with correct initial props", () => {
    // Arrange: Render the toolbar with the `selectedView` set to `life-stage`.
    render(
      <ForensicInsightsToolbar
        selectedView="life-stage"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Assert: Check that the underlying toolbar is present and reflects the `selectedView` prop.
    expect(screen.getByTestId("mock-widget-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("selected-view")).toHaveTextContent("life-stage");
  });

  /**
   * Test case to ensure the hardcoded view options are correctly passed to the child component.
   */
  it("passes the correct view options configuration to the toolbar", () => {
    // Arrange: Render the component to inspect its internal configuration.
    render(
      <ForensicInsightsToolbar
        selectedView="life-stage"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Assert: Verify that the `viewOptions` array contains the expected number of items and the correct labels.
    expect(screen.getByTestId("options-count")).toHaveTextContent("3");
    expect(screen.getByTestId("option-label-0")).toHaveTextContent("Life Stage Distribution");
  });

  /**
   * Test case to confirm that selecting a new view triggers the appropriate callback function.
   */
  it("triggers onViewSelect callback when a view option is selected", () => {
    // Arrange: Render the component for interaction.
    render(
      <ForensicInsightsToolbar
        selectedView="life-stage"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Act: Simulate a user clicking the selection button.
    fireEvent.click(screen.getByTestId("btn-select"));

    // Assert: Verify that the `mockOnViewSelect` function was called with the expected `pmi` value.
    expect(mockOnViewSelect).toHaveBeenCalledWith("pmi");
  });

  /**
   * Test case to confirm that clicking the info button triggers the information callback.
   */
  it("triggers onInfoClick callback when info button is clicked", () => {
    // Arrange: Render the component for interaction.
    render(
      <ForensicInsightsToolbar
        selectedView="life-stage"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Act: Simulate a user clicking the information button.
    fireEvent.click(screen.getByTestId("btn-info"));

    // Assert: Verify that the `mockOnInfoClick` function was executed exactly once.
    expect(mockOnInfoClick).toHaveBeenCalledTimes(1);
  });
});
