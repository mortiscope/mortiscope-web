import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ExportModalFooter } from "@/features/export/components/export-modal-footer";

/**
 * Groups related tests into a suite for the Export Modal Footer component.
 */
describe("ExportModalFooter", () => {
  // Define default properties to be used across multiple test cases.
  const defaultProps = {
    isPending: false,
    onCancel: vi.fn(),
    onExport: vi.fn(),
  };

  /**
   * Test case to verify that the footer renders with default button labels.
   */
  it("renders with default text (Cancel/Export)", () => {
    // Arrange: Render the component with default props.
    render(<ExportModalFooter {...defaultProps} />);

    // Assert: Check if the default "Cancel" and "Export" buttons are present.
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  /**
   * Test case to verify that custom button text properties are applied correctly.
   */
  it("renders with custom button text", () => {
    // Arrange: Render the component with custom text for both buttons.
    render(
      <ExportModalFooter {...defaultProps} cancelButtonText="Close" exportButtonText="Save" />
    );

    // Assert: Verify that the custom text appears in the document.
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the back button is rendered when `showBackButton` is true.
   */
  it("renders back button text when showBackButton is true", () => {
    // Arrange: Render the component with back button enabled and custom text.
    render(<ExportModalFooter {...defaultProps} showBackButton={true} backButtonText="Go Back" />);

    // Assert: Verify the back button text is present and the standard cancel button is absent.
    expect(screen.getByText("Go Back")).toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the `onCancel` handler is called when the cancel button is clicked.
   */
  it("calls onCancel when cancel button is clicked", async () => {
    // Arrange: Setup user event and render with a mock cancel handler.
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    render(<ExportModalFooter {...defaultProps} onCancel={handleCancel} />);

    // Act: Simulate a click on the cancel button.
    await user.click(screen.getByText("Cancel"));

    // Assert: Verify that the mock handler was called once.
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the `onExport` handler is called when the export button is clicked.
   */
  it("calls onExport when export button is clicked", async () => {
    // Arrange: Setup user event and render with a mock export handler.
    const user = userEvent.setup();
    const handleExport = vi.fn();

    render(<ExportModalFooter {...defaultProps} onExport={handleExport} />);

    // Act: Simulate a click on the export button.
    await user.click(screen.getByText("Export"));

    // Assert: Verify that the mock handler was called once.
    expect(handleExport).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify visual and interactive states when the component is in a pending state.
   */
  it("shows pending state correctly", () => {
    // Arrange: Render the component with `isPending` set to true and specific pending text.
    render(
      <ExportModalFooter {...defaultProps} isPending={true} pendingButtonText="Processing..." />
    );

    // Assert: Verify that all buttons are disabled during the pending state.
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    // Assert: Verify that the pending text is displayed and the default export text is absent.
    expect(screen.getByText("Processing...")).toBeInTheDocument();
    expect(screen.queryByText("Export")).not.toBeInTheDocument();

    // Assert: Check that the success message is displayed.
    expect(screen.getByText("Export started successfully.")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the export button is disabled when the `disabled` prop is true.
   */
  it("disables export button when disabled prop is true", () => {
    // Arrange: Render the component with the `disabled` prop set to true.
    const handleExport = vi.fn();
    render(<ExportModalFooter {...defaultProps} disabled={true} onExport={handleExport} />);

    // Assert: Verify that the export button is disabled.
    const exportButton = screen.getByRole("button", { name: "Export" });
    expect(exportButton).toBeDisabled();

    // Assert: Verify that the cancel button remains enabled.
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(cancelButton).toBeEnabled();
  });

  /**
   * Test case to verify that all buttons are disabled when `isPending` is true.
   */
  it("disables both buttons when isPending is true", () => {
    // Arrange: Render the component with `isPending` set to true.
    render(<ExportModalFooter {...defaultProps} isPending={true} />);

    // Assert: Verify that every button in the footer is disabled.
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
