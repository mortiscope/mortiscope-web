import { Header } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SortableHeader } from "@/features/dashboard/components/table-sortable-header";

// Mock the sort icons from react-icons to verify their presence and styling in the DOM.
vi.mock("react-icons/bs", () => ({
  BsSortDown: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="icon-sort-down" {...props} />
  ),
  BsSortUp: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="icon-sort-up" {...props} />
  ),
}));

/**
 * Helper function to generate a mock TanStack Table header object.
 */
const createMockHeader = (
  canSort: boolean,
  isSorted: boolean | "asc" | "desc" = false,
  toggleHandler = vi.fn()
) =>
  ({
    column: {
      getCanSort: () => canSort,
      getIsSorted: () => isSorted,
      getToggleSortingHandler: () => toggleHandler,
    },
  }) as unknown as Header<unknown, unknown>;

/**
 * Test suite for the `SortableHeader` component.
 */
describe("SortableHeader", () => {
  /**
   * Test case to verify that non-sortable columns render simple text without interactive elements.
   */
  it("renders plain content without button when column is not sortable", () => {
    // Arrange: Create a mock header where sorting is disabled.
    const mockHeader = createMockHeader(false);

    render(<SortableHeader header={mockHeader}>Column Title</SortableHeader>);

    // Assert: Verify that only the title text is rendered and no sorting buttons or icons are present.
    expect(screen.getByText("Column Title")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("icon-sort-up")).not.toBeInTheDocument();
    expect(screen.queryByTestId("icon-sort-down")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the default state of a sortable column that has not yet been sorted.
   */
  it("renders button and default sort icon when sortable but not sorted", () => {
    // Arrange: Create a mock header that is sortable but currently in an unsorted state.
    const mockHeader = createMockHeader(true, false);

    render(<SortableHeader header={mockHeader}>Column Title</SortableHeader>);

    // Assert: Confirm that the interactive button exists and displays a neutral-colored sort icon.
    const button = screen.getByRole("button");
    const icon = screen.getByTestId("icon-sort-up");

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Column Title");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("text-slate-600");
  });

  /**
   * Test case to verify the visual state when ascending sort is active.
   */
  it("renders active ascending icon when sorted ascending", () => {
    // Arrange: Create a mock header set to an active ascending sort state.
    const mockHeader = createMockHeader(true, "asc");

    render(<SortableHeader header={mockHeader}>Column Title</SortableHeader>);

    // Assert: Verify that the upward icon is displayed with the active color class and the downward icon is hidden.
    const icon = screen.getByTestId("icon-sort-up");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("text-emerald-500");
    expect(screen.queryByTestId("icon-sort-down")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the visual state when descending sort is active.
   */
  it("renders active descending icon when sorted descending", () => {
    // Arrange: Create a mock header set to an active descending sort state.
    const mockHeader = createMockHeader(true, "desc");

    render(<SortableHeader header={mockHeader}>Column Title</SortableHeader>);

    // Assert: Verify that the downward icon is displayed with the active color class and the upward icon is hidden.
    const icon = screen.getByTestId("icon-sort-down");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("text-emerald-500");
    expect(screen.queryByTestId("icon-sort-up")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that user interaction triggers the internal table sorting logic.
   */
  it("calls the toggle sorting handler when clicked", () => {
    // Arrange: Setup a mock handler and render the interactive header.
    const toggleMock = vi.fn();
    const mockHeader = createMockHeader(true, false, toggleMock);

    render(<SortableHeader header={mockHeader}>Column Title</SortableHeader>);

    // Act: Simulate a user clicking the header button.
    fireEvent.click(screen.getByRole("button"));

    // Assert: Ensure the `toggleMock` function was executed exactly once.
    expect(toggleMock).toHaveBeenCalledTimes(1);
  });
});
