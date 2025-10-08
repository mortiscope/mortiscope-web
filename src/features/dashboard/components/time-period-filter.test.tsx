import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { TimePeriodFilter } from "@/features/dashboard/components/time-period-filter";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock the mobile detection hook to test responsive dropdown alignment logic.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock the UI Button to simplify the component tree and focus on label rendering.
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button data-testid="trigger-button" className={className} {...props}>
      {children}
    </button>
  ),
}));

// Mock the DropdownMenu system to verify selection logic and property propagation.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children, align }: { children: React.ReactNode; align?: string }) => (
    <div data-testid="dropdown-content" data-align={align}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    className,
  }: {
    children: React.ReactNode;
    onSelect: () => void;
    className?: string;
  }) => (
    <div data-testid="dropdown-item" onClick={onSelect} className={className} role="menuitem">
      {children}
    </div>
  ),
}));

// Mock Lucide clock icons to verify correct icon switching based on selected time periods.
vi.mock("react-icons/lu", () => ({
  LuClock3: () => <span data-testid="icon-clock-3" />,
  LuClock6: () => <span data-testid="icon-clock-6" />,
  LuClock9: () => <span data-testid="icon-clock-9" />,
  LuClock12: () => <span data-testid="icon-clock-12" />,
}));

/**
 * Test suite for the `TimePeriodFilter` component.
 */
describe("TimePeriodFilter", () => {
  // Mock callback function to track time period change events.
  const mockOnPeriodChange = vi.fn();

  /**
   * Test case to verify the label and icon displayed when `all-time` is selected.
   */
  it("displays the correct label for 'all-time' selection", () => {
    // Arrange: Render the filter with the `selectedPeriod` prop set to `all-time`.
    render(<TimePeriodFilter selectedPeriod="all-time" onPeriodChange={mockOnPeriodChange} />);

    // Assert: Check that the button displays the correct text and the `12 o'clock` icon.
    const trigger = screen.getByTestId("trigger-button");
    expect(trigger).toHaveTextContent("All-time");
    expect(within(trigger).getByTestId("icon-clock-12")).toBeInTheDocument();
  });

  /**
   * Test case to verify the label and icon displayed when `past-year` is selected.
   */
  it("displays the correct label for 'past-year' selection", () => {
    // Arrange: Render the filter with the `selectedPeriod` prop set to `past-year`.
    render(<TimePeriodFilter selectedPeriod="past-year" onPeriodChange={mockOnPeriodChange} />);

    // Assert: Check that the button displays the correct text and the `3 o'clock` icon.
    const trigger = screen.getByTestId("trigger-button");
    expect(trigger).toHaveTextContent("Past Year");
    expect(within(trigger).getByTestId("icon-clock-3")).toBeInTheDocument();
  });

  /**
   * Test case to verify the fallback label when a custom or undefined period is selected.
   */
  it("displays 'Custom Date' when an unknown or custom value is selected", () => {
    // Arrange: Render the filter with a `custom` period value.
    render(<TimePeriodFilter selectedPeriod="custom" onPeriodChange={mockOnPeriodChange} />);

    // Assert: Verify that the button defaults to showing the `Custom Date` text.
    const trigger = screen.getByTestId("trigger-button");
    expect(trigger).toHaveTextContent("Custom Date");
  });

  /**
   * Test case to ensure all available time period options are present in the dropdown menu.
   */
  it("renders all dropdown options", () => {
    // Arrange: Render the component in any valid state.
    render(<TimePeriodFilter selectedPeriod="all-time" onPeriodChange={mockOnPeriodChange} />);

    // Assert: Verify that four menu items exist with the expected text labels.
    const items = screen.getAllByTestId("dropdown-item");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("All-time");
    expect(items[1]).toHaveTextContent("Past Year");
    expect(items[2]).toHaveTextContent("Past Month");
    expect(items[3]).toHaveTextContent("Past Week");
  });

  /**
   * Test case to verify that selecting a menu item triggers the period change callback with the correct identifier.
   */
  it("calls onPeriodChange with correct value when an item is clicked", () => {
    // Arrange: Render the filter for interaction.
    render(<TimePeriodFilter selectedPeriod="all-time" onPeriodChange={mockOnPeriodChange} />);

    // Act: Simulate a click on the third item in the dropdown list.
    const items = screen.getAllByTestId("dropdown-item");
    fireEvent.click(items[2]);

    // Assert: Ensure the `onPeriodChange` function was called with the `past-month` value.
    expect(mockOnPeriodChange).toHaveBeenCalledWith("past-month");
  });

  /**
   * Test case to ensure the currently selected item is visually distinguished via CSS classes.
   */
  it("applies active styling to the selected item", () => {
    // Arrange: Render the filter with `past-month` as the active selection.
    render(<TimePeriodFilter selectedPeriod="past-month" onPeriodChange={mockOnPeriodChange} />);

    // Assert: Check that the corresponding dropdown item contains the emerald background and text classes.
    const items = screen.getAllByTestId("dropdown-item");
    const activeItem = items[2];

    expect(activeItem.className).toContain("bg-emerald-50");
    expect(activeItem.className).toContain("text-emerald-700");
  });

  /**
   * Test case to ensure that items not currently selected do not have active styling.
   */
  it("does not apply active styling to unselected items", () => {
    // Arrange: Render the filter with `past-month` selected.
    render(<TimePeriodFilter selectedPeriod="past-month" onPeriodChange={mockOnPeriodChange} />);

    // Assert: Verify that a different item in the list does not have the emerald background class.
    const items = screen.getAllByTestId("dropdown-item");
    const inactiveItem = items[0];

    expect(inactiveItem.className).not.toContain("bg-emerald-50");
  });

  /**
   * Test case to verify that the dropdown content aligns to the start of the trigger on mobile devices.
   */
  it("aligns dropdown to start on mobile", () => {
    // Arrange: Mock the mobile hook to return true and render the component.
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<TimePeriodFilter selectedPeriod="all-time" onPeriodChange={mockOnPeriodChange} />);

    // Assert: Verify the `data-align` attribute on the dropdown content is set to `start`.
    const content = screen.getByTestId("dropdown-content");
    expect(content).toHaveAttribute("data-align", "start");
  });

  /**
   * Test case to verify that the dropdown content aligns to the end of the trigger on desktop devices.
   */
  it("aligns dropdown to end on desktop", () => {
    // Arrange: Mock the mobile hook to return false and render the component.
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(<TimePeriodFilter selectedPeriod="all-time" onPeriodChange={mockOnPeriodChange} />);

    // Assert: Verify the `data-align` attribute on the dropdown content is set to `end`.
    const content = screen.getByTestId("dropdown-content");
    expect(content).toHaveAttribute("data-align", "end");
  });
});
