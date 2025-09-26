import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CaseList } from "@/features/results/components/case-list";
import { type Case } from "@/features/results/components/results-preview";

// Mock the framer-motion library to simplify the component tree and focus on layout logic.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="case-list-container" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock the `CaseItem` component to verify prop delegation and ref forwarding.
vi.mock("@/features/results/components/case-item", () => {
  const MockCaseItem = React.forwardRef(
    (props: { caseItem: Case; viewMode: string }, ref: React.Ref<HTMLInputElement>) => (
      <div
        data-testid={`case-item-${props.caseItem.id}`}
        data-viewmode={props.viewMode}
        ref={ref as React.RefObject<HTMLDivElement>}
      >
        {props.caseItem.caseName}
      </div>
    )
  );
  MockCaseItem.displayName = "CaseItem";
  return { CaseItem: MockCaseItem };
});

/**
 * Test suite for the `CaseList` component.
 */
describe("CaseList", () => {
  // Define a complete mock analysis result object for a completed case.
  const mockAnalysisResult = {
    caseId: "case-1",
    status: "completed" as const,
    updatedAt: new Date(),
    totalCounts: {},
    oldestStageDetected: "adult",
    pmiSourceImageKey: "key",
    pmiDays: 0,
    pmiHours: 0,
    pmiMinutes: 0,
    stageUsedForCalculation: "adult",
    temperatureProvided: 25,
    calculatedAdh: 100,
    ldtUsed: 10,
    explanation: "Analysis complete",
  };

  // Define a collection of mock cases to test list iteration.
  const mockCases: Case[] = [
    {
      id: "case-1",
      caseName: "Case One",
      createdAt: new Date(),
      status: "active",
      verificationStatus: "verified",
      hasDetections: true,
      totalDetections: 5,
      verifiedDetections: 5,
      uploads: [],
      caseDate: new Date(),
      recalculationNeeded: false,
      locationRegion: "Region 1",
      locationProvince: "Province 1",
      locationCity: "City 1",
      locationBarangay: "Barangay 1",
      temperatureCelsius: 28,
      notes: "Sample notes",
      userId: "user-123",
      analysisResult: mockAnalysisResult,
    },
    {
      id: "case-2",
      caseName: "Case Two",
      createdAt: new Date(),
      status: "active",
      verificationStatus: "unverified",
      hasDetections: true,
      totalDetections: 3,
      verifiedDetections: 0,
      uploads: [],
      caseDate: new Date(),
      recalculationNeeded: false,
      locationRegion: "Region 2",
      locationProvince: "Province 2",
      locationCity: "City 2",
      locationBarangay: "Barangay 2",
      temperatureCelsius: 28,
      notes: "Sample notes",
      userId: "user-123",
      analysisResult: { ...mockAnalysisResult, caseId: "case-2" },
    },
  ];

  // Define default props and mock functions required for rendering CaseList.
  const defaultProps = {
    cases: mockCases,
    viewMode: "grid" as const,
    inputRef: React.createRef<HTMLInputElement>(),
    renamingCaseId: null,
    isRenaming: false,
    isDeleting: false,
    isRecalculating: false,
    isExporting: false,
    tempCaseName: "",
    onTempCaseNameChange: vi.fn(),
    onStartRename: vi.fn(),
    onConfirmRename: vi.fn(),
    onCancelRename: vi.fn(),
    onRenameKeyDown: vi.fn(),
    onDelete: vi.fn(),
    onRecalculate: vi.fn(),
    onDownloadReport: vi.fn(),
    onView: vi.fn(),
    onDetails: vi.fn(),
  };

  /**
   * Test case to verify that the component iterates over the provided data array correctly.
   */
  it("renders the correct number of case items", () => {
    // Arrange: Render the component with two mock cases.
    render(<CaseList {...defaultProps} />);

    // Assert: Check that both items are present in the DOM by their ID and display name.
    expect(screen.getByTestId("case-item-case-1")).toBeInTheDocument();
    expect(screen.getByTestId("case-item-case-2")).toBeInTheDocument();
    expect(screen.getByText("Case One")).toBeInTheDocument();
    expect(screen.getByText("Case Two")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the container applies responsive grid classes for the card layout.
   */
  it("applies grid layout classes when viewMode is 'grid'", () => {
    // Arrange: Set `viewMode` to 'grid'.
    render(<CaseList {...defaultProps} viewMode="grid" />);

    // Assert: Verify the presence of multi-column grid classes and the absence of list-view classes.
    const container = screen.getByTestId("case-list-container");
    expect(container).toHaveClass("grid-cols-2 sm:grid-cols-4 lg:grid-cols-5");
    expect(container).not.toHaveClass("grid-cols-1 md:grid-cols-2");
  });

  /**
   * Test case to verify that the container applies classes suitable for the simplified list layout.
   */
  it("applies list layout classes when viewMode is 'list'", () => {
    // Arrange: Set `viewMode` to 'list'.
    render(<CaseList {...defaultProps} viewMode="list" />);

    // Assert: Verify the use of one or two columns depending on the breakpoint.
    const container = screen.getByTestId("case-list-container");
    expect(container).toHaveClass("grid-cols-1 md:grid-cols-2");
    expect(container).not.toHaveClass("grid-cols-2 sm:grid-cols-4 lg:grid-cols-5");
  });

  /**
   * Test case to verify that the view mode preference is propagated to child items.
   */
  it("passes viewMode prop correctly to children", () => {
    // Arrange: Render the component in list mode.
    render(<CaseList {...defaultProps} viewMode="list" />);

    // Assert: Verify that the child component received the `viewMode` attribute.
    expect(screen.getByTestId("case-item-case-1")).toHaveAttribute("data-viewmode", "list");
  });

  /**
   * Test case to verify that the input reference is specifically attached to the item currently being edited.
   */
  it("forwards inputRef to the specific case being renamed", () => {
    // Arrange: Create a fresh ref and designate 'case-2' as the active rename target.
    const inputRef = React.createRef<HTMLInputElement>();

    render(<CaseList {...defaultProps} inputRef={inputRef} renamingCaseId="case-2" />);

    // Assert: Confirm that the ref is correctly attached to the specific DOM node for 'case-2'.
    expect(inputRef.current).toBeInTheDocument();
    expect(inputRef.current).toHaveAttribute("data-testid", "case-item-case-2");
  });

  /**
   * Test case to verify that the component handles empty data sets without crashing.
   */
  it("handles empty cases array", () => {
    // Arrange: Provide an empty array as the `cases` prop.
    render(<CaseList {...defaultProps} cases={[]} />);

    // Assert: Check that the container exists but contains no child elements.
    const container = screen.getByTestId("case-list-container");
    expect(container).toBeInTheDocument();
    expect(container.children).toHaveLength(0);
  });
});
