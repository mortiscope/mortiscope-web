import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CaseItemDropdown } from "@/features/results/components/case-item-dropdown";
import { type Case } from "@/features/results/components/results-preview";
import { type ViewMode } from "@/features/results/store/results-store";

// Define a standard mock object representing a case record.
const mockCase: Case = {
  id: "case-mortiscope-id-1",
  caseName: "Mortiscope Case 1",
  temperatureCelsius: 25.5,
  locationRegion: "Region 1",
  locationProvince: "Province 1",
  locationCity: "City 1",
  locationBarangay: "Barangay 1",
  caseDate: new Date("2025-01-01T10:00:00Z"),
  uploads: [],
  analysisResult: {
    caseId: "case-mortiscope-id-1",
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
    updatedAt: new Date("2025-01-01T10:00:00Z"),
  },
  recalculationNeeded: false,
  verificationStatus: "unverified",
  hasDetections: false,
  totalDetections: 0,
  verifiedDetections: 0,
  createdAt: new Date("2025-01-01T10:00:00Z"),
  userId: "user-123",
  status: "active",
  notes: null,
};

// Initialize mock functions to track event handler invocations.
const mockOnView = vi.fn();
const mockOnStartRename = vi.fn();
const mockOnDelete = vi.fn();
const mockOnConfirmRename = vi.fn();
const mockOnDetails = vi.fn();

// Set default props shared across most test cases.
const defaultProps = {
  caseItem: mockCase,
  viewMode: "list" as ViewMode,
  isRenameActive: false,
  onView: mockOnView,
  onStartRename: mockOnStartRename,
  onDelete: mockOnDelete,
  onConfirmRename: mockOnConfirmRename,
  onDetails: mockOnDetails,
};

// Polyfill for PointerEvent to support testing Radix UI components in a JSDOM environment.
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: PointerEventInit) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || "mouse";
  }
}

// Assign polyfills and mock methods to the global window object.
window.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

// Mock `ResizeObserver` which is not implemented in JSDOM but required by many UI libraries.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/**
 * Test suite for the `CaseItemDropdown` component.
 */
describe("CaseItemDropdown", () => {
  // Reset all mock call history before each test to maintain isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper function to setup the component with a user event instance.
   */
  function setup(props = defaultProps) {
    return {
      user: userEvent.setup(),
      ...render(<CaseItemDropdown {...props} />),
    };
  }

  /**
   * Test case to verify that the dropdown trigger button renders with accessible labeling.
   */
  it("renders the trigger button with correct aria label", () => {
    // Arrange: Render the component.
    render(<CaseItemDropdown {...defaultProps} />);

    // Assert: Confirm the button is accessible via its case-specific aria-label.
    const triggerButton = screen.getByRole("button", {
      name: `Options for ${mockCase.caseName}`,
    });
    expect(triggerButton).toBeInTheDocument();
  });

  /**
   * Test case to verify that the trigger button uses compact styling in list view mode.
   */
  it("applies list mode styling to the trigger button when viewMode is 'list'", () => {
    // Arrange: Render the component in list mode.
    const { getByRole } = render(<CaseItemDropdown {...defaultProps} viewMode="list" />);
    const button = getByRole("button");

    // Assert: Verify the absence of absolute positioning and the use of smaller dimensions.
    expect(button).toHaveClass("h-8 w-8");
    expect(button.querySelector("svg")).toHaveClass("h-5 w-5");
    expect(button).not.toHaveClass("absolute top-2 right-2");
  });

  /**
   * Test case to verify that the trigger button uses overlay styling in grid view mode.
   */
  it("applies grid mode styling to the trigger button when viewMode is 'grid'", () => {
    // Arrange: Render the component in grid mode.
    const { getByRole } = render(<CaseItemDropdown {...defaultProps} viewMode="grid" />);
    const button = getByRole("button");

    // Assert: Verify the presence of absolute positioning and larger dimensions for grid card overlay.
    expect(button).toHaveClass("absolute top-2 right-2 z-10 h-9 w-9 text-slate-800");
    expect(button).not.toHaveClass("h-8 w-8");
    expect(button.querySelector("svg")).toHaveClass("h-6 w-6");
  });

  /**
   * Test case to verify that clicking the trigger displays the expected menu items.
   */
  it("opens the dropdown menu on trigger click", async () => {
    // Arrange: Initialize the setup helper.
    const { user } = setup();
    const triggerButton = screen.getByRole("button", {
      name: `Options for ${mockCase.caseName}`,
    });

    // Act: Click the dropdown trigger.
    await user.click(triggerButton);

    // Assert: Confirm all standard action labels are rendered in the portal.
    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("Rename")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.getByText("Details")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the view action is triggered from the menu.
   */
  it("calls onView when 'Open' is clicked", async () => {
    // Arrange: Open the dropdown menu.
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /options/i }));

    // Act: Click the 'Open' menu item.
    const openItem = await screen.findByText("Open");
    await user.click(openItem);

    // Assert: Verify the `onView` callback was executed with the case identifier.
    await waitFor(() => {
      expect(mockOnView).toHaveBeenCalledWith(mockCase.id);
    });
  });

  /**
   * Test case to verify that the details action is triggered from the menu.
   */
  it("calls onDetails when 'Details' is clicked", async () => {
    // Arrange: Open the dropdown menu.
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /options/i }));

    // Act: Click the 'Details' menu item.
    const detailsItem = await screen.findByText("Details");
    await user.click(detailsItem);

    // Assert: Verify the `onDetails` callback was executed with the case identifier.
    await waitFor(() => {
      expect(mockOnDetails).toHaveBeenCalledWith(mockCase.id);
    });
  });

  /**
   * Test case to verify that the rename initialization is triggered with correct context.
   */
  it("calls onStartRename with setTimeout when 'Rename' is clicked", async () => {
    // Arrange: Open the dropdown menu.
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /options/i }));

    // Act: Click the 'Rename' menu item.
    const renameItem = await screen.findByText("Rename");
    await user.click(renameItem);

    // Assert: Verify the `onStartRename` handler received the event, identifier, and name.
    await waitFor(() => {
      expect(mockOnStartRename).toHaveBeenCalledWith(
        expect.anything(),
        mockCase.id,
        mockCase.caseName
      );
    });
  });

  /**
   * Test case to verify that the delete action is triggered with confirmation context.
   */
  it("calls onDelete when 'Delete' is clicked", async () => {
    // Arrange: Open the dropdown menu.
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /options/i }));

    // Act: Click the 'Delete' menu item.
    const deleteItem = await screen.findByText("Delete");
    await user.click(deleteItem);

    // Assert: Verify the `onDelete` handler was called with identifier and name for the confirmation dialog.
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(mockCase.id, mockCase.caseName);
    });
  });

  /**
   * Test case to verify that closing the dropdown while renaming triggers a save/confirm action.
   */
  it("calls onConfirmRename when dropdown closes and isRenameActive is true", async () => {
    // Arrange: Render with `isRenameActive` set to true and open the menu.
    const { user } = setup({ ...defaultProps, isRenameActive: true });
    const triggerButton = screen.getByRole("button", { name: /options/i });
    await user.click(triggerButton);

    // Act: Click outside the menu to trigger a close event.
    expect(await screen.findByText("Open")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    // Assert: Verify that `onConfirmRename` was executed as part of the cleanup/close logic.
    await waitFor(() => {
      expect(mockOnConfirmRename).toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify that closing the dropdown normally does not trigger rename confirmation.
   */
  it("does not call onConfirmRename when dropdown closes and isRenameActive is false", async () => {
    // Arrange: Render in standard state and open the menu.
    const { user } = setup({ ...defaultProps, isRenameActive: false });
    const triggerButton = screen.getByRole("button", { name: /options/i });
    await user.click(triggerButton);

    // Act: Click outside the menu to trigger a close event.
    expect(await screen.findByText("Open")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    // Assert: Verify that `onConfirmRename` was not executed.
    await waitFor(() => {
      expect(mockOnConfirmRename).not.toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify that the dropdown trigger does not bubble events to parent items.
   */
  it("stops event propagation on trigger click to prevent parent item action", async () => {
    // Arrange: Wrap the dropdown in a parent element with a click listener.
    const mockClick = vi.fn();
    const user = userEvent.setup();
    const { getByRole } = render(
      <div onClick={mockClick}>
        <CaseItemDropdown {...defaultProps} />
      </div>
    );
    const triggerButton = getByRole("button");

    // Act: Click the trigger button.
    await user.click(triggerButton);

    // Assert: Confirm the parent's click handler was not invoked.
    expect(mockClick).not.toHaveBeenCalled();
  });
});
