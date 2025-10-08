import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardTableContainer } from "@/features/dashboard/components/dashboard-table-container";
import { useDashboardTable } from "@/features/dashboard/hooks/use-dashboard-table";
import { CaseData } from "@/features/dashboard/schemas/dashboard";
import { type Case } from "@/features/results/components/results-preview";

// Interface defining the expected properties for the mocked pagination component.
interface MockPaginationProps {
  currentPage: number;
  totalPages: number;
  onFirstPage: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
}

// Interface defining the expected properties for the mocked toolbar component.
interface MockToolbarProps {
  selectedCount: number;
  onDeleteSelected: () => void;
}

// Interface defining the expected properties for mocked modal components.
interface MockModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Mock the primary logic hook to control the state of the table container in tests.
vi.mock("@/features/dashboard/hooks/use-dashboard-table", () => ({
  useDashboardTable: vi.fn(),
}));

// Mock the presentation table component.
vi.mock("@/features/dashboard/components/dashboard-table", () => ({
  DashboardTable: () => <div data-testid="mock-dashboard-table" />,
}));

// Mock the pagination component to verify navigation callback execution and page state display.
vi.mock("@/features/dashboard/components/dashboard-table-pagination", () => ({
  DashboardTablePagination: (props: MockPaginationProps) => (
    <div data-testid="mock-pagination">
      <span data-testid="pagination-current-page">{props.currentPage}</span>
      <span data-testid="pagination-total-pages">{props.totalPages}</span>
      <button onClick={props.onFirstPage} data-testid="btn-first">
        First
      </button>
      <button onClick={props.onPreviousPage} data-testid="btn-prev">
        Prev
      </button>
      <button onClick={props.onNextPage} data-testid="btn-next">
        Next
      </button>
      <button onClick={props.onLastPage} data-testid="btn-last">
        Last
      </button>
    </div>
  ),
}));

// Mock the table toolbar to verify selected item counts and deletion triggers.
vi.mock("@/features/dashboard/components/dashboard-table-toolbar", () => ({
  DashboardTableToolbar: ({ selectedCount, onDeleteSelected }: MockToolbarProps) => (
    <div data-testid="mock-toolbar">
      <span data-testid="toolbar-selected-count">{selectedCount}</span>
      <button onClick={onDeleteSelected} data-testid="toolbar-delete-btn">
        Delete
      </button>
    </div>
  ),
}));

// Mock the case information modal to verify conditional rendering and visibility toggles.
vi.mock("@/features/cases/components/case-information-modal", () => ({
  CaseInformationModal: ({ isOpen, onOpenChange }: MockModalProps) =>
    isOpen ? (
      <div data-testid="mock-case-info-modal">
        <button onClick={() => onOpenChange(false)} data-testid="close-info-modal">
          Close
        </button>
      </div>
    ) : null,
}));

// Mock the deletion confirmation modal to verify conditional rendering and visibility toggles.
vi.mock("@/features/dashboard/components/delete-selected-case-modal", () => ({
  DeleteSelectedCaseModal: ({ isOpen, onOpenChange }: MockModalProps) =>
    isOpen ? (
      <div data-testid="mock-delete-modal">
        <button onClick={() => onOpenChange(false)} data-testid="close-delete-modal">
          Close
        </button>
      </div>
    ) : null,
}));

type UseDashboardTableReturn = ReturnType<typeof useDashboardTable>;

/**
 * Utility function to create a standardized mock return value for the `useDashboardTable` hook.
 */
const createMockHookReturn = (overrides: Partial<UseDashboardTableReturn> = {}) => {
  const tableMock = {
    getFilteredRowModel: vi.fn(() => ({ rows: { length: 25 } })),
    getState: vi.fn(() => ({ pagination: { pageIndex: 1 } })),
    getPageCount: vi.fn(() => 5),
    getCanPreviousPage: vi.fn(() => true),
    getCanNextPage: vi.fn(() => true),
    setPageIndex: vi.fn(),
    previousPage: vi.fn(),
    nextPage: vi.fn(),
  };

  return {
    table: tableMock,
    tableScrollRef: { current: null },
    rowSelection: {},
    infoModal: { isOpen: false, caseItem: null },
    deleteModal: { isOpen: false },
    selectedCases: [],
    handleDeleteSelected: vi.fn(),
    handleDeleteSuccess: vi.fn(),
    setInfoModal: vi.fn(),
    setDeleteModal: vi.fn(),
    rowCount: 25,
    globalFilter: "",
    columnVisibility: {},
    sorting: [],
    handleViewCase: vi.fn(),
    selectedCasesCount: 0,
    ...overrides,
  } as unknown as UseDashboardTableReturn;
};

/**
 * Test suite for the `DashboardTableContainer` component.
 */
describe("DashboardTableContainer", () => {
  const mockData: CaseData[] = [];
  const mockDateRange = undefined;

  /**
   * Test case to verify that the container correctly renders its three primary sub-components.
   */
  it("renders all core sub-components correctly", () => {
    // Arrange: Mock the hook to return a standard state.
    vi.mocked(useDashboardTable).mockReturnValue(createMockHookReturn());

    // Act: Render the table container.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);

    // Assert: Check for the presence of the toolbar, table, and pagination components.
    expect(screen.getByTestId("mock-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("mock-dashboard-table")).toBeInTheDocument();
    expect(screen.getByTestId("mock-pagination")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the selection count from the hook state is correctly displayed in the toolbar.
   */
  it("passes correct selection count to the toolbar", () => {
    // Arrange: Mock the hook with three selected rows.
    vi.mocked(useDashboardTable).mockReturnValue(
      createMockHookReturn({
        rowSelection: { "1": true, "2": true, "3": true },
      })
    );

    // Act: Render the container.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);

    // Assert: Verify the toolbar reflects the selection count.
    expect(screen.getByTestId("toolbar-selected-count")).toHaveTextContent("3");
  });

  /**
   * Test case to verify that pagination indices are transformed correctly for display (1-based vs 0-based).
   */
  it("calculates and passes pagination props correctly", () => {
    // Arrange: Mock hook where pageIndex is 1 (0-based, representing second page).
    vi.mocked(useDashboardTable).mockReturnValue(createMockHookReturn());

    // Act: Render the container.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);

    // Assert: Verify current page is 2 and total is 5.
    expect(screen.getByTestId("pagination-current-page")).toHaveTextContent("2");
    expect(screen.getByTestId("pagination-total-pages")).toHaveTextContent("5");
  });

  /**
   * Test case to verify that interaction with pagination buttons triggers the appropriate table instance methods.
   */
  it("handles pagination actions correctly", () => {
    // Arrange: Create a specific mock for table navigation methods.
    const tableMock = {
      setPageIndex: vi.fn(),
      previousPage: vi.fn(),
      nextPage: vi.fn(),
      getPageCount: vi.fn(() => 10),
      getFilteredRowModel: vi.fn(() => ({ rows: { length: 25 } })),
      getState: vi.fn(() => ({ pagination: { pageIndex: 1 } })),
      getCanPreviousPage: vi.fn(() => true),
      getCanNextPage: vi.fn(() => true),
    };

    vi.mocked(useDashboardTable).mockReturnValue(
      createMockHookReturn({ table: tableMock as unknown as UseDashboardTableReturn["table"] })
    );

    // Act: Render the component.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);

    // Act & Assert: Click each navigation button and verify the corresponding table method was called.
    screen.getByTestId("btn-first").click();
    expect(tableMock.setPageIndex).toHaveBeenCalledWith(0);

    screen.getByTestId("btn-prev").click();
    expect(tableMock.previousPage).toHaveBeenCalled();

    screen.getByTestId("btn-next").click();
    expect(tableMock.nextPage).toHaveBeenCalled();

    screen.getByTestId("btn-last").click();
    expect(tableMock.setPageIndex).toHaveBeenCalledWith(9);
  });

  /**
   * Test case to verify that the case information modal is visible when the hook state indicates it is open.
   */
  it("renders CaseInformationModal when isOpen is true", async () => {
    // Arrange: Mock the hook to state that the information modal is open for a specific case.
    vi.mocked(useDashboardTable).mockReturnValue(
      createMockHookReturn({
        infoModal: { isOpen: true, caseItem: { id: "1" } as unknown as Case },
      })
    );

    // Act: Render the container.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);

    // Assert: Verify the modal appears in the DOM.
    await waitFor(() => {
      expect(screen.getByTestId("mock-case-info-modal")).toBeInTheDocument();
    });

    screen.getByTestId("close-info-modal").click();
  });

  /**
   * Test case to verify that closing the information modal triggers the state update function.
   */
  it("updates info modal state on close", () => {
    // Arrange: Mock the setter function for the information modal.
    const setInfoModalMock = vi.fn();
    vi.mocked(useDashboardTable).mockReturnValue(
      createMockHookReturn({
        infoModal: { isOpen: true, caseItem: { id: "1" } as unknown as Case },
        setInfoModal: setInfoModalMock.mockImplementation((update) => {
          if (typeof update === "function") {
            update({ isOpen: true, caseItem: null });
          }
        }),
      })
    );

    // Act: Render the container and click the close button.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);
    screen.getByTestId("close-info-modal").click();

    // Assert: Verify the state setter was called.
    expect(setInfoModalMock).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the information modal is absent when the hook state indicates it is closed.
   */
  it("does not render CaseInformationModal when isOpen is false", () => {
    // Arrange: Mock hook with modal closed.
    vi.mocked(useDashboardTable).mockReturnValue(
      createMockHookReturn({
        infoModal: { isOpen: false, caseItem: null },
      })
    );

    // Act: Render the container.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);

    // Assert: Verify the modal is not present in the DOM.
    expect(screen.queryByTestId("mock-case-info-modal")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the deletion modal is visible when the hook state indicates it is open.
   */
  it("renders DeleteSelectedCaseModal when isOpen is true", async () => {
    // Arrange: Mock hook with delete modal open.
    vi.mocked(useDashboardTable).mockReturnValue(
      createMockHookReturn({
        deleteModal: { isOpen: true },
      })
    );

    // Act: Render the container.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);

    // Assert: Verify the deletion modal appears.
    await waitFor(() => {
      expect(screen.getByTestId("mock-delete-modal")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that closing the deletion modal triggers the state update function.
   */
  it("updates delete modal state on close", async () => {
    // Arrange: Mock the setter for the deletion modal.
    const setDeleteModalMock = vi.fn();
    vi.mocked(useDashboardTable).mockReturnValue(
      createMockHookReturn({
        deleteModal: { isOpen: true },
        setDeleteModal: setDeleteModalMock,
      })
    );

    // Act: Render and close the modal.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-delete-modal")).toBeInTheDocument();
    });

    screen.getByTestId("close-delete-modal").click();

    // Assert: Verify the setter was called with the closed state.
    expect(setDeleteModalMock).toHaveBeenCalledWith({ isOpen: false });
  });

  /**
   * Test case to verify that clicking the delete button in the toolbar triggers the bulk deletion handler.
   */
  it("triggers handleDeleteSelected when toolbar delete button is clicked", () => {
    // Arrange: Mock the bulk deletion handler.
    const handleDeleteSelectedMock = vi.fn();
    vi.mocked(useDashboardTable).mockReturnValue(
      createMockHookReturn({
        handleDeleteSelected: handleDeleteSelectedMock,
      })
    );

    // Act: Render and click the toolbar delete button.
    render(<DashboardTableContainer data={mockData} dateRange={mockDateRange} />);
    screen.getByTestId("toolbar-delete-btn").click();

    // Assert: Verify the handler was called.
    expect(handleDeleteSelectedMock).toHaveBeenCalled();
  });
});
