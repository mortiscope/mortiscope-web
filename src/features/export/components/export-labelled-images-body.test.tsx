import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ExportLabelledImagesBody } from "@/features/export/components/export-labelled-images-body";

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
 * Groups related tests into a suite for the Export Labelled Images Body component.
 */
describe("ExportLabelledImagesBody", () => {
  const defaultProps = {
    selectedResolution: "1920x1080" as const,
    onResolutionChange: vi.fn(),
    isExporting: false,
  };

  /**
   * Test case to verify that the static informational text and use cases are rendered.
   */
  it("renders the static informational text", () => {
    // Arrange: Render the component wrapped in the dialog context.
    renderWithContext(<ExportLabelledImagesBody {...defaultProps} />);

    // Assert: Check for the presence of key descriptive text and section headers.
    expect(screen.getByText(/generates a/i)).toBeInTheDocument();
    expect(screen.getByText("zip")).toBeInTheDocument();
    expect(screen.getByText("Reports & Presentations:")).toBeInTheDocument();
    expect(screen.getByText("Peer Review:")).toBeInTheDocument();
    expect(
      screen.getByText("Please select the desired output resolution for the images.")
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that all available resolution options are rendered.
   */
  it("renders all resolution options", () => {
    // Arrange: Render the component wrapped in the dialog context.
    renderWithContext(<ExportLabelledImagesBody {...defaultProps} />);

    // Assert: Check if the radio inputs for 720p, 1080p, and 4K are present.
    expect(screen.getByLabelText("720p")).toBeInTheDocument();
    expect(screen.getByLabelText("1080p")).toBeInTheDocument();
    expect(screen.getByLabelText("4K")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the radio button corresponding to the selected resolution is checked.
   */
  it("checks the selected resolution radio button", () => {
    // Arrange: Render the component with 4K resolution selected.
    renderWithContext(
      <ExportLabelledImagesBody {...defaultProps} selectedResolution="3840x2160" />
    );

    // Assert: Verify that 4K is checked and 1080p is not checked.
    const option4k = screen.getByRole("radio", { name: "4K" });
    const option1080p = screen.getByRole("radio", { name: "1080p" });

    expect(option4k).toBeChecked();
    expect(option1080p).not.toBeChecked();
  });

  /**
   * Test case to verify that the change handler is called when a resolution is selected.
   */
  it("calls onResolutionChange when a different resolution is clicked", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handleResolutionChange = vi.fn();

    renderWithContext(
      <ExportLabelledImagesBody
        {...defaultProps}
        selectedResolution="1280x720"
        onResolutionChange={handleResolutionChange}
      />
    );

    // Act: Simulate a user click on the 1080p option.
    const option1080p = screen.getByRole("radio", { name: "1080p" });
    await user.click(option1080p);

    // Assert: Verify that the handler was called with the correct resolution value.
    expect(handleResolutionChange).toHaveBeenCalledWith("1920x1080");
  });

  /**
   * Test case to verify that controls are disabled when an export is in progress.
   */
  it("disables controls when isExporting is true", () => {
    // Arrange: Render the component with `isExporting` set to true.
    renderWithContext(<ExportLabelledImagesBody {...defaultProps} isExporting={true} />);

    // Assert: Check that all radio buttons are disabled.
    const radios = screen.getAllByRole("radio");
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });

    // Assert: Check that labels have the visual styles indicating a disabled state.
    const labels = document.querySelectorAll("label");
    labels.forEach((label) => {
      expect(label).toHaveClass("cursor-not-allowed", "opacity-50");
    });
  });

  /**
   * Test case to verify that the component is enabled by default when `isExporting` is not provided.
   */
  it("renders properly with default isExporting prop", () => {
    // Arrange: Render without the `isExporting` prop explicitly set (defaults to false).
    renderWithContext(
      <ExportLabelledImagesBody selectedResolution="1920x1080" onResolutionChange={vi.fn()} />
    );

    // Assert: Check that the radio button is enabled.
    const radio = screen.getByRole("radio", { name: "1080p" });
    expect(radio).toBeEnabled();
  });
});
