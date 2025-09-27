import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CaseItem } from "@/features/results/components/case-item";
import { type Case } from "@/features/results/components/results-preview";

// Mock the framer-motion library to bypass animation logic and test raw component structure.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="motion-div" className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock the `CaseItemActions` component to isolate CaseItem from external button logic.
vi.mock("@/features/results/components/case-item-actions", () => ({
  CaseItemActions: () => <div data-testid="case-item-actions">Actions</div>,
}));

// Mock the `CaseItemContent` component with a forwardRef to verify input focus and rename states.
vi.mock("@/features/results/components/case-item-content", () => {
  const MockCaseItemContent = React.forwardRef(
    ({ isRenameActive }: { isRenameActive: boolean }, ref) => (
      <div data-testid="case-item-content">
        Content {isRenameActive ? "(Renaming)" : ""}
        <input ref={ref as React.RefObject<HTMLInputElement>} />
      </div>
    )
  );
  MockCaseItemContent.displayName = "CaseItemContent";
  return { CaseItemContent: MockCaseItemContent };
});

// Mock the `CaseItemDropdown` component to simplify menu testing.
vi.mock("@/features/results/components/case-item-dropdown", () => ({
  CaseItemDropdown: () => <div data-testid="case-item-dropdown">Dropdown</div>,
}));

// Mock the `VerificationIndicator` component to confirm its conditional rendering.
vi.mock("@/features/results/components/verification-indicator", () => ({
  VerificationIndicator: () => <div data-testid="verification-indicator">Indicator</div>,
}));

/**
 * Test suite for the `CaseItem` component.
 */
describe("CaseItem", () => {
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

  // Define a base mock case object including location and status metadata.
  const mockCase: Case = {
    id: "case-1",
    caseName: "Test Case",
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
  };

  // Define default props and mock functions required for rendering CaseItem.
  const defaultProps = {
    caseItem: mockCase,
    viewMode: "list" as const,
    renamingCaseId: null,
    isRenaming: false,
    tempCaseName: "",
    onTempCaseNameChange: vi.fn(),
    onStartRename: vi.fn(),
    onConfirmRename: vi.fn(),
    onRenameKeyDown: vi.fn(),
    onView: vi.fn(),
    onDelete: vi.fn(),
    onDetails: vi.fn(),
  };

  /**
   * Test case to verify the horizontal layout and presence of all sub-components in list view.
   */
  it("renders correctly in list mode", () => {
    // Arrange: Render the component with viewMode set to 'list'.
    render(<CaseItem {...defaultProps} viewMode="list" />);

    // Assert: Verify that the container uses list-specific padding and justification classes.
    const container = screen.getByRole("button");
    expect(container).toHaveClass("justify-between rounded-2xl p-2.5 lg:p-3");

    // Assert: Verify that content, actions, dropdown, and indicator are all present.
    expect(screen.getByTestId("case-item-content")).toBeInTheDocument();
    expect(screen.getByTestId("case-item-actions")).toBeInTheDocument();
    expect(screen.getByTestId("case-item-dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("verification-indicator")).toBeInTheDocument();
  });

  /**
   * Test case to verify the card-based layout and visibility of sub-components in grid view.
   */
  it("renders correctly in grid mode", () => {
    // Arrange: Render the component with viewMode set to 'grid'.
    render(<CaseItem {...defaultProps} viewMode="grid" />);

    // Assert: Verify that the container applies square aspect ratio and column direction.
    const container = screen.getByRole("button");
    expect(container).toHaveClass(
      "aspect-square flex-col justify-center gap-2 rounded-3xl px-3 py-2 text-center"
    );

    // Assert: Verify dropdown and content are present, while inline actions are hidden for the grid layout.
    expect(screen.getByTestId("case-item-dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("case-item-content")).toBeInTheDocument();
    expect(screen.queryByTestId("case-item-actions")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that double-clicking the item triggers the navigation callback.
   */
  it("calls onView when double-clicked", () => {
    // Arrange: Render the component.
    render(<CaseItem {...defaultProps} />);

    // Act: Simulate a double-click event on the main item container.
    const container = screen.getByRole("button");
    fireEvent.doubleClick(container);

    // Assert: Confirm that the `onView` function was called with the correct `id`.
    expect(defaultProps.onView).toHaveBeenCalledWith(mockCase.id);
  });

  /**
   * Test case to verify that navigation is disabled when the item is in an editable rename state.
   */
  it("does not call onView when double-clicked if renaming is active", () => {
    // Arrange: Render the component while marking the current `id` as active for renaming.
    render(<CaseItem {...defaultProps} renamingCaseId={mockCase.id} />);

    // Act: Simulate a double-click event.
    const container = screen.getByRole("button");
    fireEvent.doubleClick(container);

    // Assert: Verify that navigation is prevented during the rename operation.
    expect(defaultProps.onView).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the internal content component receives the active rename flag.
   */
  it("passes isRenameActive=true to content when case IDs match", () => {
    // Arrange: Set `renamingCaseId` to match the current item.
    render(<CaseItem {...defaultProps} renamingCaseId={mockCase.id} />);

    // Assert: Confirm that the child content displays the renaming state text.
    expect(screen.getByTestId("case-item-content")).toHaveTextContent("Renaming");
  });

  /**
   * Test case to verify that renaming state is not applied when a different item is being renamed.
   */
  it("passes isRenameActive=false to content when case IDs do not match", () => {
    // Arrange: Set `renamingCaseId` to a different identifier.
    render(<CaseItem {...defaultProps} renamingCaseId="other-case" />);

    // Assert: Confirm that the child content does not display the renaming state text.
    expect(screen.getByTestId("case-item-content")).not.toHaveTextContent("Renaming");
  });

  /**
   * Test case to verify that hover backgrounds reflect the current verification status of the case.
   */
  it("applies correct status color classes", () => {
    // Arrange: Render the component and re-render with different statuses.
    const { rerender } = render(
      <CaseItem {...defaultProps} caseItem={{ ...mockCase, verificationStatus: "verified" }} />
    );
    // Assert: Verify emerald theme for verified status.
    expect(screen.getByRole("button")).toHaveClass("hover:bg-emerald-50");

    rerender(
      <CaseItem {...defaultProps} caseItem={{ ...mockCase, verificationStatus: "in_progress" }} />
    );
    // Assert: Verify blue theme for in-progress status.
    expect(screen.getByRole("button")).toHaveClass("hover:bg-blue-50");

    rerender(
      <CaseItem {...defaultProps} caseItem={{ ...mockCase, verificationStatus: "unverified" }} />
    );
    // Assert: Verify amber theme for unverified status.
    expect(screen.getByRole("button")).toHaveClass("hover:bg-amber-50");

    rerender(
      <CaseItem {...defaultProps} caseItem={{ ...mockCase, verificationStatus: "no_detections" }} />
    );
    // Assert: Verify rose theme for no-detections status.
    expect(screen.getByRole("button")).toHaveClass("hover:bg-rose-50");
  });
});
