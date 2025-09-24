import { describe, expect, it } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExportModalHeader } from "@/features/export/components/export-modal-header";

// Helper function to render the component within a Dialog context to satisfy accessibility requirements.
const renderWithContext = (ui: React.ReactNode) => {
  return render(
    <Dialog open>
      <DialogContent aria-describedby={undefined}>{ui}</DialogContent>
    </Dialog>
  );
};

/**
 * Groups related tests into a suite for the Export Modal Header component.
 */
describe("ExportModalHeader", () => {
  /**
   * Test case to verify that the title is rendered correctly.
   */
  it("renders the title correctly", () => {
    // Arrange: Render the component with a specific title.
    renderWithContext(<ExportModalHeader title="Export Results" />);

    // Assert: Check if the title text is present in the document.
    expect(screen.getByText("Export Results")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the description is rendered when provided as a string.
   */
  it("renders the description when provided as a string", () => {
    // Arrange: Render the component with a string description.
    renderWithContext(
      <ExportModalHeader
        title="Export Results"
        description="Please select your preferred format."
      />
    );

    // Assert: Check if the description text is present in the document.
    expect(screen.getByText("Please select your preferred format.")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the description is rendered when provided as a React node.
   */
  it("renders the description when provided as a React node", () => {
    // Arrange: Render the component with a React Element as the description.
    renderWithContext(
      <ExportModalHeader
        title="Export Results"
        description={<span data-testid="custom-desc">Custom description</span>}
      />
    );

    // Assert: Check if the custom element and its text content are present.
    expect(screen.getByTestId("custom-desc")).toBeInTheDocument();
    expect(screen.getByText("Custom description")).toBeInTheDocument();
  });

  /**
   * Test case to verify that no description is rendered when the prop is undefined.
   */
  it("does not render the description container when description is undefined", () => {
    // Arrange: Render the component without providing a description.
    renderWithContext(<ExportModalHeader title="Export Results" />);

    // Assert: Verify that description text is not present in the document.
    const descriptionText = screen.queryByText(/Please select/i);
    expect(descriptionText).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the correct styling classes are applied to the title.
   */
  it("applies correct styling classes to the title", () => {
    // Arrange: Render the component.
    renderWithContext(<ExportModalHeader title="Styled Title" />);

    // Assert: Check that the title element has the expected Tailwind classes.
    const titleElement = screen.getByText("Styled Title");
    expect(titleElement).toHaveClass("text-emerald-600");
    expect(titleElement).toHaveClass("font-bold");
  });
});
