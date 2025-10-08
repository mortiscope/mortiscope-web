import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { type DateRange } from "react-day-picker";
import { describe, expect, it, vi } from "vitest";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";

// Mock the DateRangePicker component to verify prop injection and callback execution.
vi.mock("@/features/dashboard/components/date-range-picker", () => ({
  DateRangePicker: ({
    isLoading,
    onDateChange,
    onReset,
  }: {
    isLoading: boolean;
    onDateChange: (range: DateRange | undefined) => void;
    onReset: () => void;
  }) => (
    <div data-testid="mock-date-range-picker">
      <span data-testid="is-loading">{String(isLoading)}</span>
      <button
        data-testid="btn-date-change"
        onClick={() => onDateChange({ from: new Date("2024-01-01"), to: new Date("2024-01-31") })}
      >
        Change Date
      </button>
      <button data-testid="btn-reset" onClick={onReset}>
        Reset
      </button>
    </div>
  ),
}));

// Mock the TimePeriodFilter component to isolate header logic from filter implementation.
vi.mock("@/features/dashboard/components/time-period-filter", () => ({
  TimePeriodFilter: ({
    selectedPeriod,
    onPeriodChange,
  }: {
    selectedPeriod: string;
    onPeriodChange: (val: string) => void;
  }) => (
    <div data-testid="mock-time-period-filter">
      <span data-testid="selected-period">{selectedPeriod}</span>
      <button data-testid="btn-period-change" onClick={() => onPeriodChange("past-month")}>
        Change Period
      </button>
    </div>
  ),
}));

/**
 * Test suite for the `DashboardHeader` component.
 */
describe("DashboardHeader", () => {
  const mockOnPeriodChange = vi.fn();
  const mockOnDateChange = vi.fn();

  // Define default props to maintain consistency across different test scenarios.
  const defaultProps = {
    firstName: "Sherlock",
    selectedPeriod: "all-time" as const,
    dateRange: undefined,
    onPeriodChange: mockOnPeriodChange,
    onDateChange: mockOnDateChange,
    isLoading: false,
  };

  /**
   * Test case to verify that the header displays a personalized welcome message.
   */
  it("renders the welcome message with the user's first name", () => {
    // Arrange: Render the header with the `firstName` prop.
    render(<DashboardHeader {...defaultProps} />);

    // Assert: Verify the heading text contains the expected name.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome,Sherlock!");
  });

  /**
   * Test case to verify that the `TimePeriodFilter` receives and displays the active period.
   */
  it("renders the TimePeriodFilter with correct props", () => {
    // Arrange: Render the header with a specific `selectedPeriod`.
    render(<DashboardHeader {...defaultProps} selectedPeriod="past-week" />);

    // Assert: Verify the child component reflects the `past-week` state.
    expect(screen.getByTestId("mock-time-period-filter")).toBeInTheDocument();
    expect(screen.getByTestId("selected-period")).toHaveTextContent("past-week");
  });

  /**
   * Test case to verify that the loading state is correctly propagated to the `DateRangePicker`.
   */
  it("renders the DateRangePicker with correct props", () => {
    // Arrange: Render the header in an active loading state.
    render(<DashboardHeader {...defaultProps} isLoading={true} />);

    // Assert: Verify the child picker receives the `isLoading` flag.
    expect(screen.getByTestId("mock-date-range-picker")).toBeInTheDocument();
    expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
  });

  /**
   * Test case to verify that period changes in the filter trigger the parent `onPeriodChange` callback.
   */
  it("calls onPeriodChange when TimePeriodFilter triggers a change", () => {
    // Arrange: Render the header component.
    render(<DashboardHeader {...defaultProps} />);

    // Act: Simulate a user clicking the period change button within the mock filter.
    fireEvent.click(screen.getByTestId("btn-period-change"));

    // Assert: Verify the mock function was called with the new period value.
    expect(mockOnPeriodChange).toHaveBeenCalledWith("past-month");
  });

  /**
   * Test case to verify that date selections in the picker trigger the parent `onDateChange` callback.
   */
  it("calls onDateChange when DateRangePicker triggers a change", () => {
    // Arrange: Render the header component.
    render(<DashboardHeader {...defaultProps} />);

    // Act: Simulate a user selecting a new date range.
    fireEvent.click(screen.getByTestId("btn-date-change"));

    // Assert: Verify the mock function was called with a valid date range object.
    expect(mockOnDateChange).toHaveBeenCalledWith({
      from: expect.any(Date),
      to: expect.any(Date),
    });
  });

  /**
   * Test case to verify that resetting the date range automatically reverts the time period to its default.
   */
  it("calls onPeriodChange with 'all-time' when DateRangePicker triggers onReset", () => {
    // Arrange: Render the header component.
    render(<DashboardHeader {...defaultProps} />);

    // Act: Simulate a user clicking the reset button.
    fireEvent.click(screen.getByTestId("btn-reset"));

    // Assert: Verify that the reset logic triggers a fallback to the `all-time` period.
    expect(mockOnPeriodChange).toHaveBeenCalledWith("all-time");
  });
});
