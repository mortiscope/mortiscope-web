import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { VerificationStatusToolbar } from "@/features/dashboard/components/verification-status-toolbar";

interface MockToolbarProps {
  selectedView: string;
  onViewSelect: (view: string) => void;
  onInfoClick: () => void;
  viewOptions: { label: string; value: string }[];
}

// Mock the generic `DashboardWidgetToolbar` to isolate the `VerificationStatusToolbar` logic and verify specific configurations.
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
      <button onClick={() => onViewSelect("image")} data-testid="btn-select">
        Select View
      </button>
      <button onClick={onInfoClick} data-testid="btn-info">
        Info
      </button>
    </div>
  ),
}));

/**
 * Test suite for the `VerificationStatusToolbar` component.
 */
describe("VerificationStatusToolbar", () => {
  // Mock functions to track event emissions for view selection and information clicks.
  const mockOnViewSelect = vi.fn();
  const mockOnInfoClick = vi.fn();

  /**
   * Test case to verify the initial render and propagation of the selectedView prop.
   */
  it("renders the DashboardWidgetToolbar with correct initial props", () => {
    // Arrange: Render the toolbar with the `case` view selected.
    render(
      <VerificationStatusToolbar
        selectedView="case"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Assert: Verify the mock toolbar container is present and correctly identifies the `selectedView`.
    expect(screen.getByTestId("mock-widget-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("selected-view")).toHaveTextContent("case");
  });

  /**
   * Test case to verify that the predefined verification view options are passed correctly to the base toolbar.
   */
  it("passes the correct view options configuration to the toolbar", () => {
    // Arrange: Render the component to inspect the injected `viewOptions`.
    render(
      <VerificationStatusToolbar
        selectedView="case"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Assert: Check that the options count and the primary label match the expected verification status settings.
    expect(screen.getByTestId("options-count")).toHaveTextContent("3");
    expect(screen.getByTestId("option-label-0")).toHaveTextContent("Case Verification Status");
  });

  /**
   * Test case to ensure that selecting a different view option triggers the corresponding callback.
   */
  it("triggers onViewSelect callback when a view option is selected", () => {
    // Arrange: Render the component for interaction.
    render(
      <VerificationStatusToolbar
        selectedView="case"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Act: Simulate a user selecting the `image` view from the toolbar.
    fireEvent.click(screen.getByTestId("btn-select"));

    // Assert: Verify the `onViewSelect` callback was invoked with the correct `image` identifier.
    expect(mockOnViewSelect).toHaveBeenCalledWith("image");
  });

  /**
   * Test case to ensure that clicking the information button triggers the info click callback.
   */
  it("triggers onInfoClick callback when info button is clicked", () => {
    // Arrange: Render the component for interaction.
    render(
      <VerificationStatusToolbar
        selectedView="case"
        onViewSelect={mockOnViewSelect}
        onInfoClick={mockOnInfoClick}
      />
    );

    // Act: Simulate a user clicking the information modal trigger.
    fireEvent.click(screen.getByTestId("btn-info"));

    // Assert: Verify that the `onInfoClick` mock was called exactly once.
    expect(mockOnInfoClick).toHaveBeenCalledTimes(1);
  });
});
