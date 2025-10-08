import { fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { type DateRange } from "react-day-picker";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { validateDateRange } from "@/features/dashboard/utils/date-url-sync";

// Mock Next.js navigation hooks to simulate URL state and programmatic routing.
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock utility functions for synchronizing date ranges with URL search parameters.
vi.mock("@/features/dashboard/utils/date-url-sync", () => ({
  buildDateRangeParams: vi.fn(() => new URLSearchParams("start=2025-01-01&end=2025-01-31")),
  validateDateRange: vi.fn(),
}));

// Mock the DashboardHeader component to simplify interaction testing for period and date changes.
vi.mock("@/features/dashboard/components/dashboard-header", () => ({
  DashboardHeader: ({
    firstName,
    onPeriodChange,
    onDateChange,
    selectedPeriod,
  }: {
    firstName: string;
    onPeriodChange: (val: string) => void;
    onDateChange: (range: DateRange | undefined) => void;
    selectedPeriod: string;
  }) => (
    <div data-testid="dashboard-header">
      <span data-testid="header-name">{firstName}</span>
      <span data-testid="header-period">{selectedPeriod}</span>
      <button data-testid="btn-period-all" onClick={() => onPeriodChange("all-time")}>
        All Time
      </button>
      <button data-testid="btn-period-week" onClick={() => onPeriodChange("past-week")}>
        Past Week
      </button>
      <button data-testid="btn-period-month" onClick={() => onPeriodChange("past-month")}>
        Past Month
      </button>
      <button data-testid="btn-period-year" onClick={() => onPeriodChange("past-year")}>
        Past Year
      </button>
      <button data-testid="btn-period-custom-trigger" onClick={() => onPeriodChange("custom")}>
        Custom Period Trigger
      </button>
      <button
        data-testid="btn-date-custom"
        onClick={() => onDateChange({ from: new Date("2025-01-01"), to: new Date("2025-01-31") })}
      >
        Custom Date
      </button>
      <button
        data-testid="btn-date-custom-incomplete"
        onClick={() => onDateChange({ from: new Date("2025-01-01"), to: undefined })}
      >
        Custom Date Incomplete
      </button>
    </div>
  ),
}));

// Mock the Metrics Grid to verify that it receives the correct filtered date range props.
vi.mock("@/features/dashboard/components/dashboard-metrics-grid", () => ({
  DashboardMetricsGrid: ({ dateRange }: { dateRange: DateRange | undefined }) => (
    <div data-testid="metrics-grid">
      <span data-testid="metrics-date-from">{dateRange?.from?.toISOString()}</span>
      <span data-testid="metrics-date-to">{dateRange?.to?.toISOString()}</span>
    </div>
  ),
}));

// Mock the Analysis section to verify prop drilling of the synchronized date range.
vi.mock("@/features/dashboard/components/dashboard-analysis", () => ({
  DashboardAnalysis: ({ dateRange }: { dateRange: DateRange | undefined }) => (
    <div data-testid="dashboard-analysis">
      <span data-testid="analysis-date-from">{dateRange?.from?.toISOString()}</span>
    </div>
  ),
}));

/**
 * Test suite for the `DashboardView` component.
 */
describe("DashboardView", () => {
  const mockRouter = {
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
  const mockSearchParams = { get: vi.fn() };
  const mockPathname = "/dashboard";

  const defaultProps = {
    firstName: "John",
    oldestCaseDate: "2025-01-01T00:00:00.000Z",
    caseData: [],
    initialData: {
      verified: 0,
      totalCases: 0,
      totalImages: 0,
      verifiedImages: 0,
      totalDetectionsCount: 0,
      verifiedDetectionsCount: 0,
      averagePMI: 0,
      averageConfidence: 0,
      correctionRate: 0,
    },
  };

  // Reset mocks and initialize navigation hook return values before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.mocked(usePathname).mockReturnValue(mockPathname);
    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams as unknown as ReturnType<typeof useSearchParams>
    );

    vi.mocked(validateDateRange).mockReturnValue(null);
  });

  /**
   * Test case to verify that all major dashboard layout components are rendered correctly.
   */
  it("renders child components correctly", () => {
    // Arrange: Render the component with default props.
    render(<DashboardView {...defaultProps} />);

    // Assert: Verify that the header, metrics, and analysis sections are present.
    expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
    expect(screen.getByTestId("metrics-grid")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("header-name")).toHaveTextContent("John");
  });

  /**
   * Test case to verify the default filter state when no specific date parameters exist in the URL.
   */
  it("initializes with 'all-time' period when URL params are empty", () => {
    // Act: Render the component without search params.
    render(<DashboardView {...defaultProps} />);

    // Assert: Verify that the filter period defaults to `all-time` and the start date matches the oldest case.
    expect(screen.getByTestId("header-period")).toHaveTextContent("all-time");
    const fromDate = screen.getByTestId("metrics-date-from").textContent;
    expect(fromDate).toBe(new Date(defaultProps.oldestCaseDate).toISOString());
  });

  /**
   * Test case to verify that valid date parameters in the URL correctly trigger a "custom" period state.
   */
  it("initializes with 'custom' period when URL params are valid", () => {
    // Arrange: Mock the validation utility to return a valid range object.
    const validRange = {
      from: new Date("2025-02-01T00:00:00.000Z"),
      to: new Date("2025-02-10T00:00:00.000Z"),
    };
    vi.mocked(validateDateRange).mockReturnValue(validRange);

    // Act: Render the component.
    render(<DashboardView {...defaultProps} />);

    // Assert: Verify the period is set to `custom` and dates are correctly applied to child components.
    expect(screen.getByTestId("header-period")).toHaveTextContent("custom");
    expect(screen.getByTestId("metrics-date-from")).toHaveTextContent(
      validRange.from.toISOString()
    );
  });

  /**
   * Test case to verify that invalid URL parameters are automatically stripped to sanitize the application state.
   */
  it("clears invalid URL params on mount", () => {
    // Arrange: Simulate invalid data in the URL search parameters.
    mockSearchParams.get.mockImplementation((key) => (key === "start" ? "invalid" : null));
    vi.mocked(validateDateRange).mockReturnValue(null);

    // Act: Render the component.
    render(<DashboardView {...defaultProps} />);

    // Assert: Verify that `router.replace` was called to clear the malformed parameters.
    expect(mockRouter.replace).toHaveBeenCalledWith(mockPathname);
  });

  /**
   * Test case to verify that choosing a preset filter period resets the custom date parameters in the URL.
   */
  it("updates date range and clears URL when period changes to a preset", () => {
    // Arrange: Render the initial view.
    render(<DashboardView {...defaultProps} />);

    // Act: Simulate selecting the `past-week` preset.
    fireEvent.click(screen.getByTestId("btn-period-week"));

    // Assert: Verify the UI updates and the URL parameters are removed.
    expect(screen.getByTestId("header-period")).toHaveTextContent("past-week");
    expect(mockRouter.replace).toHaveBeenCalledWith(mockPathname);
  });

  /**
   * Test case to verify that manual date selection correctly synchronizes the state to the URL.
   */
  it("updates URL when date range changes to custom", () => {
    // Arrange: Render the initial view.
    render(<DashboardView {...defaultProps} />);

    // Act: Simulate a custom date selection from the header.
    fireEvent.click(screen.getByTestId("btn-date-custom"));

    // Assert: Verify the period switches to `custom` and the URL is updated with date parameters.
    expect(screen.getByTestId("header-period")).toHaveTextContent("custom");
    expect(mockRouter.replace).toHaveBeenCalledWith(expect.stringContaining("?start="));
  });

  /**
   * Test case to verify that a safe default date is used if the `oldestCaseDate` prop is missing.
   */
  it("uses a fallback for oldest date if not provided", () => {
    // Arrange: Create props without an explicit start date.
    const propsWithoutOldestDate = { ...defaultProps, oldestCaseDate: undefined };

    // Act: Render the component.
    render(<DashboardView {...propsWithoutOldestDate} />);

    // Assert: Verify that the metrics grid still receives a non-empty start date.
    expect(screen.getByTestId("metrics-date-from")).not.toBeEmptyDOMElement();
  });

  /**
   * Test case to verify the logic when the filter is set to the past month.
   */
  it("updates date range when period changes to 'past-month'", () => {
    // Arrange: Render the view.
    render(<DashboardView {...defaultProps} />);

    // Act: Select the `past-month` period.
    fireEvent.click(screen.getByTestId("btn-period-month"));

    // Assert: Verify UI state and URL synchronization.
    expect(screen.getByTestId("header-period")).toHaveTextContent("past-month");
    expect(mockRouter.replace).toHaveBeenCalledWith(mockPathname);
  });

  /**
   * Test case to verify the logic when the filter is set to the past year.
   */
  it("updates date range when period changes to 'past-year'", () => {
    // Arrange: Render the view.
    render(<DashboardView {...defaultProps} />);

    // Act: Select the `past-year` period.
    fireEvent.click(screen.getByTestId("btn-period-year"));

    // Assert: Verify UI state and URL synchronization.
    expect(screen.getByTestId("header-period")).toHaveTextContent("past-year");
    expect(mockRouter.replace).toHaveBeenCalledWith(mockPathname);
  });

  /**
   * Test case to verify the logic when the filter is manually reset to all-time.
   */
  it("updates date range when period changes to 'all-time'", () => {
    // Arrange: Render the view.
    render(<DashboardView {...defaultProps} />);

    // Act: Select the `all-time` period.
    fireEvent.click(screen.getByTestId("btn-period-all"));

    // Assert: Verify state update and URL cleanup.
    expect(screen.getByTestId("header-period")).toHaveTextContent("all-time");
    expect(mockRouter.replace).toHaveBeenCalledWith(mockPathname);
  });

  /**
   * Test case to verify that triggering a custom period without specific dates does not immediately push to the URL.
   */
  it("calculates default range for custom period change", () => {
    // Arrange: Render the view.
    render(<DashboardView {...defaultProps} />);

    // Act: Trigger the custom period change.
    fireEvent.click(screen.getByTestId("btn-period-custom-trigger"));

    // Assert: Verify the UI state is updated but no routing occurs yet.
    expect(screen.getByTestId("header-period")).toHaveTextContent("custom");
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure that component rerenders do not trigger redundant URL updates or infinite loops.
   */
  it("prevents infinite validation loop on updates", () => {
    // Arrange: Initial render.
    const { rerender } = render(<DashboardView {...defaultProps} />);

    // Act: Update search params and rerender the component.
    const newSearchParams = new URLSearchParams("start=invalid");
    vi.mocked(useSearchParams).mockReturnValue(
      newSearchParams as unknown as ReturnType<typeof useSearchParams>
    );

    rerender(<DashboardView {...defaultProps} />);

    // Assert: Verify the component remains stable and rendered.
    expect(screen.getByTestId("header-name")).toBeInTheDocument();
  });

  /**
   * Test case to verify that incomplete date ranges (missing end date) are not pushed to the URL parameters.
   */
  it("does not update URL if date range is incomplete", () => {
    // Arrange: Render the view.
    render(<DashboardView {...defaultProps} />);

    // Act: Simulate an incomplete date selection (start date only).
    fireEvent.click(screen.getByTestId("btn-date-custom-incomplete"));

    // Assert: Verify period is updated in state but URL remains untouched until range is finished.
    expect(screen.getByTestId("header-period")).toHaveTextContent("custom");
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
