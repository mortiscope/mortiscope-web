import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ExportImageBody } from "@/features/export/components/export-image-body";

/**
 * Groups related tests into a suite for the Export Image Body component.
 */
describe("ExportImageBody", () => {
  const defaultProps = {
    step: "format" as const,
    exportOption: "raw_data" as const,
    onExportOptionChange: vi.fn(),
    resolution: "1920x1080" as const,
    onResolutionChange: vi.fn(),
    isPending: false,
  };

  /**
   * Test case to verify that the format selection step renders correctly.
   */
  it("renders the format selection step correctly", () => {
    // Arrange: Render the component with the format step active.
    render(<ExportImageBody {...defaultProps} step="format" />);

    // Assert: Check if the format options and descriptions are present.
    expect(screen.getByText("Raw Data")).toBeInTheDocument();
    expect(screen.getByText("Labelled Image")).toBeInTheDocument();

    expect(screen.getByText(/zip archive file containing/i)).toBeInTheDocument();
    expect(screen.getByText(/image file with all bounding boxes/i)).toBeInTheDocument();

    const rawDataRadio = screen.getByRole("radio", { name: /raw data/i });
    expect(rawDataRadio).toBeChecked();
  });

  /**
   * Test case to verify that the resolution selection step renders correctly.
   */
  it("renders the resolution selection step correctly", () => {
    // Arrange: Render the component with the resolution step active.
    render(<ExportImageBody {...defaultProps} step="resolution" />);

    // Assert: Check if the resolution options are present and the default is checked.
    expect(screen.getByText("1280x720")).toBeInTheDocument();
    expect(screen.getByText("1920x1080")).toBeInTheDocument();
    expect(screen.getByText("3840x2160")).toBeInTheDocument();

    const resolutionRadio = screen.getByRole("radio", { name: /1920x1080/i });
    expect(resolutionRadio).toBeChecked();
  });

  /**
   * Test case to verify that the export option callback is called when a format option is selected.
   */
  it("calls onExportOptionChange when a format option is selected", async () => {
    // Arrange: Setup user event and render the component with a mock callback.
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<ExportImageBody {...defaultProps} step="format" onExportOptionChange={handleChange} />);

    // Act: Click on the "Labelled Image" radio button.
    const labelledOption = screen.getByRole("radio", { name: /labelled image/i });
    await user.click(labelledOption);

    // Assert: Verify that the callback was called with the correct value.
    expect(handleChange).toHaveBeenCalledWith("labelled_image");
  });

  /**
   * Test case to verify that the resolution callback is called when a resolution option is selected.
   */
  it("calls onResolutionChange when a resolution option is selected", async () => {
    // Arrange: Setup user event and render the component with a mock callback.
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <ExportImageBody {...defaultProps} step="resolution" onResolutionChange={handleChange} />
    );

    // Act: Click on the high-resolution radio button.
    const highResOption = screen.getByRole("radio", { name: /3840x2160/i });
    await user.click(highResOption);

    // Assert: Verify that the callback was called with the correct resolution value.
    expect(handleChange).toHaveBeenCalledWith("3840x2160");
  });

  /**
   * Test case to verify that visual disabled states are applied when isPending is true.
   */
  it("applies visual disabled states when isPending is true", () => {
    // Arrange: Render the component with `isPending` set to true.
    const { container } = render(
      <ExportImageBody {...defaultProps} isPending={true} step="format" />
    );

    // Assert: Verify opacity styles, cursor states, and disabled attributes on inputs.
    const opacityContainer = container.querySelector(".opacity-50");
    expect(opacityContainer).toBeInTheDocument();

    const labels = container.querySelectorAll("label");
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((label) => {
      expect(label).toHaveClass("cursor-not-allowed");
    });

    const radios = screen.getAllByRole("radio");
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  /**
   * Test case to verify that visual disabled states are applied to the resolution step when isPending is true.
   */
  it("applies visual disabled states to resolution step when isPending is true", () => {
    // Arrange: Render the component with `isPending` set to true on the resolution step.
    const { container } = render(
      <ExportImageBody {...defaultProps} isPending={true} step="resolution" />
    );

    // Assert: Verify opacity styles, cursor states, and disabled attributes on inputs.
    const opacityContainer = container.querySelector(".opacity-50");
    expect(opacityContainer).toBeInTheDocument();

    const labels = container.querySelectorAll("label");
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((label) => {
      expect(label).toHaveClass("cursor-not-allowed");
    });

    const radios = screen.getAllByRole("radio");
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  /**
   * Test case to verify that the selected option is highlighted with specific styles.
   */
  it("highlights the selected option with specific styles", () => {
    // Arrange: Render the component with the "raw_data" option selected.
    render(<ExportImageBody {...defaultProps} step="format" exportOption="raw_data" />);

    // Assert: Check that the selected label has active styling and the unselected label has default styling.
    const selectedLabel = screen.getByText("Raw Data").closest("label");
    const unselectedLabel = screen.getByText("Labelled Image").closest("label");

    expect(selectedLabel).toHaveClass("border-emerald-400", "bg-emerald-50");
    expect(unselectedLabel).toHaveClass("border-slate-200", "bg-white");
  });

  /**
   * Test case to verify that correct styles are applied when labelled_image is selected.
   */
  it("applies correct styles when labelled_image is selected", () => {
    // Arrange: Render the component with the "labelled_image" option selected.
    render(<ExportImageBody {...defaultProps} step="format" exportOption="labelled_image" />);

    // Assert: Check that the labelled image label has active styling and the raw data label has default styling.
    const labelledLabel = screen.getByText("Labelled Image").closest("label");
    const rawDataLabel = screen.getByText("Raw Data").closest("label");

    expect(labelledLabel).toHaveClass("border-emerald-400", "bg-emerald-50");
    expect(rawDataLabel).toHaveClass("border-slate-200", "bg-white");
  });

  /**
   * Test case to verify that the selected resolution option is highlighted with specific styles.
   */
  it("highlights the selected resolution option with specific styles", () => {
    // Arrange: Render the component with a specific resolution selected.
    render(<ExportImageBody {...defaultProps} step="resolution" resolution="3840x2160" />);

    // Assert: Check that the selected resolution label has active styling and unselected labels have default styling.
    const selectedLabel = screen.getByText("3840x2160").closest("label");
    const unselectedLabel = screen.getByText("1280x720").closest("label");

    expect(selectedLabel).toHaveClass("border-emerald-400", "bg-emerald-50");
    expect(unselectedLabel).toHaveClass("border-slate-200", "bg-white");
  });
});
