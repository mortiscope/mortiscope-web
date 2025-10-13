import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountModalFooter } from "@/features/account/components/account-modal-footer";

// Mock the spinner icon to verify its presence in the DOM during loading states.
vi.mock("react-icons/im", () => ({
  ImSpinner2: () => <div data-testid="loading-spinner" />,
}));

/**
 * Test suite for the `AccountModalFooter` component.
 */
describe("AccountModalFooter", () => {
  const mockOnCancel = vi.fn();
  const mockOnAction = vi.fn();

  // Define standard properties to ensure consistent starting points for tests.
  const defaultProps = {
    isPending: false,
    onCancel: mockOnCancel,
    onAction: mockOnAction,
  };

  /**
   * Test case to verify the default visual configuration and labels.
   */
  it("renders with default text and emerald variant", () => {
    // Arrange: Render the component with default properties.
    render(<AccountModalFooter {...defaultProps} />);

    // Assert: Verify that the default text labels and emerald color classes are applied.
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();

    const actionButton = screen.getByRole("button", { name: "Confirm" });
    expect(actionButton).toHaveClass("bg-emerald-600");
  });

  /**
   * Test case to verify that custom button labels are correctly displayed.
   */
  it("renders with custom text", () => {
    // Arrange: Provide custom strings for the action and cancel buttons.
    render(
      <AccountModalFooter
        {...defaultProps}
        actionButtonText="Save Changes"
        cancelButtonText="Close"
      />
    );

    // Assert: Confirm the component reflects the custom label strings.
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the cancel callback is executed upon user interaction.
   */
  it("calls onCancel when cancel button is clicked", () => {
    // Arrange: Render the component.
    render(<AccountModalFooter {...defaultProps} />);

    // Act: Simulate a click event on the cancel button.
    fireEvent.click(screen.getByText("Cancel"));

    // Assert: Check that the mock function was called exactly once.
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the primary action callback is executed upon user interaction.
   */
  it("calls onAction when action button is clicked", () => {
    // Arrange: Render the component.
    render(<AccountModalFooter {...defaultProps} />);

    // Act: Simulate a click event on the action button.
    fireEvent.click(screen.getByText("Confirm"));

    // Assert: Check that the mock function was called exactly once.
    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify the UI state when a background process is active.
   */
  it("renders correct state when isPending is true", () => {
    // Arrange: Set the `isPending` prop to true.
    render(<AccountModalFooter {...defaultProps} isPending={true} />);

    // Assert: Verify the presence of processing text, the loading spinner, and ensure buttons are disabled.
    expect(screen.getByText("Processing...")).toBeInTheDocument();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const actionButton = screen.getByRole("button", { name: /processing/i });

    expect(cancelButton).toBeDisabled();
    expect(actionButton).toBeDisabled();
  });

  /**
   * Test case to verify that the spinner can be suppressed during the pending state.
   */
  it("hides spinner when showSpinner is false during pending state", () => {
    // Arrange: Set `isPending` to true but `showSpinner` to false.
    render(<AccountModalFooter {...defaultProps} isPending={true} showSpinner={false} />);

    // Assert: Ensure text is updated but the spinner icon is not rendered.
    expect(screen.getByText("Processing...")).toBeInTheDocument();
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the component can disable the action button independently of the cancel button.
   */
  it("disables action button but keeps cancel enabled when disabled prop is true", () => {
    // Arrange: Set the `disabled` prop to true.
    render(<AccountModalFooter {...defaultProps} disabled={true} />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const actionButton = screen.getByRole("button", { name: "Confirm" });

    // Assert: Confirm the cancel button remains usable while the action button is locked.
    expect(cancelButton).toBeEnabled();
    expect(actionButton).toBeDisabled();
  });

  /**
   * Test case to verify the application of the rose color theme.
   */
  it("applies rose variant styles", () => {
    // Arrange: Set the `variant` prop to `rose`.
    render(<AccountModalFooter {...defaultProps} variant="rose" actionButtonText="Delete" />);

    // Assert: Check for the presence of specific TailWind rose background classes.
    const actionButton = screen.getByRole("button", { name: "Delete" });
    expect(actionButton).toHaveClass("bg-rose-600");
  });

  /**
   * Test case to verify the application of the slate color theme.
   */
  it("applies slate variant styles", () => {
    // Arrange: Set the `variant` prop to `slate`.
    render(<AccountModalFooter {...defaultProps} variant="slate" actionButtonText="Archive" />);

    // Assert: Check for the presence of specific TailWind slate background classes.
    const actionButton = screen.getByRole("button", { name: "Archive" });
    expect(actionButton).toHaveClass("bg-slate-600");
  });

  /**
   * Test case to verify that disabled state styles are correctly mapped for the rose variant.
   */
  it("applies disabled styles based on variant", () => {
    // Arrange: Set the `variant` to `rose` and `disabled` to true.
    render(
      <AccountModalFooter
        {...defaultProps}
        variant="rose"
        disabled={true}
        actionButtonText="Delete"
      />
    );

    // Assert: Verify lighter color classes and cursor styles for the disabled state.
    const actionButton = screen.getByRole("button", { name: "Delete" });
    expect(actionButton).toHaveClass("bg-rose-400");
    expect(actionButton).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that disabled state styles are correctly mapped for the slate variant.
   */
  it("applies disabled styles for slate variant", () => {
    // Arrange: Set the `variant` to `slate` and `disabled` to true.
    render(
      <AccountModalFooter
        {...defaultProps}
        variant="slate"
        disabled={true}
        actionButtonText="Archive"
      />
    );

    // Assert: Verify lighter color classes and cursor styles for the disabled state.
    const actionButton = screen.getByRole("button", { name: "Archive" });
    expect(actionButton).toHaveClass("bg-slate-400");
    expect(actionButton).toHaveClass("cursor-not-allowed");
  });
});
