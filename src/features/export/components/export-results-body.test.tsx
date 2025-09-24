import { describe, expect, it } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExportResultsBody } from "@/features/export/components/export-results-body";

// Helper function to render the component within a Dialog context to satisfy accessibility requirements.
const renderWithContext = (ui: React.ReactNode) => {
  return render(
    <Dialog open>
      <DialogContent>{ui}</DialogContent>
    </Dialog>
  );
};

/**
 * Groups related tests into a suite for the Export Results Body component.
 */
describe("ExportResultsBody", () => {
  /**
   * Test case to verify that the introductory text is rendered with the expected emphasis on the file format.
   */
  it("renders the introductory text with 'zip' emphasis", () => {
    // Arrange: Render the component inside the dialog context.
    renderWithContext(<ExportResultsBody />);

    // Assert: Check if the main introductory text exists.
    expect(screen.getByText(/bundles all original case files into a single/i)).toBeInTheDocument();

    // Assert: Check if the "zip" word is present and has the correct styling classes.
    const zipEmphasis = screen.getByText("zip");
    expect(zipEmphasis).toBeInTheDocument();
    expect(zipEmphasis).toHaveClass("font-semibold", "text-slate-800");
  });

  /**
   * Test case to verify that the list of use cases is rendered correctly.
   */
  it("renders the use case list items correctly", () => {
    // Arrange: Render the component inside the dialog context.
    renderWithContext(<ExportResultsBody />);

    // Assert: Verify the presence of "Permanent Archival" title and description.
    expect(screen.getByText("Permanent Archival:")).toBeInTheDocument();
    expect(screen.getByText(/creates a complete, offline backup/i)).toBeInTheDocument();

    // Assert: Verify the presence of "External Analysis" title and description.
    expect(screen.getByText("External Analysis:")).toBeInTheDocument();
    expect(screen.getByText(/allows the data to be used with other software/i)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the concluding information regarding the archive contents is present.
   */
  it("renders the concluding text about JSON files", () => {
    // Arrange: Render the component inside the dialog context.
    renderWithContext(<ExportResultsBody />);

    // Assert: Verify text mentioning original images and JSON analysis results.
    expect(
      screen.getByText(/generated archive will contain all original images/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/detailed JSON file with the complete analysis results/i)
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component renders successfully within a dialog context.
   */
  it("renders within the dialog description structure", () => {
    // Arrange: Render the component inside the dialog context.
    renderWithContext(<ExportResultsBody />);

    // Assert: Verify that the component content is visible in the document.
    expect(screen.getByText(/bundles all original case files/i)).toBeInTheDocument();
  });
});
