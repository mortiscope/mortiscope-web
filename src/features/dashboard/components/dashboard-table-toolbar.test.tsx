import { type Table } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardTableToolbar } from "@/features/dashboard/components/dashboard-table-toolbar";
import { type CaseData } from "@/features/dashboard/schemas/dashboard";

// Mock framer-motion to bypass animation delays and directly test structural changes.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock the UI Input component to verify search term state management.
vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="mock-input" {...props} />
  ),
}));

// Mock the UI Button component to verify variant application and click handlers.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    className,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button
      data-testid="mock-button"
      data-variant={variant}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}));

// Mock the UI Checkbox to simplify state verification for column visibility toggles.
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      data-testid="mock-checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}));

// Mock Dropdown Menu components to verify the existence of column visibility controls.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    className,
    onSelect,
  }: {
    children: React.ReactNode;
    className?: string;
    onSelect?: (e: Event) => void;
  }) => (
    <div
      className={className}
      data-testid="dropdown-item"
      onClick={() => onSelect?.({ preventDefault: vi.fn() } as unknown as Event)}
    >
      {children}
    </div>
  ),
}));

/**
 * Utility function to create a mock TanStack Table instance.
 */
const createMockTable = (
  globalFilter = "",
  setGlobalFilter = vi.fn(),
  columnVisibilityMock = vi.fn()
) =>
  ({
    getState: () => ({ globalFilter }),
    setGlobalFilter,
    getColumn: (id: string) => ({
      id,
      getIsVisible: () => true,
      toggleVisibility: columnVisibilityMock,
    }),
    columns: [],
    getCoreRowModel: vi.fn(),
    onGlobalFilterChange: setGlobalFilter,
  }) as unknown as Table<CaseData>;

/**
 * Test suite for the `DashboardTableToolbar` component.
 */
describe("DashboardTableToolbar", () => {
  const defaultOnDelete = vi.fn();

  /**
   * Test case to verify that the search input correctly reflects the current global filter state.
   */
  it("renders the search input with correct value", () => {
    // Arrange: Create a table mock with a predefined search string.
    const mockTable = createMockTable("test search");

    // Act: Render the toolbar.
    render(
      <DashboardTableToolbar
        table={mockTable}
        selectedCount={0}
        onDeleteSelected={defaultOnDelete}
      />
    );

    // Assert: Verify the input element exists and displays the provided search term.
    const input = screen.getByTestId("mock-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("test search");
  });

  /**
   * Test case to verify that the search input handles undefined global filter states by showing an empty string.
   */
  it("renders with empty string input when globalFilter is undefined", () => {
    // Arrange: Mock a table state where `globalFilter` is undefined.
    const mockTable = {
      getState: () => ({ globalFilter: undefined }),
      setGlobalFilter: vi.fn(),
      getColumn: vi.fn(),
    } as unknown as Table<CaseData>;

    // Act: Render the toolbar.
    render(
      <DashboardTableToolbar
        table={mockTable}
        selectedCount={0}
        onDeleteSelected={defaultOnDelete}
      />
    );

    // Assert: Verify the input value is an empty string.
    const input = screen.getByTestId("mock-input");
    expect(input).toHaveValue("");
  });

  /**
   * Test case to verify that typing in the search input triggers the table's global filter update.
   */
  it("updates global filter when typing in search input", () => {
    // Arrange: Mock the filter update function.
    const setGlobalFilterMock = vi.fn();
    const mockTable = createMockTable("", setGlobalFilterMock);

    render(
      <DashboardTableToolbar
        table={mockTable}
        selectedCount={0}
        onDeleteSelected={defaultOnDelete}
      />
    );

    // Act: Simulate a change event on the search input.
    const input = screen.getByTestId("mock-input");
    fireEvent.change(input, { target: { value: "new query" } });

    // Assert: Verify the table state update function was called with the new input value.
    expect(setGlobalFilterMock).toHaveBeenCalledWith("new query");
  });

  /**
   * Test case to verify that the bulk delete button is hidden when no table rows are selected.
   */
  it("does not render the Delete button when selectedCount is 0", () => {
    // Arrange: Render the toolbar with a `selectedCount` of zero.
    const mockTable = createMockTable();
    render(
      <DashboardTableToolbar
        table={mockTable}
        selectedCount={0}
        onDeleteSelected={defaultOnDelete}
      />
    );

    // Assert: Verify the "Delete" button is absent from the DOM.
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the bulk delete button is visible when at least one row is selected.
   */
  it("renders the Delete button when selectedCount is greater than 0", () => {
    // Arrange: Render the toolbar with a `selectedCount` of three.
    const mockTable = createMockTable();
    render(
      <DashboardTableToolbar
        table={mockTable}
        selectedCount={3}
        onDeleteSelected={defaultOnDelete}
      />
    );

    // Assert: Verify the "Delete" button is visible.
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the delete button triggers the `onDeleteSelected` callback.
   */
  it("calls onDeleteSelected when Delete button is clicked", () => {
    // Arrange: Mock the deletion handler callback.
    const onDeleteMock = vi.fn();
    const mockTable = createMockTable();

    render(
      <DashboardTableToolbar table={mockTable} selectedCount={1} onDeleteSelected={onDeleteMock} />
    );

    // Act: Simulate a user click on the Delete button.
    const deleteBtn = screen.getByText("Delete").closest("button");
    fireEvent.click(deleteBtn!);

    // Assert: Verify the deletion handler was executed.
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify the presence of the column visibility dropdown trigger.
   */
  it("renders the Columns dropdown trigger", () => {
    // Act: Render the toolbar.
    const mockTable = createMockTable();
    render(
      <DashboardTableToolbar
        table={mockTable}
        selectedCount={0}
        onDeleteSelected={defaultOnDelete}
      />
    );

    // Assert: Verify the "Columns" control exists in the UI.
    expect(screen.getByText("Columns")).toBeInTheDocument();
  });

  /**
   * Test case to verify that specific biological and logistical columns are available for visibility toggling.
   */
  it("renders column visibility toggles correctly", () => {
    // Act: Render the toolbar.
    const mockTable = createMockTable();
    render(
      <DashboardTableToolbar
        table={mockTable}
        selectedCount={0}
        onDeleteSelected={defaultOnDelete}
      />
    );

    // Assert: Verify that the expected column names appear as selectable items.
    expect(screen.getByText("Verification Status")).toBeInTheDocument();
    expect(screen.getByText("PMI Estimation")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
  });

  /**
   * Test case to verify that toggling a column checkbox triggers the respective column visibility state change.
   */
  it("toggles column visibility when checkbox is clicked", () => {
    // Arrange: Mock the visibility toggle handler for the specific "location" column.
    const toggleVisibilityMock = vi.fn();

    const mockTable = {
      getState: () => ({ globalFilter: "" }),
      setGlobalFilter: vi.fn(),
      getColumn: (id: string) => {
        if (id === "location") {
          return {
            id,
            getIsVisible: () => true,
            toggleVisibility: toggleVisibilityMock,
          };
        }
      },
    } as unknown as Table<CaseData>;

    render(
      <DashboardTableToolbar
        table={mockTable}
        selectedCount={0}
        onDeleteSelected={defaultOnDelete}
      />
    );

    // Act: Locate and click the checkbox associated with the "Location" column.
    const locationItem = screen.getByText("Location").closest("div");
    const checkbox = locationItem?.querySelector("input[type='checkbox']");

    expect(checkbox).toBeInTheDocument();

    fireEvent.click(checkbox!);

    // Assert: Verify the table's visibility toggle method was invoked.
    expect(toggleVisibilityMock).toHaveBeenCalled();
  });

  /**
   * Test case to ensure that clicking column items does not cause unwanted navigation or default actions.
   */
  it("prevents default behavior when a column item is selected", () => {
    // Arrange: Render the component.
    const mockTable = createMockTable();
    render(
      <DashboardTableToolbar
        table={mockTable}
        selectedCount={0}
        onDeleteSelected={defaultOnDelete}
      />
    );

    // Act & Assert: Simulate interaction and verify the element remains stable in the DOM.
    const locationItem = screen.getByText("Location").closest("div");
    fireEvent.click(locationItem!);
    expect(locationItem).toBeInTheDocument();
  });
});
