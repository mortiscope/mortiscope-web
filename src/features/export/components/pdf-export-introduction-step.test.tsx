import { describe, expect, it } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PdfExportIntroductionStep } from "@/features/export/components/pdf-export-introduction-step";

// Helper function to render the component within a Dialog context to satisfy accessibility requirements.
const renderWithContext = (ui: React.ReactNode) => {
  return render(
    <Dialog open>
      <DialogContent>
        <DialogTitle className="sr-only">Test Dialog</DialogTitle>
        {ui}
      </DialogContent>
    </Dialog>
  );
};

/**
 * Groups related tests into a suite for the PDF Export Introduction Step component.
 */
describe("PdfExportIntroductionStep", () => {
  /**
   * Test case to verify that the main introduction text renders correctly.
   */
  it("renders the main introduction text", () => {
    // Arrange: Render the component within the dialog context.
    renderWithContext(<PdfExportIntroductionStep />);

    // Assert: Check if the key introductory phrases and emphasized text are present.
    expect(screen.getByText(/generates a multi-page/i)).toBeInTheDocument();
    expect(screen.getByText("PDF report")).toBeInTheDocument();
    expect(screen.getByText(/format is ideal for/i)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the use case list items are displayed.
   */
  it("renders the use case list items", () => {
    // Arrange: Render the component within the dialog context.
    renderWithContext(<PdfExportIntroductionStep />);

    // Assert: Verify the presence of specific use case headers and descriptions.
    expect(screen.getByText("Case Record:")).toBeInTheDocument();
    expect(screen.getByText(/creates a formal, archivable document/i)).toBeInTheDocument();

    expect(screen.getByText("Sharing & Collaboration:")).toBeInTheDocument();
    expect(screen.getByText(/allows for easy sharing of results/i)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the warning section renders with specific styling.
   */
  it("renders the warning section with correct styling", () => {
    // Arrange: Render the component within the dialog context.
    renderWithContext(<PdfExportIntroductionStep />);

    // Assert: Find the note element and verify its container has the correct warning styles.
    const noteElement = screen.getByText("Note:");
    expect(noteElement).toBeInTheDocument();

    const warningContainer = noteElement.closest("div.border-amber-400");

    expect(warningContainer).toBeInTheDocument();
    expect(warningContainer).toHaveClass("bg-amber-50", "border-2", "rounded-2xl");
  });

  /**
   * Test case to verify that the warning icon is rendered with correct attributes.
   */
  it("renders the warning icon", () => {
    // Arrange: Render the component within the dialog context.
    renderWithContext(<PdfExportIntroductionStep />);

    // Assert: Locate the warning container and verify the presence and styling of the icon.
    const noteElement = screen.getByText("Note:");
    const warningContainer = noteElement.closest("div.border-amber-400");
    const icon = warningContainer?.querySelector("svg");

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("text-amber-500", "h-5", "w-5");
  });
});
