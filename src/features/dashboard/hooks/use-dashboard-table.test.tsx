import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboardTable } from "@/features/dashboard/hooks/use-dashboard-table";
import { type CaseData } from "@/features/dashboard/schemas/dashboard";
import { getCaseById } from "@/features/results/actions/get-case-by-id";

// Mock the server action for fetching detailed case information by identifier.
vi.mock("@/features/results/actions/get-case-by-id", () => ({
  getCaseById: vi.fn(),
}));

// Mock the table column definitions used by the dashboard table hook.
vi.mock("@/features/dashboard/components/dashboard-table-columns", () => ({
  DashboardTableColumns: [
    {
      accessorKey: "caseName",
      header: "Case Name",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      accessorKey: "caseDate",
      header: "Date",
    },
  ],
}));

// Provide a standard set of mock case data for testing table logic.
const mockData = [
  {
    caseId: "1",
    caseName: "Case Alpha",
    caseDate: new Date("2025-01-10T10:00:00Z"),
    status: "active",
  },
  {
    caseId: "2",
    caseName: "Case Beta",
    caseDate: new Date("2025-01-15T10:00:00Z"),
    status: "active",
  },
  {
    caseId: "3",
    caseName: "Case Gamma",
    caseDate: new Date("2025-01-20T10:00:00Z"),
    status: "draft",
  },
];

/**
 * Test suite for the `useDashboardTable` hook which manages table state, filtering, and interactions.
 */
describe("useDashboardTable", () => {
  // Clear all mock call history before each test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the table initializes with the full dataset when no date range filter is applied.
   */
  it("initializes with full data when no date range is provided", () => {
    // Arrange: Render the hook without a date range.
    const { result } = renderHook(() =>
      useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
    );

    // Assert: Verify that all three rows are present in the table model.
    expect(result.current.table.getRowModel().rows).toHaveLength(3);
    expect(result.current.rowCount).toBe(3);
  });

  /**
   * Test case to verify that the table correctly filters rows based on a specified date range.
   */
  it("filters data correctly based on date range", () => {
    // Arrange: Define a date range that should only include one mock case.
    const dateRange = {
      from: new Date("2025-01-01"),
      to: new Date("2025-01-12"),
    };

    // Act: Render the hook with the filtering range.
    const { result } = renderHook(() =>
      useDashboardTable({ data: mockData as unknown as CaseData[], dateRange })
    );

    // Assert: Verify only the row falling within the range is returned.
    expect(result.current.table.getRowModel().rows).toHaveLength(1);
    expect(result.current.table.getRowModel().rows[0].original.caseName).toBe("Case Alpha");
  });

  /**
   * Test case to verify that row selection updates internal state and mapped case data.
   */
  it("updates row selection and selectedCases state", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
    );

    // Act: Select the first and third rows via the table API.
    act(() => {
      result.current.table.setRowSelection({ "0": true, "2": true });
    });

    // Assert: Verify state reflects selected indices and correctly maps to case metadata.
    expect(result.current.rowSelection).toEqual({ "0": true, "2": true });
    expect(result.current.selectedCases).toEqual([
      { id: "1", name: "Case Alpha" },
      { id: "3", name: "Case Gamma" },
    ]);
  });

  /**
   * Test case to ensure that non-existent row indices are handled safely during selection updates.
   */
  it("filters out invalid row selections", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
    );

    // Act: Attempt to select a row index that does not exist in the data.
    act(() => {
      result.current.table.setRowSelection({ "99": true });
    });

    // Assert: Verify that the `selectedCases` array remains empty.
    expect(result.current.selectedCases).toEqual([]);
  });

  /**
   * Test case to verify that global text filtering correctly narrows the row model.
   */
  it("handles global filtering", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
    );

    // Act: Apply a search filter for "Beta".
    act(() => {
      result.current.table.setGlobalFilter("Beta");
    });

    // Assert: Verify the table model filters down to the matching case.
    expect(result.current.globalFilter).toBe("Beta");
    expect(result.current.table.getRowModel().rows).toHaveLength(1);
    expect(result.current.table.getRowModel().rows[0].original.caseName).toBe("Case Beta");
  });

  /**
   * Test case to ensure the global filter logic handles null values in the dataset without crashing.
   */
  it("safely handles null values in global filter", () => {
    // Arrange: Inject a record containing a null `caseName`.
    const dataWithNull = [
      ...mockData,
      {
        caseId: "4",
        caseName: null,
        caseDate: new Date(),
        status: "active",
      },
    ];

    const { result } = renderHook(() =>
      useDashboardTable({ data: dataWithNull as unknown as CaseData[], dateRange: undefined })
    );

    // Act: Trigger the search filter.
    act(() => {
      result.current.table.setGlobalFilter("Alpha");
    });

    // Assert: Verify that validation logic correctly identifies only the one matching record.
    expect(result.current.rowCount).toBe(1);
  });

  /**
   * Test case to verify that the delete confirmation modal is triggered.
   */
  it("opens delete modal when handleDeleteSelected is called", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
    );

    // Act: Call the deletion handler.
    act(() => {
      result.current.handleDeleteSelected();
    });

    // Assert: Verify the delete modal state is set to open.
    expect(result.current.deleteModal.isOpen).toBe(true);
  });

  /**
   * Test case to verify that row selection is cleared upon successful deletion.
   */
  it("clears selection when handleDeleteSuccess is called", () => {
    // Arrange: Render the hook and select a row.
    const { result } = renderHook(() =>
      useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
    );

    act(() => {
      result.current.table.setRowSelection({ "0": true });
    });

    expect(result.current.selectedCases).toHaveLength(1);

    // Act: Trigger the success callback.
    act(() => {
      result.current.handleDeleteSuccess();
    });

    // Assert: Verify that selection state is reset.
    expect(result.current.rowSelection).toEqual({});
    expect(result.current.selectedCases).toHaveLength(0);
  });

  /**
   * Test group for viewing case details and calculating summary statuses.
   */
  describe("handleViewCase", () => {
    /**
     * Test case to verify the calculation of a 'verified' status when all detections are user-confirmed.
     */
    it("fetches case data and calculates status as 'verified'", async () => {
      // Arrange: Define mock case details where every detection has a confirmed status.
      const mockCaseDetails = {
        id: "1",
        uploads: [
          {
            detections: [{ status: "user_confirmed" }, { status: "user_edited_confirmed" }],
          },
        ],
      };

      vi.mocked(getCaseById).mockResolvedValue(
        mockCaseDetails as unknown as Awaited<ReturnType<typeof getCaseById>>
      );

      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      // Act: Execute the view case logic.
      await act(async () => {
        await result.current.handleViewCase("1");
      });

      // Assert: Verify that the computed status and counts match expectations for fully verified data.
      expect(getCaseById).toHaveBeenCalledWith("1");
      expect(result.current.infoModal.isOpen).toBe(true);
      expect(result.current.infoModal.caseItem).toEqual(
        expect.objectContaining({
          verificationStatus: "verified",
          totalDetections: 2,
          verifiedDetections: 2,
        })
      );
    });

    /**
     * Test case to verify the calculation of an 'unverified' status when detections are model-only.
     */
    it("calculates status as 'unverified' when all detections are model generated", async () => {
      // Arrange: Define mock details with only model-generated detections.
      const mockCaseDetails = {
        id: "1",
        uploads: [
          {
            detections: [{ status: "model_generated" }],
          },
        ],
      };

      vi.mocked(getCaseById).mockResolvedValue(
        mockCaseDetails as unknown as Awaited<ReturnType<typeof getCaseById>>
      );

      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      // Act: Execute the view case logic.
      await act(async () => {
        await result.current.handleViewCase("1");
      });

      // Assert: Verify the computed status reflects a total lack of verification.
      expect(result.current.infoModal.caseItem).toEqual(
        expect.objectContaining({
          verificationStatus: "unverified",
          totalDetections: 1,
          verifiedDetections: 0,
        })
      );
    });

    /**
     * Test case to verify the calculation of 'in_progress' when verification status is mixed.
     */
    it("calculates status as 'in_progress' when statuses are mixed", async () => {
      // Arrange: Define mock details with both confirmed and model-generated detections.
      const mockCaseDetails = {
        id: "1",
        uploads: [
          {
            detections: [{ status: "model_generated" }, { status: "user_confirmed" }],
          },
        ],
      };

      vi.mocked(getCaseById).mockResolvedValue(
        mockCaseDetails as unknown as Awaited<ReturnType<typeof getCaseById>>
      );

      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      // Act: Execute the view case logic.
      await act(async () => {
        await result.current.handleViewCase("1");
      });

      // Assert: Verify the status reflects partial completion.
      expect(result.current.infoModal.caseItem).toEqual(
        expect.objectContaining({
          verificationStatus: "in_progress",
          totalDetections: 2,
          verifiedDetections: 1,
        })
      );
    });

    /**
     * Test case to verify the status when no detections exist in the case.
     */
    it("calculates status as 'no_detections' when uploads have no detections", async () => {
      // Arrange: Define mock details with empty detections.
      const mockCaseDetails = {
        id: "1",
        uploads: [
          {
            detections: [],
          },
        ],
      };

      vi.mocked(getCaseById).mockResolvedValue(
        mockCaseDetails as unknown as Awaited<ReturnType<typeof getCaseById>>
      );

      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      // Act: Execute the view case logic.
      await act(async () => {
        await result.current.handleViewCase("1");
      });

      // Assert: Verify the fallback status is applied.
      expect(result.current.infoModal.caseItem).toEqual(
        expect.objectContaining({
          verificationStatus: "no_detections",
          totalDetections: 0,
          verifiedDetections: 0,
        })
      );
    });

    /**
     * Test case to verify error handling and logging when the network request fails.
     */
    it("logs error if fetch fails", async () => {
      // Arrange: Spy on the console error method and mock a rejected promise.
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(getCaseById).mockRejectedValue(new Error("Fetch failed"));

      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      // Act: Execute the view case logic.
      await act(async () => {
        await result.current.handleViewCase("1");
      });

      // Assert: Verify the error was logged and the modal remained closed.
      expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch case data:", expect.any(Error));
      expect(result.current.infoModal.isOpen).toBe(false);

      consoleSpy.mockRestore();
    });

    /**
     * Test case to ensure the hook handles null responses from the server gracefully.
     */
    it("does nothing if fetched case data is null", async () => {
      // Arrange: Mock the fetch action to return null.
      vi.mocked(getCaseById).mockResolvedValue(
        null as unknown as Awaited<ReturnType<typeof getCaseById>>
      );

      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      // Act: Attempt to view the case.
      await act(async () => {
        await result.current.handleViewCase("1");
      });

      // Assert: Verify the modal does not open.
      expect(result.current.infoModal.isOpen).toBe(false);
    });
  });

  /**
   * Test case to ensure table updates do not fail when the scroll reference is missing.
   */
  it("handles scroll effect gracefully when ref is null", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
    );

    // Act: Update filter state without setting a container ref.
    act(() => {
      result.current.table.setGlobalFilter("Test");
    });

    // Assert: Verify the state was updated despite the lack of a scroll target.
    expect(result.current.globalFilter).toBe("Test");
  });

  /**
   * Test group for automated table horizontal scrolling behavior.
   */
  describe("auto-scroll behavior", () => {
    // Enable fake timers to control the debounced scroll logic.
    beforeEach(() => {
      vi.useFakeTimers();
    });

    // Restore real timers after each test.
    afterEach(() => {
      vi.useRealTimers();
    });

    /**
     * Test case to verify scrolling to the center of the container when no results match a search.
     */
    it("scrolls to center when there are no results", () => {
      // Arrange: Mock the container and its dimensions.
      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      const scrollToMock = vi.fn();
      const mockContainer = {
        scrollWidth: 1000,
        clientWidth: 500,
        scrollTo: scrollToMock,
        querySelector: vi.fn(),
      } as unknown as HTMLDivElement;

      Object.defineProperty(result.current.tableScrollRef, "current", {
        writable: true,
        value: mockContainer,
      });

      // Act: Filter to zero results and run timers.
      act(() => {
        result.current.table.setGlobalFilter("NonExistentCase");
      });

      expect(result.current.rowCount).toBe(0);

      act(() => {
        vi.runAllTimers();
      });

      // Assert: Verify the container scrolled to the horizontal midpoint.
      expect(scrollToMock).toHaveBeenCalledWith({ left: 250, behavior: "smooth" });
    });

    /**
     * Test case to verify scrolling back to the start when a search filter is cleared.
     */
    it("scrolls to start when results exist but no search filter", () => {
      // Arrange: Mock the container.
      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      const scrollToMock = vi.fn();
      const mockContainer = {
        scrollWidth: 1000,
        clientWidth: 500,
        scrollTo: scrollToMock,
        querySelector: vi.fn(),
      } as unknown as HTMLDivElement;

      Object.defineProperty(result.current.tableScrollRef, "current", {
        writable: true,
        value: mockContainer,
      });

      // Act: Set and then clear the global filter.
      act(() => {
        result.current.table.setGlobalFilter("Temp");
      });
      act(() => {
        result.current.table.setGlobalFilter("");
      });

      // Assert: Verify the container scrolled back to the left.
      expect(scrollToMock).toHaveBeenCalledWith({ left: 0, behavior: "smooth" });
    });

    /**
     * Test case to verify scrolling to a specific highlighted cell when a search match is found.
     */
    it("scrolls to highlighted element when global filter is active and matches", () => {
      // Arrange: Mock the container and a nested highlighted element.
      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      const scrollToMock = vi.fn();
      const mockHighlight = {
        getBoundingClientRect: () => ({
          left: 300,
          width: 50,
        }),
      } as unknown as Element;

      const mockContainer = {
        scrollWidth: 1000,
        clientWidth: 500,
        scrollLeft: 100,
        scrollTo: scrollToMock,
        querySelector: vi.fn().mockReturnValue(mockHighlight),
        getBoundingClientRect: () => ({
          left: 50,
        }),
      } as unknown as HTMLDivElement;

      Object.defineProperty(result.current.tableScrollRef, "current", {
        writable: true,
        value: mockContainer,
      });

      // Act: Apply filter and run timers.
      act(() => {
        result.current.table.setGlobalFilter("Alpha");
      });

      expect(result.current.rowCount).toBeGreaterThan(0);

      act(() => {
        vi.runAllTimers();
      });

      // Assert: Verify the specific highlight class was queried and calculated scroll position was reached.
      expect(mockContainer.querySelector).toHaveBeenCalledWith(".bg-emerald-200");
      expect(scrollToMock).toHaveBeenCalledWith({ left: 125, behavior: "smooth" });
    });

    /**
     * Test case to ensure no scroll occurs if the highlight element cannot be located in the DOM.
     */
    it("does not scroll if highlighted element is not found", () => {
      // Arrange: Mock the container but return null for the highlight selector.
      const { result } = renderHook(() =>
        useDashboardTable({ data: mockData as unknown as CaseData[], dateRange: undefined })
      );

      const scrollToMock = vi.fn();
      const mockContainer = {
        scrollTo: scrollToMock,
        querySelector: vi.fn().mockReturnValue(null),
        scrollWidth: 1000,
        clientWidth: 500,
      } as unknown as HTMLDivElement;

      Object.defineProperty(result.current.tableScrollRef, "current", {
        writable: true,
        value: mockContainer,
      });

      // Act: Apply filter and run timers.
      act(() => {
        result.current.table.setGlobalFilter("Alpha");
      });

      expect(result.current.rowCount).toBeGreaterThan(0);

      act(() => {
        vi.runAllTimers();
      });

      // Assert: Verify that no scroll attempt was made since the target element was missing.
      expect(mockContainer.querySelector).toHaveBeenCalledWith(".bg-emerald-200");
      expect(scrollToMock).not.toHaveBeenCalled();
    });
  });
});
