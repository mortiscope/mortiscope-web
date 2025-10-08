import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardTablePagination } from "@/features/dashboard/components/dashboard-table-pagination";

// Mock the lucide-react icons used in the pagination buttons to verify their presence in the UI.
vi.mock("react-icons/lu", () => ({
  LuChevronLeft: () => <span data-testid="icon-prev" />,
  LuChevronRight: () => <span data-testid="icon-next" />,
  LuChevronsLeft: () => <span data-testid="icon-first" />,
  LuChevronsRight: () => <span data-testid="icon-last" />,
}));

/**
 * Test suite for the `DashboardTablePagination` component.
 */
describe("DashboardTablePagination", () => {
  // Define default properties to be used across multiple test cases.
  const defaultProps = {
    selectedRowCount: 5,
    totalRows: 100,
    currentPage: 2,
    totalPages: 10,
    canPreviousPage: true,
    canNextPage: true,
    onFirstPage: vi.fn(),
    onPreviousPage: vi.fn(),
    onNextPage: vi.fn(),
    onLastPage: vi.fn(),
  };

  /**
   * Test case to verify that page and row selection information is rendered accurately.
   */
  it("renders the correct page information text", () => {
    // Act: Render the pagination component with default properties.
    render(<DashboardTablePagination {...defaultProps} />);

    // Assert: Verify that the current page and selection counts are displayed.
    const pageInfo = screen.getAllByText("Page 2 of 10");
    expect(pageInfo).toHaveLength(2);

    const selectionInfo = screen.getAllByText("5 of 100 row(s) selected.");
    expect(selectionInfo).toHaveLength(2);
  });

  /**
   * Test case to verify that clicking navigation buttons triggers the respective callback functions.
   */
  it("calls navigation callbacks when buttons are clicked", () => {
    // Act: Render the component.
    render(<DashboardTablePagination {...defaultProps} />);

    // Assert: Simulate clicks on all navigation buttons and verify mock calls.
    const firstButtons = screen.getAllByLabelText("Go to first page");
    firstButtons.forEach((btn) => fireEvent.click(btn));
    expect(defaultProps.onFirstPage).toHaveBeenCalledTimes(2);

    const prevButtons = screen.getAllByLabelText("Go to previous page");
    prevButtons.forEach((btn) => fireEvent.click(btn));
    expect(defaultProps.onPreviousPage).toHaveBeenCalledTimes(2);

    const nextButtons = screen.getAllByLabelText("Go to next page");
    nextButtons.forEach((btn) => fireEvent.click(btn));
    expect(defaultProps.onNextPage).toHaveBeenCalledTimes(2);

    const lastButtons = screen.getAllByLabelText("Go to last page");
    lastButtons.forEach((btn) => fireEvent.click(btn));
    expect(defaultProps.onLastPage).toHaveBeenCalledTimes(2);
  });

  /**
   * Test case to verify that "Previous" and "First" buttons are disabled when on the first page.
   */
  it("disables previous/first buttons when canPreviousPage is false", () => {
    // Arrange: Set current page to 1 and `canPreviousPage` to false.
    render(<DashboardTablePagination {...defaultProps} currentPage={1} canPreviousPage={false} />);

    // Assert: Verify that the corresponding navigation buttons are disabled.
    const firstButtons = screen.getAllByLabelText("Go to first page");
    const prevButtons = screen.getAllByLabelText("Go to previous page");

    firstButtons.forEach((btn) => expect(btn).toBeDisabled());
    prevButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  /**
   * Test case to verify that "Next" and "Last" buttons are disabled when on the final page.
   */
  it("disables next/last buttons when canNextPage is false", () => {
    // Arrange: Set current page to the total page count and `canNextPage` to false.
    render(<DashboardTablePagination {...defaultProps} currentPage={10} canNextPage={false} />);

    // Assert: Verify that the forward navigation buttons are disabled.
    const nextButtons = screen.getAllByLabelText("Go to next page");
    const lastButtons = screen.getAllByLabelText("Go to last page");

    nextButtons.forEach((btn) => expect(btn).toBeDisabled());
    lastButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  /**
   * Test case to verify that interactive hover styles are applied when buttons are enabled.
   */
  it("applies correct styling classes based on active state", () => {
    // Act: Render the component in an active state.
    render(<DashboardTablePagination {...defaultProps} />);

    // Assert: Check for the presence of emerald-themed hover classes.
    const nextBtn = screen.getAllByLabelText("Go to next page")[0];
    expect(nextBtn.className).toContain("hover:bg-emerald-100");
  });

  /**
   * Test case to verify that hover styles are removed and opacity is reduced when buttons are disabled.
   */
  it("applies correct styling classes based on disabled state", () => {
    // Arrange: Render the component with navigation disabled.
    render(<DashboardTablePagination {...defaultProps} canNextPage={false} />);

    // Assert: Verify that visual feedback correctly reflects the disabled state.
    const nextBtn = screen.getAllByLabelText("Go to next page")[0];

    expect(nextBtn.className).toContain("opacity-50");
    expect(nextBtn.className).not.toContain("hover:bg-emerald-100");
  });
});
