import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type CaseWithRelations, ResultsView } from "@/features/results/components/results-view";
import { useCaseData } from "@/features/results/hooks/use-case-data";
import { type ResultsState, useResultsStore } from "@/features/results/store/results-store";

// Mock the database to prevent direct persistence layer access during component testing.
vi.mock("@/db", () => ({
  db: {},
}));

// Mock the authentication module to isolate the view logic from session management.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock environmental variables to provide stable configuration values for the application URL.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock child components to verify they are rendered with the correct props without executing their full logic.
vi.mock("@/features/images/components/results-images", () => ({
  ResultsImages: () => <div data-testid="results-images" />,
}));

vi.mock("@/features/results/components/results-analysis", () => ({
  ResultsAnalysis: ({ isRecalculationNeeded }: { isRecalculationNeeded: boolean }) => (
    <div data-testid="results-analysis">Recalc Needed: {isRecalculationNeeded ? "Yes" : "No"}</div>
  ),
}));

vi.mock("@/features/results/components/results-details", () => ({
  ResultsDetails: () => <div data-testid="results-details" />,
}));

vi.mock("@/features/results/components/results-header", () => ({
  ResultsHeader: ({ onEditClick }: { onEditClick: () => void }) => (
    <div data-testid="results-header">
      <button onClick={onEditClick}>Edit Case</button>
    </div>
  ),
}));

vi.mock("@/features/results/components/results-header-skeleton", () => ({
  ResultsHeaderSkeleton: () => <div data-testid="header-skeleton" />,
}));

vi.mock("@/features/results/components/results-skeleton", () => ({
  ResultsDetailsSkeleton: () => <div data-testid="details-skeleton" />,
}));

// Mock hooks to simulate data loading states and global store interactions.
vi.mock("@/features/results/hooks/use-case-data");
vi.mock("@/features/results/store/results-store");

vi.mock("@/features/cases/components/edit-case-sheet", () => ({
  EditCaseSheet: () => <div data-testid="edit-case-sheet-real" />,
}));

// Mock dynamic imports to handle lazy-loaded components within a synchronous test environment.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    if (typeof loader === "function") {
      try {
        loader().catch(() => {});
      } catch {}
    }

    const MockSheet = ({
      isOpen,
      onOpenChange,
    }: {
      isOpen: boolean;
      onOpenChange: (open: boolean) => void;
    }) => {
      if (!isOpen) return null;
      return (
        <div data-testid="edit-case-sheet">
          <button onClick={() => onOpenChange(false)}>Close Sheet</button>
        </div>
      );
    };
    return MockSheet;
  },
}));

// Define initial mock data structure for a forensic case result.
const mockInitialData = {
  id: "case-123",
  recalculationNeeded: false,
  uploads: [],
  analysisResult: null,
} as unknown as CaseWithRelations;

/**
 * Test suite for the `ResultsView` component.
 */
describe("ResultsView", () => {
  // Set up default mock implementations before each test.
  beforeEach(() => {
    vi.mocked(useCaseData).mockReturnValue({
      data: mockInitialData,
      isLoading: false,
    } as unknown as ReturnType<typeof useCaseData>);

    vi.mocked(useResultsStore).mockImplementation((selector) =>
      selector({ pendingRecalculations: new Set() } as unknown as ResultsState)
    );
  });

  // Clear timers and mocks after each test to ensure test isolation.
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that loading skeletons are displayed while data is being fetched.
   */
  it("renders loading skeletons when isLoading is true", () => {
    // Arrange: Set the case data hook to an active loading state.
    vi.mocked(useCaseData).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useCaseData>);

    render(<ResultsView initialCaseData={mockInitialData} />);

    // Assert: Verify that skeletons are visible and actual content components are hidden.
    expect(screen.getByTestId("header-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("details-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("results-header")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the main dashboard components render once loading is complete.
   */
  it("renders main content when isLoading is false", () => {
    // Act: Render the component with completed loading state.
    render(<ResultsView initialCaseData={mockInitialData} />);

    // Assert: Check for the presence of the header, details, analysis, and image sections.
    expect(screen.getByTestId("results-header")).toBeInTheDocument();
    expect(screen.getByTestId("results-details")).toBeInTheDocument();
    expect(screen.getByTestId("results-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("results-images")).toBeInTheDocument();
    expect(screen.queryByTestId("header-skeleton")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that no recalculation is flagged when the database and store are in sync.
   */
  it("passes isRecalculationNeeded=false to analysis when DB and store are clear", () => {
    // Act: Render the component with default data.
    render(<ResultsView initialCaseData={mockInitialData} />);

    // Assert: Verify the analysis section receives a `false` flag.
    expect(screen.getByText("Recalc Needed: No")).toBeInTheDocument();
  });

  /**
   * Test case to verify that recalculation is flagged when the specific database property is set.
   */
  it("passes isRecalculationNeeded=true when DB flag is true", () => {
    // Arrange: Mock case data with an active recalculation flag.
    const dataWithRecalc = { ...mockInitialData, recalculationNeeded: true };
    vi.mocked(useCaseData).mockReturnValue({
      data: dataWithRecalc,
      isLoading: false,
    } as unknown as ReturnType<typeof useCaseData>);

    render(<ResultsView initialCaseData={dataWithRecalc} />);

    // Assert: Verify the analysis section receives a `true` flag.
    expect(screen.getByText("Recalc Needed: Yes")).toBeInTheDocument();
  });

  /**
   * Test case to verify that recalculation is flagged when the global store tracks a pending update.
   */
  it("passes isRecalculationNeeded=true when store has pending recalculation", () => {
    // Arrange: Mock the results store to include the current `caseId` in pending recalculations.
    vi.mocked(useResultsStore).mockImplementation((selector) =>
      selector({ pendingRecalculations: new Set(["case-123"]) } as unknown as ResultsState)
    );

    render(<ResultsView initialCaseData={mockInitialData} />);

    // Assert: Verify that store state correctly overrides the database value for UI feedback.
    expect(screen.getByText("Recalc Needed: Yes")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the case modification sheet appears upon user interaction.
   */
  it("opens the edit sheet when Edit button in header is clicked", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<ResultsView initialCaseData={mockInitialData} />);

    // Assert: Verify the edit sheet is initially hidden.
    expect(screen.queryByTestId("edit-case-sheet")).not.toBeInTheDocument();

    // Act: Click the "Edit Case" trigger in the header.
    const editButton = screen.getByText("Edit Case");
    await user.click(editButton);

    // Assert: Verify the sheet is displayed.
    expect(screen.getByTestId("edit-case-sheet")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the interface state handles the delay required for exit animations when closing sheets.
   */
  it("handles the sheet unmount animation delay correctly", () => {
    // Arrange: Enable fake timers to control asynchronous state transitions.
    vi.useFakeTimers();
    render(<ResultsView initialCaseData={mockInitialData} />);

    // Act: Open the sheet.
    fireEvent.click(screen.getByText("Edit Case"));
    expect(screen.getByTestId("edit-case-sheet")).toBeInTheDocument();

    // Act: Close the sheet.
    const closeButton = screen.getByText("Close Sheet");
    fireEvent.click(closeButton);

    // Act: Advance time past the internal unmounting timeout.
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Assert: Verify the sheet is removed from the DOM after the animation grace period.
    expect(screen.queryByTestId("edit-case-sheet")).not.toBeInTheDocument();
  });
});
