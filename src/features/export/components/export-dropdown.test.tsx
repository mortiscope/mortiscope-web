import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { mockIds } from "@/__tests__/mocks/fixtures";
import { render, screen } from "@/__tests__/setup/test-utils";
import { ExportDropdown } from "@/features/export/components/export-dropdown";

// Mock the PDF export modal component to control its rendering behavior for tests.
vi.mock("@/features/export/components/export-pdf-modal", () => ({
  ExportPdfModal: ({
    isOpen,
    caseId,
  }: {
    isOpen: boolean;
    caseId: string;
    onOpenChange: (open: boolean) => void;
  }) => (isOpen ? <div data-testid="export-pdf-modal">PDF Modal: {caseId}</div> : null),
}));

// Mock the Labelled Images export modal component to control its rendering behavior for tests.
vi.mock("@/features/export/components/export-labelled-images-modal", () => ({
  ExportLabelledImagesModal: ({
    isOpen,
    caseId,
  }: {
    isOpen: boolean;
    caseId: string;
    onOpenChange: (open: boolean) => void;
  }) => (isOpen ? <div data-testid="export-images-modal">Images Modal: {caseId}</div> : null),
}));

// Mock the Raw Data export modal component to control its rendering behavior for tests.
vi.mock("@/features/export/components/export-raw-data-modal", () => ({
  ExportRawDataModal: ({
    isOpen,
    caseId,
  }: {
    isOpen: boolean;
    caseId: string;
    onOpenChange: (open: boolean) => void;
  }) => (isOpen ? <div data-testid="export-raw-modal">Raw Data Modal: {caseId}</div> : null),
}));

/**
 * Groups related tests into a suite for the Export Dropdown component.
 */
describe("ExportDropdown", () => {
  // Use a realistic case ID from the shared fixtures pool.
  const caseId = mockIds.firstCase;

  /**
   * Test case to verify that the dropdown trigger button renders correctly.
   */
  it("renders the dropdown trigger button", () => {
    // Arrange: Render the component with a specific `caseId`.
    render(<ExportDropdown caseId={caseId} />);

    // Assert: Check if the trigger button and its associated text are present in the document.
    const button = screen.getByRole("button", { name: "Export results" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Export Results")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the dropdown menu opens and displays all export options when clicked.
   */
  it("opens the menu when clicked and shows all export options", async () => {
    // Arrange: Setup user event interaction and render the component.
    const user = userEvent.setup();
    render(<ExportDropdown caseId={caseId} />);

    // Act: Simulate a user click on the export trigger button.
    const button = screen.getByRole("button", { name: "Export results" });
    await user.click(button);

    // Assert: Verify that all expected export menu items are visible in the DOM.
    expect(screen.getByRole("menuitem", { name: /Export as PDF/i })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Export as Labelled Images/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Export as Raw Data/i })).toBeInTheDocument();
  });

  /**
   * Test case to verify that the PDF modal renders when the PDF export option is selected.
   */
  it("renders the PDF modal when 'Export as PDF' is selected", async () => {
    // Arrange: Setup user event interaction and render the component.
    const user = userEvent.setup();
    render(<ExportDropdown caseId={caseId} />);

    // Act: Open the dropdown menu and select the "Export as PDF" option.
    await user.click(screen.getByRole("button", { name: "Export results" }));

    const option = screen.getByRole("menuitem", { name: /Export as PDF/i });
    await user.click(option);

    // Assert: Wait for the mock PDF modal to appear and verify it received the correct `caseId`.
    const modal = await screen.findByTestId("export-pdf-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(`PDF Modal: ${caseId}`)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the Labelled Images modal renders when the corresponding option is selected.
   */
  it("renders the Labelled Images modal when 'Export as Labelled Images' is selected", async () => {
    // Arrange: Setup user event interaction and render the component.
    const user = userEvent.setup();
    render(<ExportDropdown caseId={caseId} />);

    // Act: Open the dropdown menu and select the "Export as Labelled Images" option.
    await user.click(screen.getByRole("button", { name: "Export results" }));

    const option = screen.getByRole("menuitem", { name: /Export as Labelled Images/i });
    await user.click(option);

    // Assert: Wait for the mock images modal to appear and verify it received the correct `caseId`.
    const modal = await screen.findByTestId("export-images-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(`Images Modal: ${caseId}`)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the Raw Data modal renders when the corresponding option is selected.
   */
  it("renders the Raw Data modal when 'Export as Raw Data' is selected", async () => {
    // Arrange: Setup user event interaction and render the component.
    const user = userEvent.setup();
    render(<ExportDropdown caseId={caseId} />);

    // Act: Open the dropdown menu and select the "Export as Raw Data" option.
    await user.click(screen.getByRole("button", { name: "Export results" }));

    const option = screen.getByRole("menuitem", { name: /Export as Raw Data/i });
    await user.click(option);

    // Assert: Wait for the mock raw data modal to appear and verify it received the correct `caseId`.
    const modal = await screen.findByTestId("export-raw-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(`Raw Data Modal: ${caseId}`)).toBeInTheDocument();
  });

  /**
   * Test case to verify that no export modals are rendered when the component is first mounted.
   */
  it("does not render any modal initially", () => {
    // Arrange: Render the component with a specific `caseId`.
    render(<ExportDropdown caseId={caseId} />);

    // Assert: Verify that none of the export modals are present in the document.
    expect(screen.queryByTestId("export-pdf-modal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("export-images-modal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("export-raw-modal")).not.toBeInTheDocument();
  });
});
