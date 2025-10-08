import {
  type AccessorFnColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardTableColumns } from "@/features/dashboard/components/dashboard-table-columns";
import { CaseData } from "@/features/dashboard/schemas/dashboard";

// Mock the highlighted text component to simplify matching in tests.
vi.mock("@/features/dashboard/components/table-highlighted-text", () => ({
  HighlightedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

// Mock Radix UI Tooltip primitives to ensure visibility and accessibility in a JSDOM environment.
vi.mock("@radix-ui/react-tooltip", () => {
  const Content = React.forwardRef<
    HTMLDivElement,
    { children: React.ReactNode; className?: string }
  >(({ children, className }, ref) => (
    <div ref={ref} className={className} data-testid="tooltip-content">
      {children}
    </div>
  ));
  Content.displayName = "TooltipContent";

  return {
    Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Trigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Content,
    Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

// Mock sortable headers to isolate column definition logic from header interaction logic.
vi.mock("@/features/dashboard/components/table-sortable-header", () => ({
  SortableHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the Badge component to verify status-dependent styling classes.
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div data-testid="mock-badge" className={className}>
      {children}
    </div>
  ),
}));

// Mock the Checkbox component to allow direct event simulation for row selection.
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    className,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    className?: string;
  }) => (
    <input
      type="checkbox"
      data-testid="mock-checkbox"
      className={className}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}));

// Mock the standard Tooltip component to verify trigger text and availability.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}));

/**
 * Internal test helper component that instantiates TanStack Table with the actual column definitions.
 */
const TestTable = ({
  data,
  meta,
}: {
  data: CaseData[];
  meta?: { onViewCase?: (id: string) => void };
}) => {
  // Arrange: Initialize the table hook with provided data and the target column definitions.
  const table = useReactTable({
    data,
    columns: DashboardTableColumns,
    getCoreRowModel: getCoreRowModel(),
    meta,
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/**
 * Test suite for `DashboardTableColumns` component.
 */
describe("DashboardTableColumns", () => {
  const mockDate = "2025-10-15T12:00:00Z";

  // Define a complete mock case to verify all column outputs.
  const mockCaseData: CaseData[] = [
    {
      caseId: "case-123",
      caseName: "Test Case",
      caseDate: mockDate,
      verificationStatus: "verified",
      pmiEstimation: "24h",
      oldestStage: "Pupa",
      averageConfidence: "98%",
      imageCount: 5,
      detectionCount: 10,
      temperature: "25°C",
      location: {
        region: "Region 1",
        province: "Province 1",
        city: "City 1",
        barangay: "Barangay 1",
      },
    } as unknown as CaseData,
  ];

  /**
   * Test case to verify that the action button triggers the correct metadata callback.
   */
  it("renders the View button and calls onViewCase when clicked", () => {
    // Arrange: Create a mock function for the `onViewCase` metadata handler.
    const onViewCaseMock = vi.fn();

    render(<TestTable data={mockCaseData} meta={{ onViewCase: onViewCaseMock }} />);

    // Act: Find and click the action button.
    const viewButton = screen.getByLabelText("View case details");
    expect(viewButton).toBeInTheDocument();

    fireEvent.click(viewButton);

    // Assert: Verify that the callback was invoked with the specific `caseId`.
    expect(onViewCaseMock).toHaveBeenCalledWith("case-123");
  });

  /**
   * Test case to ensure the component remains stable if the optional action callback is missing.
   */
  it("does not throw error when View button is clicked and onViewCase is undefined", () => {
    // Arrange: Render the table without passing the `onViewCase` handler in meta.
    render(<TestTable data={mockCaseData} />);

    // Act & Assert: Simulate interaction and verify no crash occurs.
    const viewButton = screen.getByLabelText("View case details");
    fireEvent.click(viewButton);
    expect(viewButton).toBeInTheDocument();
  });

  /**
   * Test case to verify the selection checkbox is correctly rendered in the first column.
   */
  it("renders the Select checkbox", () => {
    // Act: Render the table.
    render(<TestTable data={mockCaseData} />);

    // Assert: Verify the existence of the row selection checkbox.
    const checkbox = screen.getByTestId("mock-checkbox");
    expect(checkbox).toBeInTheDocument();
  });

  /**
   * Test case to verify the date transformation logic for the Case Date column.
   */
  it("formats the Case Date correctly (YYYY-MM-DD)", () => {
    // Act: Render the table.
    render(<TestTable data={mockCaseData} />);

    // Assert: Verify that the ISO date string is truncated to only show the calendar date.
    expect(screen.getByText("2025-10-15")).toBeInTheDocument();
  });

  /**
   * Test case to verify that verification status is rendered with the appropriate color-coded badge.
   */
  it("renders the Verification Status with correct config/styles", () => {
    // Act: Render the table.
    render(<TestTable data={mockCaseData} />);

    // Assert: Verify the label text and the emerald color class associated with the "verified" state.
    expect(screen.getByText("Verified")).toBeInTheDocument();

    const badge = screen.getByTestId("mock-badge");
    expect(badge).toHaveClass("text-emerald-500");
  });

  /**
   * Test case to verify that standard textual data points are rendered accurately in their cells.
   */
  it("renders basic text fields correctly", () => {
    // Act: Render the table.
    render(<TestTable data={mockCaseData} />);

    // Assert: Check for the presence of multiple biological and logistical data strings.
    expect(screen.getByText("Test Case")).toBeInTheDocument();
    expect(screen.getByText("24h")).toBeInTheDocument();
    expect(screen.getByText("Pupa")).toBeInTheDocument();
    expect(screen.getByText("98%")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("25°C")).toBeInTheDocument();
  });

  /**
   * Test case to verify the truncated location display used as a tooltip trigger.
   */
  it("renders the Location tooltip trigger with shortened format", () => {
    // Act: Render the table.
    render(<TestTable data={mockCaseData} />);

    // Assert: Verify that the city and province are combined into the primary cell display.
    expect(screen.getByText("City 1, Province 1")).toBeInTheDocument();

    const trigger = screen.getByTestId("tooltip-trigger");
    expect(trigger).toHaveTextContent("City 1, Province 1");
  });

  /**
   * Test case to verify the hidden searchable string constructed by the location accessor function.
   */
  it("correctly constructs location search string via accessorFn", () => {
    // Arrange: Locate the location column definition.
    const locationCol = DashboardTableColumns.find((c) => c.id === "location");
    expect(locationCol).toBeDefined();

    // Act: Execute the accessor function directly with mock data.
    const accessor = (locationCol as AccessorFnColumnDef<CaseData>).accessorFn;
    const result = accessor(mockCaseData[0], 0);

    // Assert: Verify that all location levels are concatenated for global filtering.
    expect(result).toBe("Region 1 Province 1 City 1 Barangay 1");
  });

  /**
   * Test case to verify fallback rendering when the data contains an unrecognized status key.
   */
  it("handles fallback for unknown verification status", () => {
    // Arrange: Create a data object with a non-canonical status.
    const unknownStatusData = [
      {
        ...mockCaseData[0],
        verificationStatus: "unknown_status_key",
      } as unknown as CaseData,
    ];

    // Act: Render the table.
    render(<TestTable data={unknownStatusData} />);

    // Assert: Ensure the badge container is still rendered to avoid UI breakage.
    expect(screen.getByTestId("mock-badge")).toBeInTheDocument();
  });

  /**
   * Test case to verify the human-readable label returned by the verification status accessor function.
   */
  it("returns correct label for verificationStatus accessorFn with fallback", () => {
    // Arrange: Extract the status column accessor.
    const statusCol = DashboardTableColumns.find((c) => c.id === "verificationStatus");
    expect(statusCol).toBeDefined();
    const accessor = (statusCol as AccessorFnColumnDef<CaseData>).accessorFn;

    // Assert: Verify mapping for a valid status.
    expect(accessor(mockCaseData[0], 0)).toBe("Verified");

    // Assert: Verify mapping for a missing or "no detections" status.
    const unknownData = {
      ...mockCaseData[0],
      verificationStatus: "unknown" as unknown as CaseData["verificationStatus"],
    };
    expect(accessor(unknownData, 0)).toBe("No Detections");
  });
});
