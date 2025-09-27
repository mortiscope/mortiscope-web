import { fireEvent, render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { CaseItemContent } from "@/features/results/components/case-item-content";
import { type Case } from "@/features/results/components/results-preview";

// Mock utility functions to ensure predictable date formatting and class merging during tests.
vi.mock("@/lib/utils", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...original,
    formatDate: vi.fn((date: Date) => `Formatted Date: ${date.getFullYear()}`),
    cn: original.cn,
  };
});

// Define a base mock case representing the default state of a case item.
const mockBaseCase: Case = {
  id: "case-base-1",
  userId: "user-123",
  status: "active",
  caseName: "Mortiscope Case",
  temperatureCelsius: 25.5,
  locationRegion: "Region 1",
  locationProvince: "Province 1",
  locationCity: "City 1",
  locationBarangay: "Barangay 1",
  caseDate: new Date("2025-01-20T10:00:00Z"),
  createdAt: new Date("2025-01-19T10:00:00Z"),
  notes: "Sample case notes.",
  uploads: [],
  recalculationNeeded: false,
  analysisResult: {
    caseId: "case-base-1",
    status: "pending",
    totalCounts: null,
    oldestStageDetected: null,
    pmiSourceImageKey: null,
    pmiDays: null,
    pmiHours: null,
    pmiMinutes: null,
    stageUsedForCalculation: null,
    temperatureProvided: 25.5,
    calculatedAdh: null,
    ldtUsed: null,
    explanation: null,
    updatedAt: new Date("2025-01-20T10:00:00Z"),
  },
  verificationStatus: "unverified",
  hasDetections: false,
  totalDetections: 0,
  verifiedDetections: 0,
};

// Define a mock case representing a fully verified state.
const mockCaseVerified: Case = {
  ...mockBaseCase,
  id: "case-v-1",
  caseName: "Verified Mortiscope Case",
  verificationStatus: "verified",
  hasDetections: true,
  totalDetections: 5,
  verifiedDetections: 5,
  analysisResult: {
    ...mockBaseCase.analysisResult,
    status: "completed",
    oldestStageDetected: "adult",
  },
};

// Define a mock case representing an ongoing verification process.
const mockCaseInProgress: Case = {
  ...mockBaseCase,
  id: "case-ip-2",
  caseName: "In Progress Mortiscope Case",
  verificationStatus: "in_progress",
  hasDetections: true,
  totalDetections: 10,
  verifiedDetections: 3,
};

// Define a mock case where no detections were found by the system.
const mockCaseNoDetections: Case = {
  ...mockBaseCase,
  id: "case-nd-3",
  caseName: "No Detections Case",
  verificationStatus: "no_detections",
  hasDetections: false,
  totalDetections: 0,
  verifiedDetections: 0,
};

// Initialize mock functions to track event handler invocations.
const mockOnTempCaseNameChange = vi.fn();
const mockOnConfirmRename = vi.fn();
const mockOnRenameKeyDown = vi.fn();
const mockInputRef = createRef<HTMLInputElement>();

// Set default props shared across most test cases.
const defaultProps = {
  caseItem: mockCaseVerified,
  viewMode: "list" as const,
  isRenameActive: false,
  isRenaming: false,
  tempCaseName: mockCaseVerified.caseName,
  onTempCaseNameChange: mockOnTempCaseNameChange,
  onConfirmRename: mockOnConfirmRename,
  onRenameKeyDown: mockOnRenameKeyDown,
};

// Helper utility to locate the specific DOM element used as the folder icon background.
const getFolderIconContainer = (container: HTMLElement): Element | null => {
  return container.querySelector(".flex.flex-shrink-0.items-center.justify-center.rounded-full");
};

/**
 * Test suite for `CaseItemContent` behavior when the `viewMode` is set to "list".
 */
describe("CaseItemContent in List View", () => {
  /**
   * Test case to verify standard label rendering when the component is not in rename mode.
   */
  it("renders static content correctly when not renaming", () => {
    // Arrange: Render the component in standard list mode.
    render(<CaseItemContent {...defaultProps} ref={mockInputRef} />);

    // Assert: Check that the case name and formatted date are visible while the input is hidden.
    expect(screen.getByText(mockCaseVerified.caseName)).toBeInTheDocument();
    expect(screen.getByText(/Formatted Date: 2025/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify visual feedback for verified cases in list view.
   */
  it("applies correct verified status styling to folder icon", () => {
    // Arrange: Render with a verified case item.
    const { container } = render(<CaseItemContent {...defaultProps} ref={mockInputRef} />);

    // Assert: Verify that the background and icon colors reflect the "emerald" success theme.
    const folderIconContainer = getFolderIconContainer(container);
    expect(folderIconContainer).toHaveClass("bg-emerald-100");
    expect(folderIconContainer?.querySelector("svg")).toHaveClass("text-emerald-600");
  });

  /**
   * Test case to verify visual feedback for unverified cases in list view.
   */
  it("applies correct unverified status styling to folder icon", () => {
    // Arrange: Render with an unverified case item.
    const { container } = render(
      <CaseItemContent {...defaultProps} caseItem={mockBaseCase} ref={mockInputRef} />
    );

    // Assert: Verify that the background and icon colors reflect the "amber" warning theme.
    const folderIconContainer = getFolderIconContainer(container);
    expect(folderIconContainer).toHaveClass("bg-amber-100");
    expect(folderIconContainer?.querySelector("svg")).toHaveClass("text-amber-500");
  });

  /**
   * Test case to verify visual feedback for cases with no detections in list view.
   */
  it("applies correct no_detections status styling to folder icon", () => {
    // Arrange: Render with a no-detections case item.
    const { container } = render(
      <CaseItemContent {...defaultProps} caseItem={mockCaseNoDetections} ref={mockInputRef} />
    );

    // Assert: Verify that the background and icon colors reflect the "rose" error theme.
    const folderIconContainer = getFolderIconContainer(container);
    expect(folderIconContainer).toHaveClass("bg-rose-100");
    expect(folderIconContainer?.querySelector("svg")).toHaveClass("text-rose-500");
  });

  /**
   * Test case to verify that the text label is replaced by an input field during renaming.
   */
  it("renders editable input when renaming is active", () => {
    // Arrange: Set `isRenameActive` to true and provide a temporary name.
    render(
      <CaseItemContent
        {...defaultProps}
        isRenameActive={true}
        tempCaseName="New Name"
        ref={mockInputRef}
      />
    );

    // Assert: Confirm the input is visible with the temporary value and the static name is hidden.
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("New Name");
    expect(screen.queryByText(mockCaseVerified.caseName)).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that user input triggers the state change callback.
   */
  it("calls onTempCaseNameChange on input change", () => {
    // Arrange: Render in active rename mode.
    render(
      <CaseItemContent
        {...defaultProps}
        isRenameActive={true}
        tempCaseName="Old Name"
        ref={mockInputRef}
      />
    );

    // Act: Simulate user typing in the input field.
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Updated Name" } });

    // Assert: Verify the `onTempCaseNameChange` handler was called with the new string.
    expect(mockOnTempCaseNameChange).toHaveBeenCalledWith("Updated Name");
  });

  /**
   * Test case to verify that losing focus triggers the confirmation callback.
   */
  it("calls onConfirmRename on blur event", () => {
    // Arrange: Render in active rename mode.
    render(<CaseItemContent {...defaultProps} isRenameActive={true} ref={mockInputRef} />);

    // Act: Trigger a blur event on the input field.
    const input = screen.getByRole("textbox");
    fireEvent.blur(input);

    // Assert: Verify the `onConfirmRename` callback was executed.
    expect(mockOnConfirmRename).toHaveBeenCalled();
  });

  /**
   * Test case to verify that key interactions are delegated to the provided handler.
   */
  it("calls onRenameKeyDown on key press", () => {
    // Arrange: Render in active rename mode.
    render(<CaseItemContent {...defaultProps} isRenameActive={true} ref={mockInputRef} />);

    // Act: Simulate pressing the Enter key inside the input.
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    // Assert: Verify the `onRenameKeyDown` callback was executed.
    expect(mockOnRenameKeyDown).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the input field is locked while a server-side rename is in progress.
   */
  it("disables input when isRenaming is true", () => {
    // Arrange: Set `isRenaming` to true to simulate an active mutation.
    render(
      <CaseItemContent
        {...defaultProps}
        isRenameActive={true}
        isRenaming={true}
        ref={mockInputRef}
      />
    );

    // Assert: Verify that the input element is disabled to prevent further user edits.
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });
});

/**
 * Test suite for `CaseItemContent` behavior when the `viewMode` is set to "grid".
 */
describe("CaseItemContent in Grid View", () => {
  // Define props specifically for grid view layout testing.
  const gridProps = { ...defaultProps, viewMode: "grid" as const };

  /**
   * Test case to verify standard label rendering in the grid layout.
   */
  it("renders static content and date correctly in grid view", () => {
    // Arrange: Render the component in grid mode.
    render(<CaseItemContent {...gridProps} ref={mockInputRef} />);

    // Assert: Verify that basic case details are present.
    expect(screen.getByText(mockCaseVerified.caseName)).toBeInTheDocument();
    expect(screen.getByText(/Formatted Date: 2025/)).toBeInTheDocument();
  });

  /**
   * Test case to verify the presence and styling of the Verified badge in grid view.
   */
  it("renders Verified badge correctly", () => {
    // Arrange: Render with a verified case item.
    render(<CaseItemContent {...gridProps} ref={mockInputRef} />);

    // Assert: Check for the specific badge text and its emerald theme classes.
    const badge = screen.getByText("Verified");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-emerald-200 text-emerald-700");
  });

  /**
   * Test case to verify the calculation and display of progress for in-progress cases.
   */
  it("renders In Progress badge with correct percentage", () => {
    // Arrange: Render with a case where 3 out of 10 detections are verified.
    render(<CaseItemContent {...gridProps} caseItem={mockCaseInProgress} ref={mockInputRef} />);

    // Assert: Verify the calculated percentage text and the sky-blue theme classes.
    const badge = screen.getByText("30.0% Progress");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-sky-200 text-sky-700");
  });

  /**
   * Test case to verify that the progress calculation handles zero denominators gracefully.
   */
  it("renders In Progress badge as 0.0% when total detections is 0 but status is 'in_progress'", () => {
    // Arrange: Create a case with zero total detections.
    const caseItem = {
      ...mockCaseInProgress,
      totalDetections: 0,
      verifiedDetections: 0,
    };
    render(<CaseItemContent {...gridProps} caseItem={caseItem} ref={mockInputRef} />);

    // Assert: Verify that the percentage defaults to 0.0% rather than an error or NaN.
    const badge = screen.getByText("0.0% Progress");
    expect(badge).toBeInTheDocument();
  });

  /**
   * Test case to verify the presence and styling of the Unverified badge in grid view.
   */
  it("renders Unverified badge correctly", () => {
    // Arrange: Render with an unverified case item.
    render(<CaseItemContent {...gridProps} caseItem={mockBaseCase} ref={mockInputRef} />);

    // Assert: Check for the specific badge text and its amber theme classes.
    const badge = screen.getByText("Unverified");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-amber-200 text-amber-700");
  });

  /**
   * Test case to verify the presence and styling of the No Detections badge in grid view.
   */
  it("renders No Detections badge correctly", () => {
    // Arrange: Render with a case item that has no detections.
    render(<CaseItemContent {...gridProps} caseItem={mockCaseNoDetections} ref={mockInputRef} />);

    // Assert: Check for the specific badge text and its rose theme classes.
    const badge = screen.getByText("No Detections");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-rose-200 text-rose-700");
  });

  /**
   * Test case to verify input styling and presence during rename mode in grid view.
   */
  it("renders editable input when renaming is active in grid view", () => {
    // Arrange: Set `isRenameActive` and provide a grid-specific temporary name.
    render(
      <CaseItemContent
        {...gridProps}
        isRenameActive={true}
        tempCaseName="Grid New Name"
        ref={mockInputRef}
      />
    );

    // Assert: Verify the input exists, holds the correct value, and applies center-alignment for the grid.
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("Grid New Name");
    expect(input).toHaveClass("text-center");
  });

  /**
   * Test case to verify that user input in grid view correctly triggers the change callback.
   */
  it("calls onTempCaseNameChange on input change in grid view", () => {
    // Arrange: Render in active rename mode within the grid.
    render(
      <CaseItemContent
        {...gridProps}
        isRenameActive={true}
        tempCaseName="Grid Name"
        ref={mockInputRef}
      />
    );

    // Act: Simulate a change event on the grid-view input field.
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Updated Grid Name" } });

    // Assert: Verify the `onTempCaseNameChange` handler was called with the updated grid name.
    expect(mockOnTempCaseNameChange).toHaveBeenCalledWith("Updated Grid Name");
  });
});
