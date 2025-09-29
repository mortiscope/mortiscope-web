import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResultsHeader } from "@/features/results/components/results-header";
import { type Case } from "@/features/results/components/results-preview";
import { useRecalculationPoller } from "@/features/results/hooks/use-recalculation-poller";
import { type ResultsState, useResultsStore } from "@/features/results/store/results-store";
import { type LayoutState, useLayoutStore } from "@/stores/layout-store";

// Mock Next.js navigation hooks to control routing and parameter access during testing.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useParams: vi.fn(),
    useRouter: vi.fn(),
  };
});

// Mock React Query to provide a controlled environment for query client interactions and invalidations.
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: vi.fn(),
    QueryClientProvider: actual.QueryClientProvider,
  };
});

// Mock the recalculation poller hook to simulate background status checking.
vi.mock("@/features/results/hooks/use-recalculation-poller", () => ({
  useRecalculationPoller: vi.fn(),
}));

// Mock the results store to control flags related to pending recalculation states.
vi.mock("@/features/results/store/results-store", () => ({
  useResultsStore: vi.fn(),
}));

// Mock the layout store to verify how header content is dynamically injected.
vi.mock("@/stores/layout-store", () => ({
  useLayoutStore: vi.fn(),
}));

// Mock the recalculate button to simplify interactions within the header.
vi.mock("@/features/results/components/results-recalculate-button", () => ({
  ResultsRecalculateButton: vi.fn(({ onClick, isDisabled }) => (
    <button data-testid="recalculate-button" onClick={onClick} disabled={isDisabled}>
      Recalculate
    </button>
  )),
}));

// Mock the recalculate modal to simulate the user confirming a recalculation action.
vi.mock("@/features/results/components/results-recalculate-modal", () => ({
  ResultsRecalculateModal: vi.fn(({ isOpen, onOpenChange, onRecalculationStart }) =>
    isOpen ? (
      <div data-testid="recalculate-modal">
        <p>Recalculate Modal</p>
        <button
          onClick={() => {
            onRecalculationStart();
            onOpenChange(false);
          }}
        >
          Start Recalculation
        </button>
      </div>
    ) : null
  ),
}));

// Mock the edit case button to verify that the edit workflow can be triggered.
vi.mock("@/features/cases/components/edit-case-button", () => ({
  EditCaseButton: vi.fn(({ onClick }) => (
    <button data-testid="edit-case-button" onClick={onClick}>
      Edit Case
    </button>
  )),
}));

// Mock the export dropdown to verify its presence in the header.
vi.mock("@/features/export/components/export-dropdown", () => ({
  ExportDropdown: vi.fn(() => <div data-testid="export-dropdown">Export Dropdown</div>),
}));

// Mock the toast system to verify success and error notifications.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Provide standard case data for consistent testing of header details and flags.
const mockCaseData: Case = {
  id: "case-123",
  userId: "user-mortiscope-123",
  status: "active",
  caseName: "Mortiscope Case",
  temperatureCelsius: 25.5,
  locationRegion: "Region IV-A",
  locationProvince: "Laguna",
  locationCity: "Santa Rosa",
  locationBarangay: "Balibago",
  caseDate: new Date("2025-10-20T10:00:00Z"),
  createdAt: new Date("2025-10-19T10:00:00Z"),
  notes: "Sample case notes.",
  uploads: [],
  recalculationNeeded: false,
  verificationStatus: "verified",
  hasDetections: true,
  totalDetections: 5,
  verifiedDetections: 5,
  analysisResult: {
    caseId: "case-123",
    status: "completed",
    totalCounts: null,
    oldestStageDetected: "adult",
    pmiSourceImageKey: "img1",
    pmiDays: 2.5,
    pmiHours: 60,
    pmiMinutes: 3600,
    stageUsedForCalculation: "adult",
    temperatureProvided: 25.5,
    calculatedAdh: 1200,
    ldtUsed: 10,
    explanation: "PMI calculation complete.",
    updatedAt: new Date("2025-10-21T10:00:00Z"),
  },
};

const mockSetHeaderAdditionalContent = vi.fn();
const mockClearHeaderAdditionalContent = vi.fn();
const mockClearRecalculationFlag = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockRouterRefresh = vi.fn();

const mockQueryClient = {
  invalidateQueries: mockInvalidateQueries,
  getQueryData: vi.fn(() => mockCaseData),
} as unknown as QueryClient;

/**
 * Creates a generic wrapper for component rendering.
 */
const createWrapper = (): React.FC<{ children: React.ReactNode }> => {
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wrapper">{children}</div>
  );
  return TestWrapper;
};

/**
 * Helper function to mock the results store with custom state overrides.
 */
const mockStoreImplementation = (overrides: Record<string, unknown> = {}) => {
  const store = {
    clearRecalculationFlag: mockClearRecalculationFlag,
    pendingRecalculations: new Set(),
    ...overrides,
  } as unknown as ResultsState;

  vi.mocked(useResultsStore).mockImplementation(<T,>(selector?: (state: ResultsState) => T) => {
    if (selector) return selector(store);
    return store as unknown as T;
  });
};

/**
 * Test suite for the `ResultsHeader` component.
 */
describe("ResultsHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(useParams).mockReturnValue({ resultsId: mockCaseData.id });
    vi.mocked(useRouter).mockReturnValue({
      refresh: mockRouterRefresh,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useQueryClient).mockReturnValue(mockQueryClient);

    const layoutStoreState = {
      setHeaderAdditionalContent: mockSetHeaderAdditionalContent,
      clearHeaderAdditionalContent: mockClearHeaderAdditionalContent,
    };

    vi.mocked(useLayoutStore).mockImplementation(<T,>(selector?: (state: LayoutState) => T) => {
      if (selector) return selector(layoutStoreState as unknown as LayoutState);
      return layoutStoreState as unknown as T;
    });

    mockStoreImplementation();

    vi.mocked(useRecalculationPoller).mockImplementation(({ enabled, onSuccess }) => {
      if (enabled && onSuccess) {
        setTimeout(() => onSuccess(), 100);
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that header content is registered and cleaned up based on lifecycle.
   */
  it("sets and clears header additional content on mount and unmount", () => {
    // Arrange: Render the header.
    const { unmount } = render(<ResultsHeader caseData={mockCaseData} />, {
      wrapper: createWrapper(),
    });

    // Assert: Verify that content was registered on mount.
    expect(mockSetHeaderAdditionalContent).toHaveBeenCalledOnce();
    expect(mockSetHeaderAdditionalContent.mock.calls[0][0]).toEqual(expect.any(Object));

    // Act: Unmount the component.
    unmount();

    // Assert: Verify that content was cleared from the global header.
    expect(mockClearHeaderAdditionalContent).toHaveBeenCalledOnce();
  });

  /**
   * Test case to verify that the intended action buttons are present in the header portal.
   */
  it("renders EditCaseButton and ExportDropdown in the header content", () => {
    // Arrange: Render the header.
    render(<ResultsHeader caseData={mockCaseData} />, {
      wrapper: createWrapper(),
    });

    // Act: Extract the content sent to the portal and render it locally.
    const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
    render(headerContent);

    // Assert: Check for action components.
    expect(screen.getByTestId("edit-case-button")).toBeInTheDocument();
    expect(screen.getByTestId("export-dropdown")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the edit callback is triggered correctly.
   */
  it("triggers onEditClick when EditCaseButton is clicked", () => {
    // Arrange: Mock the callback and render.
    const mockOnEditClick = vi.fn();
    render(<ResultsHeader caseData={mockCaseData} onEditClick={mockOnEditClick} />, {
      wrapper: createWrapper(),
    });

    // Act: Simulate a click on the edit button within the header content.
    const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
    render(headerContent);
    fireEvent.click(screen.getByTestId("edit-case-button"));

    // Assert: Verify callback execution.
    expect(mockOnEditClick).toHaveBeenCalledOnce();
  });

  /**
   * Sub-suite for testing the complex PMI recalculation state machine.
   */
  describe("Recalculation Logic", () => {
    /**
     * Test case to verify the button is disabled when data is up-to-date.
     */
    it("RecalculateButton is disabled when no recalculation is needed and no pending changes", () => {
      // Arrange: Configure data and store to indicate no changes.
      const caseDataNoRecalc = { ...mockCaseData, recalculationNeeded: false };
      mockStoreImplementation({
        pendingRecalculations: new Set(),
      });

      render(<ResultsHeader caseData={caseDataNoRecalc} />, {
        wrapper: createWrapper(),
      });

      // Act: Render header portal content.
      const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
      render(headerContent);

      // Assert: Verify disabled state.
      expect(screen.getByTestId("recalculate-button")).toBeDisabled();
    });

    /**
     * Test case to verify the button is enabled when the backend flag is set.
     */
    it("RecalculateButton is enabled when recalculationNeeded is true", () => {
      // Arrange: Provide data where recalculation is required.
      const caseDataNeeded = { ...mockCaseData, recalculationNeeded: true };
      render(<ResultsHeader caseData={caseDataNeeded} />, {
        wrapper: createWrapper(),
      });

      // Act: Render header portal content.
      const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
      render(headerContent);

      // Assert: Verify enabled state.
      expect(screen.getByTestId("recalculate-button")).toBeEnabled();
    });

    /**
     * Test case to verify the button is enabled based on local store state.
     */
    it("RecalculateButton is enabled when pendingRecalculations contains caseId", () => {
      // Arrange: Set store state to show a pending recalculation for this case.
      mockStoreImplementation({
        pendingRecalculations: new Set(["case-123"]),
      });

      const caseDataNoRecalc = { ...mockCaseData, recalculationNeeded: false };
      render(<ResultsHeader caseData={caseDataNoRecalc} />, {
        wrapper: createWrapper(),
      });

      // Act: Render header portal content.
      const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
      render(headerContent);

      // Assert: Verify enabled state based on store.
      expect(screen.getByTestId("recalculate-button")).toBeEnabled();
    });

    /**
     * Test case to verify the confirmation modal appears.
     */
    it("opens modal and sets polling on button click", () => {
      // Arrange: Render header with enabled recalculation.
      const caseDataNeeded = { ...mockCaseData, recalculationNeeded: true };
      render(<ResultsHeader caseData={caseDataNeeded} />, {
        wrapper: createWrapper(),
      });

      // Act: Trigger recalculation flow.
      const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
      render(
        <>
          {headerContent}
          <ResultsHeader caseData={caseDataNeeded} />
        </>
      );

      const button = screen.getByTestId("recalculate-button");
      fireEvent.click(button);

      // Assert: Verify modal visibility.
      expect(screen.getByTestId("recalculate-modal")).toBeInTheDocument();
    });

    /**
     * Test case to verify that the local flag is cleared when a new recalculation starts.
     */
    it("clears local pending flag when recalculation starts", () => {
      // Arrange: Render header and open modal.
      const caseDataNeeded = { ...mockCaseData, recalculationNeeded: true };
      render(<ResultsHeader caseData={caseDataNeeded} />, {
        wrapper: createWrapper(),
      });

      const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
      render(
        <>
          {headerContent}
          <ResultsHeader caseData={caseDataNeeded} />
        </>
      );

      // Act: Start recalculation from the modal.
      const button = screen.getByTestId("recalculate-button");
      fireEvent.click(button);
      const modal = screen.getByTestId("recalculate-modal");
      fireEvent.click(within(modal).getByText("Start Recalculation"));

      // Assert: Verify store cleanup for the specific `caseId`.
      expect(mockClearRecalculationFlag).toHaveBeenCalledWith("case-123");
    });

    /**
     * Test case to verify the full success sequence: toast, store update, query invalidation, and refresh.
     */
    it("handles poller success by showing toast, invalidating queries, and refreshing", async () => {
      // Arrange: Setup recalculation flow.
      const caseDataNeeded = { ...mockCaseData, recalculationNeeded: true };
      render(<ResultsHeader caseData={caseDataNeeded} />, {
        wrapper: createWrapper(),
      });

      const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
      const { rerender } = render(
        <>
          {headerContent}
          <ResultsHeader caseData={caseDataNeeded} />
        </>
      );

      // Act: Trigger and complete recalculation.
      fireEvent.click(screen.getByTestId("recalculate-button"));
      const modal = screen.getByTestId("recalculate-modal");
      fireEvent.click(within(modal).getByText("Start Recalculation"));

      rerender(
        <>
          {headerContent}
          <ResultsHeader caseData={caseDataNeeded} />
        </>
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Assert: Verify immediate success feedback.
      await vi.waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          `${mockCaseData.caseName} recalculation completed.`
        );
        expect(mockClearRecalculationFlag).toHaveBeenCalledWith(mockCaseData.id);
      });

      act(() => {
        vi.advanceTimersByTime(800);
      });

      // Assert: Verify all related cache keys are invalidated.
      const expectedQueryKeys = [
        ["case", mockCaseData.id],
        ["recalculationStatus", mockCaseData.id],
        ["cases"],
        ["caseHistory", mockCaseData.id],
        ["dashboard-cases"],
        ["forensic-insights"],
        ["verification-status"],
        ["quality-metrics"],
      ];

      await vi.waitFor(() => {
        for (const key of expectedQueryKeys) {
          expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: key });
        }
      });

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Assert: Verify router refresh is triggered after a delay.
      await vi.waitFor(() => {
        expect(mockRouterRefresh).toHaveBeenCalledOnce();
      });
    });

    /**
     * Test case to verify retry logic if the cache still shows the flag after the first invalidation.
     */
    it("attempts query invalidation retry if recalculationNeeded is still true in fresh data", async () => {
      // Arrange: Mock cache to return outdated flag after success.
      const caseDataNeeded = { ...mockCaseData, recalculationNeeded: true };
      vi.mocked(mockQueryClient.getQueryData).mockReturnValueOnce({
        ...mockCaseData,
        recalculationNeeded: true,
      } as typeof mockCaseData);

      render(<ResultsHeader caseData={caseDataNeeded} />, {
        wrapper: createWrapper(),
      });

      const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
      const { rerender } = render(
        <>
          {headerContent}
          <ResultsHeader caseData={caseDataNeeded} />
        </>
      );

      // Act: Run recalculation logic.
      fireEvent.click(screen.getByTestId("recalculate-button"));
      const modal = screen.getByTestId("recalculate-modal");
      fireEvent.click(within(modal).getByText("Start Recalculation"));

      rerender(
        <>
          {headerContent}
          <ResultsHeader caseData={caseDataNeeded} />
        </>
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });

      // Assert: Verify initial batch of invalidations.
      await vi.waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledTimes(8);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Assert: Verify a second batch of invalidations due to the stale cache flag.
      await vi.waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledTimes(16);
      });
    });

    /**
     * Test case to verify that retries stop once the cache is verified as clean.
     */
    it("stops invalidation retry if fresh data shows recalculationNeeded is false", async () => {
      // Arrange: Mock cache to show flag is resolved.
      const caseDataNeeded = { ...mockCaseData, recalculationNeeded: true };
      vi.mocked(mockQueryClient.getQueryData).mockReturnValueOnce({
        ...mockCaseData,
        recalculationNeeded: false,
      } as typeof mockCaseData);

      render(<ResultsHeader caseData={caseDataNeeded} />, {
        wrapper: createWrapper(),
      });

      const headerContent = mockSetHeaderAdditionalContent.mock.calls[0][0];
      const { rerender } = render(
        <>
          {headerContent}
          <ResultsHeader caseData={caseDataNeeded} />
        </>
      );

      // Act: Run recalculation logic.
      fireEvent.click(screen.getByTestId("recalculate-button"));
      const modal = screen.getByTestId("recalculate-modal");
      fireEvent.click(within(modal).getByText("Start Recalculation"));

      rerender(
        <>
          {headerContent}
          <ResultsHeader caseData={caseDataNeeded} />
        </>
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        vi.advanceTimersByTime(800);
      });

      // Assert: Verify initial invalidation.
      await vi.waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledTimes(8);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Assert: Verify no further invalidations occurred.
      await vi.waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledTimes(8);
      });
    });
  });

  /**
   * Test case to verify the component handles scenarios where the URL parameter is missing.
   */
  it("handles missing resultsId gracefully", () => {
    // Arrange: Mock empty route parameters.
    vi.mocked(useParams).mockReturnValue({});

    render(<ResultsHeader caseData={mockCaseData} />, {
      wrapper: createWrapper(),
    });

    // Assert: Verify that no header content was registered.
    expect(mockSetHeaderAdditionalContent).not.toHaveBeenCalled();
  });
});
