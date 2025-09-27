import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CaseItemActions } from "@/features/results/components/case-item-actions";
import { type Case } from "@/features/results/components/results-preview";

// Mock the Button component to simplify the DOM structure and add testable data attributes.
vi.mock("@/components/ui/button", () => {
  const MockButton = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<"button"> & {
      "aria-label": string;
      variant: string;
      size: string;
      className: string;
      onClick: (e: React.MouseEvent) => void;
    }
  >(({ children, onClick, "aria-label": ariaLabel, ...props }, ref) => {
    return (
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        data-testid={`button-${ariaLabel.split(" ")[0]}`}
        {...props}
        ref={ref}
      >
        {children}
      </button>
    );
  });
  MockButton.displayName = "Button";
  return { Button: MockButton };
});

// Mock the Tooltip components to avoid rendering complex overlay logic during unit tests.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock the `VerificationIndicator` component to verify its presence without full sub-component rendering.
vi.mock("@/features/results/components/verification-indicator", () => ({
  VerificationIndicator: () => <div data-testid="verification-indicator">Indicator</div>,
}));

// Mock icon libraries to replace SVG complexity with simple testable elements.
vi.mock("react-icons/md", () => ({
  MdOutlineRemoveRedEye: (props: React.ComponentProps<"svg">) => (
    <svg data-testid="icon-view" {...props} />
  ),
}));
vi.mock("react-icons/go", () => ({
  GoPencil: (props: React.ComponentProps<"svg">) => <svg data-testid="icon-rename" {...props} />,
}));
vi.mock("react-icons/lu", () => ({
  LuTrash2: (props: React.ComponentProps<"svg">) => <svg data-testid="icon-delete" {...props} />,
}));

/**
 * Test suite for the `CaseItemActions` component.
 */
describe("CaseItemActions", () => {
  // Define a standard mock object representing a case record.
  const mockCase: Case = {
    id: "case-1",
    caseName: "Test Case",
    createdAt: new Date(),
    status: "active",
    verificationStatus: "verified",
    hasDetections: true,
    totalDetections: 10,
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
    analysisResult: {
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
    },
  };

  // Define standard props with mock functions to track interaction events.
  const defaultProps = {
    caseItem: mockCase,
    onView: vi.fn(),
    onStartRename: vi.fn(),
    onDelete: vi.fn(),
  };

  /**
   * Test case to verify that all primary visual elements and icons are displayed.
   */
  it("renders the verification indicator and all action buttons", () => {
    // Arrange: Render the action component with default props.
    render(<CaseItemActions {...defaultProps} />);

    // Assert: Check for the existence of the indicator, specific buttons, and their associated icons.
    expect(screen.getByTestId("verification-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("button-View")).toBeInTheDocument();
    expect(screen.getByTestId("button-Rename")).toBeInTheDocument();
    expect(screen.getByTestId("button-Delete")).toBeInTheDocument();
    expect(screen.getByTestId("icon-view")).toBeInTheDocument();
    expect(screen.getByTestId("icon-rename")).toBeInTheDocument();
    expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the view callback is executed with the correct identifier.
   */
  it("calls onView with correct caseId when View button is clicked", () => {
    // Arrange: Render the component.
    render(<CaseItemActions {...defaultProps} />);

    // Act: Locate and click the View button.
    const viewButton = screen.getByTestId("button-View");
    fireEvent.click(viewButton);

    // Assert: Verify the `onView` function was triggered using the specific `id` of `mockCase`.
    expect(defaultProps.onView).toHaveBeenCalledWith(mockCase.id);
  });

  /**
   * Test case to verify that the rename callback is executed with the expected arguments.
   */
  it("calls onStartRename with correct arguments when Rename button is clicked", () => {
    // Arrange: Render the component.
    render(<CaseItemActions {...defaultProps} />);

    // Act: Locate and click the Rename button.
    const renameButton = screen.getByTestId("button-Rename");
    fireEvent.click(renameButton);

    // Assert: Verify that `onStartRename` received the event object, the case identifier, and the case name.
    expect(defaultProps.onStartRename).toHaveBeenCalledWith(
      expect.any(Object),
      mockCase.id,
      mockCase.caseName
    );
  });

  /**
   * Test case to verify that the delete callback is executed with the correct identifier and name.
   */
  it("calls onDelete with correct arguments when Delete button is clicked", () => {
    // Arrange: Render the component.
    render(<CaseItemActions {...defaultProps} />);

    // Act: Locate and click the Delete button.
    const deleteButton = screen.getByTestId("button-Delete");
    fireEvent.click(deleteButton);

    // Assert: Verify that `onDelete` was called with both the `id` and `caseName` for confirmation purposes.
    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockCase.id, mockCase.caseName);
  });

  /**
   * Test case to verify that clicking the View button does not trigger parent container events.
   */
  it("stops propagation on View button click", () => {
    // Arrange: Wrap the component in a div with a click listener.
    const parentClickHandler = vi.fn();
    render(
      <div onClick={parentClickHandler}>
        <CaseItemActions {...defaultProps} />
      </div>
    );

    // Act: Click the View button.
    const viewButton = screen.getByTestId("button-View");
    fireEvent.click(viewButton);

    // Assert: Confirm that the click event did not bubble up to the `parentClickHandler`.
    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that clicking the Delete button does not trigger parent container events.
   */
  it("stops propagation on Delete button click", () => {
    // Arrange: Wrap the component in a div with a click listener.
    const parentClickHandler = vi.fn();
    render(
      <div onClick={parentClickHandler}>
        <CaseItemActions {...defaultProps} />
      </div>
    );

    // Act: Click the Delete button.
    const deleteButton = screen.getByTestId("button-Delete");
    fireEvent.click(deleteButton);

    // Assert: Confirm that the event propagation was halted.
    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the Rename button allows event bubbling to support external logic.
   */
  it("does not stop propagation on Rename button click (delegating it to onStartRename's implementation)", () => {
    // Arrange: Wrap the component in a div with a click listener.
    const parentClickHandler = vi.fn();
    render(
      <div onClick={parentClickHandler}>
        <CaseItemActions {...defaultProps} />
      </div>
    );

    // Act: Click the Rename button.
    const renameButton = screen.getByTestId("button-Rename");
    fireEvent.click(renameButton);

    // Assert: Confirm that the click event successfully reached the `parentClickHandler`.
    expect(parentClickHandler).toHaveBeenCalled();
  });
});
