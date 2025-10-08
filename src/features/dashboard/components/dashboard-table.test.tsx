import { Table } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardTable } from "@/features/dashboard/components/dashboard-table";
import { CaseData } from "@/features/dashboard/schemas/dashboard";

// Mock the search icon from react-icons to verify empty state imagery.
vi.mock("react-icons/hi", () => ({
  HiOutlineSearch: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-search" {...props} />
  ),
}));

// Mock the flexRender utility to simplify the rendering of dynamic column components.
vi.mock("@tanstack/react-table", () => ({
  flexRender: (Comp: React.ElementType, props: Record<string, unknown>) => {
    if (typeof Comp === "function") {
      return <Comp {...props} />;
    }
    return Comp;
  },
}));

type MockHeader = {
  id: string;
  isPlaceholder?: boolean;
  column: { columnDef: { header: string }; id: string };
  getContext: () => Record<string, unknown>;
};

type MockCell = {
  id: string;
  column: { id: string; columnDef: { cell: string } };
  getContext: () => Record<string, unknown>;
};

type MockRow = {
  id: string;
  getIsSelected: () => boolean;
  getVisibleCells: () => MockCell[];
};

/**
 * Test suite for the `DashboardTable` component.
 */
describe("DashboardTable", () => {
  const mockTableScrollRef = createRef<HTMLDivElement>();

  /**
   * Utility function to create a mock instance of the TanStack Table.
   */
  const createMockTable = ({
    rows = [],
    headers = [],
  }: {
    rows?: MockRow[];
    headers?: MockHeader[];
  } = {}) =>
    ({
      getHeaderGroups: () => [
        {
          id: "header-group-1",
          headers,
        },
      ],
      getRowModel: () => ({
        rows,
      }),
      getAllColumns: () => headers.map((h) => h.column),
    }) as unknown as Table<CaseData>;

  /**
   * Test case to verify that a fallback message and icon are displayed when the dataset is empty.
   */
  it("renders the empty state when there are no rows", () => {
    // Arrange: Create a table mock with zero rows.
    const table = createMockTable({ rows: [] });

    // Act: Render the dashboard table.
    render(<DashboardTable table={table} tableScrollRef={mockTableScrollRef} />);

    // Assert: Verify the presence of the empty state text and search icon.
    expect(screen.getByText("No Cases Found")).toBeInTheDocument();
    expect(screen.getByTestId("icon-search")).toBeInTheDocument();
  });

  /**
   * Test case to verify that table header strings are rendered within the thead section.
   */
  it("renders headers correctly", () => {
    // Arrange: Define two mock header columns.
    const headers: MockHeader[] = [
      {
        id: "h1",
        isPlaceholder: false,
        column: { id: "col1", columnDef: { header: "Column 1" } },
        getContext: () => ({}),
      },
      {
        id: "h2",
        isPlaceholder: false,
        column: { id: "col2", columnDef: { header: "Column 2" } },
        getContext: () => ({}),
      },
    ];
    const table = createMockTable({ headers, rows: [] });

    // Act: Render the table.
    render(<DashboardTable table={table} tableScrollRef={mockTableScrollRef} />);

    // Assert: Check that both header titles are visible.
    expect(screen.getByText("Column 1")).toBeInTheDocument();
    expect(screen.getByText("Column 2")).toBeInTheDocument();
  });

  /**
   * Test case to verify that placeholder headers are ignored during the rendering process.
   */
  it("renders nothing for placeholder headers", () => {
    // Arrange: Mock one real header and one placeholder header.
    const headers: MockHeader[] = [
      {
        id: "h1",
        isPlaceholder: true,
        column: { id: "col1", columnDef: { header: "Placeholder Header" } },
        getContext: () => ({}),
      },
      {
        id: "h2",
        isPlaceholder: false,
        column: { id: "col2", columnDef: { header: "Real Header" } },
        getContext: () => ({}),
      },
    ];
    const table = createMockTable({ headers, rows: [] });

    // Act: Render the table.
    render(<DashboardTable table={table} tableScrollRef={mockTableScrollRef} />);

    // Assert: Verify the placeholder text is absent while the real header is present.
    expect(screen.queryByText("Placeholder Header")).not.toBeInTheDocument();
    expect(screen.getByText("Real Header")).toBeInTheDocument();
  });

  /**
   * Test case to verify that row data is correctly mapped to table cells.
   */
  it("renders rows and cells correctly", () => {
    // Arrange: Setup a table with a single column and a single row of data.
    const headers: MockHeader[] = [
      {
        id: "h1",
        column: { id: "col1", columnDef: { header: "Col 1" } },
        getContext: () => ({}),
      },
    ];

    const rows: MockRow[] = [
      {
        id: "r1",
        getIsSelected: () => false,
        getVisibleCells: () => [
          {
            id: "c1",
            column: { id: "col1", columnDef: { cell: "Cell Value 1" } },
            getContext: () => ({}),
          },
        ],
      },
    ];

    const table = createMockTable({ headers, rows });

    // Act: Render the table.
    render(<DashboardTable table={table} tableScrollRef={mockTableScrollRef} />);

    // Assert: Verify the cell value is rendered and empty state is hidden.
    expect(screen.getByText("Cell Value 1")).toBeInTheDocument();
    expect(screen.queryByText("No Cases Found")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that specific background styling is applied to rows marked as selected.
   */
  it("applies selected styling to rows when getIsSelected returns true", () => {
    // Arrange: Create one selected row and one unselected row.
    const rows: MockRow[] = [
      {
        id: "r1",
        getIsSelected: () => true,
        getVisibleCells: () => [],
      },
      {
        id: "r2",
        getIsSelected: () => false,
        getVisibleCells: () => [],
      },
    ];

    const table = createMockTable({ rows });

    // Act: Render the table.
    render(<DashboardTable table={table} tableScrollRef={mockTableScrollRef} />);

    // Assert: Verify the presence or absence of the `bg-emerald-50` class on the respective rows.
    const rowElements = screen.getAllByRole("row");
    expect(rowElements[1]).toHaveClass("bg-emerald-50");
    expect(rowElements[2]).not.toHaveClass("bg-emerald-50");
  });

  /**
   * Test case to verify that cell padding varies based on the column identity (e.g., selection checkbox vs data).
   */
  it("applies specific padding classes based on column id", () => {
    // Arrange: Create a row with selection, name, and generic columns.
    const rows: MockRow[] = [
      {
        id: "r1",
        getIsSelected: () => false,
        getVisibleCells: () => [
          {
            id: "c1",
            column: { id: "select", columnDef: { cell: "Select" } },
            getContext: () => ({}),
          },
          {
            id: "c2",
            column: { id: "caseName", columnDef: { cell: "Name" } },
            getContext: () => ({}),
          },
          {
            id: "c3",
            column: { id: "other", columnDef: { cell: "Other" } },
            getContext: () => ({}),
          },
        ],
      },
    ];

    const table = createMockTable({ rows });

    // Act: Render the table.
    render(<DashboardTable table={table} tableScrollRef={mockTableScrollRef} />);

    // Assert: Verify padding logic for `select` (right padding), `caseName` (left padding), and defaults.
    const cells = screen.getAllByRole("cell");
    expect(cells[0]).toHaveClass("pr-1");
    expect(cells[1]).toHaveClass("pl-1");
    expect(cells[2]).toHaveClass("px-2 md:px-4");
  });

  /**
   * Test case to verify that the provided scroll reference is attached to the correct container.
   */
  it("attaches the ref to the scroll container", () => {
    // Act: Render the table and provide a React ref.
    const table = createMockTable();
    render(<DashboardTable table={table} tableScrollRef={mockTableScrollRef} />);

    // Assert: Verify the ref points to the overflow-enabled div.
    expect(mockTableScrollRef.current).toBeInTheDocument();
    expect(mockTableScrollRef.current).toHaveClass("w-full overflow-x-auto");
  });
});
