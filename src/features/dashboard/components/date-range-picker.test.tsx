import { act, fireEvent, render, screen } from "@testing-library/react";
import { DateRange } from "react-day-picker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DateRangePicker } from "@/features/dashboard/components/date-range-picker";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock the mobile detection hook to simulate both handheld and desktop viewports.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

// Mock the date range formatter to return static strings for predictable assertions.
vi.mock("@/features/dashboard/utils/format-date-range", () => ({
  formatDateRange: (date: DateRange | undefined) => (date ? "Formatted Date Range" : "Pick a date"),
}));

// Mock the UI Button component to simplify event handling and property inspection.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="ui-button"
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock the Calendar component to simulate range selection via a button click.
vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
    numberOfMonths,
  }: {
    onSelect: (range: DateRange) => void;
    numberOfMonths: number;
  }) => (
    <div data-testid="mock-calendar" data-months={numberOfMonths}>
      <button
        data-testid="calendar-select-btn"
        onClick={() =>
          onSelect({
            from: new Date("2024-01-01"),
            to: new Date("2024-01-05"),
          })
        }
      >
        Select Range
      </button>
    </div>
  ),
}));

// Mock the Popover primitives to control the visibility state of the picker overlay.
vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="mock-popover" data-open={open}>
      <button
        data-testid="trigger-popover-open"
        onClick={() => onOpenChange(true)}
        style={{ display: "none" }}
      />
      <button
        data-testid="trigger-popover-close"
        onClick={() => onOpenChange(false)}
        style={{ display: "none" }}
      />
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-popover-trigger">{children}</div>
  ),
  PopoverContent: ({
    children,
    align,
  }: {
    children: React.ReactNode;
    align?: "center" | "end" | "start";
  }) => (
    <div data-testid="mock-popover-content" data-align={align}>
      {children}
    </div>
  ),
}));

/**
 * Test suite for the `DateRangePicker` component.
 */
describe("DateRangePicker", () => {
  const mockOnDateChange = vi.fn();
  const mockOnReset = vi.fn();
  const defaultDate: DateRange = {
    from: new Date("2023-01-01"),
    to: new Date("2023-01-31"),
  };

  // Setup initial test state and enable fake timers for handling automatic closure delays.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  // Restore timers after each test to prevent side effects.
  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper function to simulate opening the picker popover.
  const openPopover = () => {
    fireEvent.click(screen.getByTestId("trigger-popover-open"));
  };

  /**
   * Test case to verify that the initial button renders the formatted range text.
   */
  it("renders the trigger button with formatted date", () => {
    // Arrange: Render the picker with a default date range.
    render(
      <DateRangePicker date={defaultDate} onDateChange={mockOnDateChange} onReset={mockOnReset} />
    );

    // Assert: Verify the formatted date string is visible.
    expect(screen.getByText("Formatted Date Range")).toBeInTheDocument();
  });

  /**
   * Test case to verify the programmatic opening of the popover.
   */
  it("opens the popover when triggered", () => {
    // Arrange: Render the picker.
    render(
      <DateRangePicker date={defaultDate} onDateChange={mockOnDateChange} onReset={mockOnReset} />
    );

    // Assert: Verify initial closed state.
    const popover = screen.getByTestId("mock-popover");
    expect(popover).toHaveAttribute("data-open", "false");

    // Act: Trigger the popover to open.
    openPopover();

    // Assert: Verify popover is now open.
    expect(popover).toHaveAttribute("data-open", "true");
  });

  /**
   * Test case to verify the reset action and the resulting disabled state.
   */
  it("calls onReset and shows loading state when Reset is clicked", () => {
    // Arrange: Render and open the picker.
    render(
      <DateRangePicker date={defaultDate} onDateChange={mockOnDateChange} onReset={mockOnReset} />
    );
    openPopover();

    // Act: Click the reset button.
    const resetButton = screen.getByText("Reset").closest("button");
    fireEvent.click(resetButton!);

    // Assert: Verify reset callback was executed and button is disabled.
    expect(mockOnReset).toHaveBeenCalled();
    expect(resetButton).toBeDisabled();
  });

  /**
   * Test case to verify that applying a new date selection triggers the change callback.
   */
  it("calls onDateChange with new range when Apply is clicked", () => {
    // Arrange: Render and open the picker.
    render(
      <DateRangePicker date={defaultDate} onDateChange={mockOnDateChange} onReset={mockOnReset} />
    );
    openPopover();

    // Act: Simulate selecting a range in the calendar and clicking Apply.
    fireEvent.click(screen.getByTestId("calendar-select-btn"));
    const applyButton = screen.getByText("Apply").closest("button");
    fireEvent.click(applyButton!);

    // Assert: Verify change handler was called with a new date object.
    expect(mockOnDateChange).toHaveBeenCalledWith({
      from: expect.any(Date),
      to: expect.any(Date),
    });
    expect(applyButton).toBeDisabled();
  });

  /**
   * Test case to verify the Apply button is disabled when only one half of the range is selected.
   */
  it("disables the Apply button when date selection is incomplete", () => {
    // Arrange: Render the picker with an undefined date range.
    render(
      <DateRangePicker date={undefined} onDateChange={mockOnDateChange} onReset={mockOnReset} />
    );
    openPopover();

    // Assert: Verify the Apply button remains disabled.
    const applyButton = screen.getByText("Apply").closest("button");
    expect(applyButton).toBeDisabled();
  });

  /**
   * Test case to verify layout adjustments for mobile screen widths.
   */
  it("renders with correct layout on mobile", () => {
    // Arrange: Mock the mobile hook to return true.
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(
      <DateRangePicker date={defaultDate} onDateChange={mockOnDateChange} onReset={mockOnReset} />
    );
    openPopover();

    // Assert: Verify single month view and centered alignment.
    expect(screen.getByTestId("mock-calendar")).toHaveAttribute("data-months", "1");
    expect(screen.getByTestId("mock-popover-content")).toHaveAttribute("data-align", "center");
  });

  /**
   * Test case to verify layout adjustments for desktop screen widths.
   */
  it("renders with correct layout on desktop", () => {
    // Arrange: Ensure mobile hook returns false.
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(
      <DateRangePicker date={defaultDate} onDateChange={mockOnDateChange} onReset={mockOnReset} />
    );
    openPopover();

    // Assert: Verify dual month view and end alignment.
    expect(screen.getByTestId("mock-calendar")).toHaveAttribute("data-months", "2");
    expect(screen.getByTestId("mock-popover-content")).toHaveAttribute("data-align", "end");
  });

  /**
   * Test case to verify the automatic overlay closure after data finishes loading.
   */
  it("closes the popover automatically after loading finishes and delay passes", () => {
    // Arrange: Initial render.
    const { rerender } = render(
      <DateRangePicker
        date={defaultDate}
        onDateChange={mockOnDateChange}
        onReset={mockOnReset}
        isLoading={false}
      />
    );
    openPopover();

    // Act: Simulate applying a date and transitioning to a loading state.
    fireEvent.click(screen.getByTestId("calendar-select-btn"));
    fireEvent.click(screen.getByText("Apply").closest("button")!);

    rerender(
      <DateRangePicker
        date={defaultDate}
        onDateChange={mockOnDateChange}
        onReset={mockOnReset}
        isLoading={true}
      />
    );
    expect(screen.getByTestId("mock-popover")).toHaveAttribute("data-open", "true");

    // Act: End loading state and simulate timer advancement.
    rerender(
      <DateRangePicker
        date={defaultDate}
        onDateChange={mockOnDateChange}
        onReset={mockOnReset}
        isLoading={false}
      />
    );

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    // Assert: Verify popover closed automatically.
    expect(screen.getByTestId("mock-popover")).toHaveAttribute("data-open", "false");
  });

  /**
   * Test case to verify that the popover cannot be dismissed while an active loading operation is occurring.
   */
  it("prevents closing the popover while loading is in progress", () => {
    // Arrange: Render in loading state and open picker.
    render(
      <DateRangePicker
        date={defaultDate}
        onDateChange={mockOnDateChange}
        onReset={mockOnReset}
        isLoading={true}
      />
    );
    openPopover();

    // Act: Click reset and attempt to close the popover.
    const resetButton = screen.getByText("Reset").closest("button");
    fireEvent.click(resetButton!);
    fireEvent.click(screen.getByTestId("trigger-popover-close"));

    // Assert: Verify popover remains locked open during loading.
    expect(screen.getByTestId("mock-popover")).toHaveAttribute("data-open", "true");
  });

  /**
   * Test case to verify that internal logic guards against manual selection overrides with invalid ranges.
   */
  it("does not call onDateChange logic if Apply button is forced clicked with incomplete range", () => {
    // Arrange: Setup picker with no selected date.
    render(
      <DateRangePicker date={undefined} onDateChange={mockOnDateChange} onReset={mockOnReset} />
    );
    openPopover();

    // Act: Forcefully enable and click the Apply button.
    const applyButton = screen.getByText("Apply").closest("button") as HTMLButtonElement;
    expect(applyButton).toBeDisabled();

    applyButton.disabled = false;
    fireEvent.click(applyButton);

    // Assert: Verify change handler was not triggered.
    expect(mockOnDateChange).not.toHaveBeenCalled();
  });
});
