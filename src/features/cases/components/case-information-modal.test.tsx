import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { CaseInformationModal } from "@/features/cases/components/case-information-modal";
import { type Case } from "@/features/results/components/results-preview";

// Mock the Dialog components from the interface library to isolate the modal container and content.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
}));

// Mock `framer-motion` components to simplify rendering without animation logic.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

// Mock various icons used for displaying case information details.
vi.mock("react-icons/go", () => ({ GoHome: () => <span data-testid="icon-home" /> }));
vi.mock("react-icons/hi2", () => ({
  HiOutlineBuildingOffice: () => <span data-testid="icon-office" />,
}));
vi.mock("react-icons/io5", () => ({
  IoCalendarClearOutline: () => <span />,
  IoCalendarOutline: () => <span />,
  IoImageOutline: () => <span />,
  IoThermometerOutline: () => <span />,
  IoTimeOutline: () => <span />,
}));
vi.mock("react-icons/pi", () => ({
  PiBoundingBoxLight: () => <span />,
  PiCity: () => <span />,
  PiMapTrifold: () => <span />,
}));

// Mock status configuration to control the display text and icons based on verification status.
vi.mock("@/lib/constants", () => ({
  STATUS_CONFIG: {
    verified: { label: "Verified", icon: () => <span data-testid="icon-verified" /> },
    in_progress: { label: "In Progress", icon: () => <span data-testid="icon-progress" /> },
    unverified: { label: "Unverified", icon: () => <span /> },
  },
}));

// Define a base mock case object used for tests requiring standard data.
const baseCase = {
  id: "case-123",
  caseName: "Test Case",
  caseDate: new Date("2025-05-15"),
  createdAt: new Date("2025-05-16"),
  temperatureCelsius: 25.5,
  locationRegion: "Region 1",
  locationProvince: "Province 1",
  locationCity: "City 1",
  locationBarangay: "Barangay 1",
  verificationStatus: "verified",
  totalDetections: 10,
  verifiedDetections: 10,
  uploads: [],
  analysisResult: null,
} as unknown as Case;

/**
 * Test suite for the `CaseInformationModal` component.
 */
describe("CaseInformationModal", () => {
  // Store the original `window.location` object before mocking.
  const originalLocation = window.location;

  beforeEach(() => {
    // Arrange: Mock `window.location.href` to track navigation attempts during tests.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    // Arrange: Restore the original `window.location` object after each test.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    // Arrange: Clear all mocks.
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the modal does not render content if the `caseItem` prop is null.
   */
  it("renders nothing when caseItem is null", () => {
    // Arrange: Render the component with a null `caseItem`.
    const { container } = render(
      <CaseInformationModal isOpen={true} onOpenChange={vi.fn()} caseItem={null} />
    );
    // Assert: Check that the rendered container is empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that the modal does not render if the `isOpen` prop is false.
   */
  it("renders nothing when isOpen is false", () => {
    // Arrange: Render the component with `isOpen` set to false.
    render(<CaseInformationModal isOpen={false} onOpenChange={vi.fn()} caseItem={baseCase} />);
    // Assert: Check that the mocked dialog root is not present.
    expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that key case details, including name, dates, temperature, and location, are displayed correctly.
   */
  it("renders basic case details correctly", () => {
    // Arrange: Render the component with the base case data.
    render(<CaseInformationModal isOpen={true} onOpenChange={vi.fn()} caseItem={baseCase} />);

    // Assert: Check for the case name in the dialog header.
    expect(screen.getByRole("heading", { name: "Test Case" })).toBeInTheDocument();

    // Assert: Check for the formatted case date and creation date.
    expect(screen.getByText("May 15, 2025")).toBeInTheDocument();
    expect(screen.getByText("May 16, 2025")).toBeInTheDocument();

    // Assert: Check for the formatted temperature display.
    expect(screen.getByText("25.5°C")).toBeInTheDocument();

    // Assert: Check for the location details (Region, Province, City, Barangay).
    expect(screen.getByText("Region 1")).toBeInTheDocument();
    expect(screen.getByText("Province 1")).toBeInTheDocument();
    expect(screen.getByText("City 1")).toBeInTheDocument();
    expect(screen.getByText("Barangay 1")).toBeInTheDocument();
  });

  /**
   * Test case to verify the Post Mortem Interval (PMI) status displays "Pending Analysis" when the analysis status is processing.
   */
  it("displays correct PMI Estimation: Pending", () => {
    // Arrange: Create a case item with analysis status set to "processing".
    const caseItem = {
      ...baseCase,
      analysisResult: { status: "processing" },
    } as unknown as Case;

    // Arrange: Render the component.
    render(<CaseInformationModal isOpen={true} onOpenChange={vi.fn()} caseItem={caseItem} />);

    // Assert: Check for the "Pending Analysis" text.
    expect(screen.getByText("Pending Analysis")).toBeInTheDocument();
  });

  /**
   * Test case to verify the PMI estimation displays the hours result formatted to two decimal places when analysis is completed.
   */
  it("displays correct PMI Estimation: Completed (Hours)", () => {
    // Arrange: Create a case item with a completed analysis result including a PMI value.
    const caseItem = {
      ...baseCase,
      analysisResult: { status: "completed", pmiHours: 48.567 },
    } as unknown as Case;

    // Arrange: Render the component.
    render(<CaseInformationModal isOpen={true} onOpenChange={vi.fn()} caseItem={caseItem} />);

    // Assert: Check for the PMI value formatted to two decimal places with the unit.
    expect(screen.getByText("48.57 hours")).toBeInTheDocument();
  });

  /**
   * Test case to verify the PMI estimation displays the recalculation needed indicator when appropriate.
   */
  it("displays correct PMI Estimation: Recalculation Needed", () => {
    // Arrange: Create a case item with a completed analysis and the `recalculationNeeded` flag set to true.
    const caseItem = {
      ...baseCase,
      analysisResult: { status: "completed", pmiHours: 24.0 },
      recalculationNeeded: true,
    } as unknown as Case;

    // Arrange: Render the component.
    render(<CaseInformationModal isOpen={true} onOpenChange={vi.fn()} caseItem={caseItem} />);

    // Assert: Check for the formatted PMI value including the recalculation needed note.
    expect(screen.getByText("24.00 hours (Recalculation Needed)")).toBeInTheDocument();
  });

  /**
   * Test case to verify the display of verification status with completion percentage when the status is "in_progress".
   */
  it("displays status with percentage when in progress", () => {
    // Arrange: Create a case item with "in_progress" status and specific verification counts.
    const caseItem = {
      ...baseCase,
      verificationStatus: "in_progress",
      totalDetections: 10,
      verifiedDetections: 5,
    } as unknown as Case;

    // Arrange: Render the component.
    render(<CaseInformationModal isOpen={true} onOpenChange={vi.fn()} caseItem={caseItem} />);

    // Assert: Check for the presence of the calculated 50.0% completion text and the corresponding status icon.
    expect(screen.getByText("50.0% In Progress")).toBeInTheDocument();
    expect(screen.getByTestId("icon-progress")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the count of images with user-verified detections is calculated correctly.
   */
  it("displays reviewed images count correctly", () => {
    // Arrange: Create a case with multiple uploads, where only one upload has a user-verified detection.
    const caseItem = {
      ...baseCase,
      uploads: [
        { detections: [{ status: "user_verified" }, { status: "corrected" }] },
        { detections: [{ status: "model_generated" }] }, // No user_verified
        { detections: [] }, // No detections
      ],
    } as unknown as Case;

    // Arrange: Render the component.
    render(<CaseInformationModal isOpen={true} onOpenChange={vi.fn()} caseItem={caseItem} />);

    // Assert: Check that the reviewed count is 1 (out of 2 uploads with detections).
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the "Open" button navigates the user to the case results page.
   */
  it("handles navigation when 'Open' is clicked", async () => {
    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<CaseInformationModal isOpen={true} onOpenChange={vi.fn()} caseItem={baseCase} />);

    // Act: Click the "Open" button in the footer.
    const openButton = screen.getByRole("button", { name: "Open" });
    await user.click(openButton);

    // Assert: Check that `window.location.href` was updated to the correct results URL.
    expect(window.location.href).toBe("/results/case-123");
  });

  /**
   * Test case to verify that clicking the "Close" button triggers the `onOpenChange` callback with `false`.
   */
  it("calls onOpenChange(false) when 'Close' is clicked", async () => {
    // Arrange: Set up a mock for `onOpenChange` and user events.
    const onOpenChangeMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component with the mock function.
    render(
      <CaseInformationModal isOpen={true} onOpenChange={onOpenChangeMock} caseItem={baseCase} />
    );

    // Act: Click the "Close" button in the footer.
    const closeButton = screen.getByRole("button", { name: "Close" });
    await user.click(closeButton);

    // Assert: Check that the mock function was called with `false` to close the modal.
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
