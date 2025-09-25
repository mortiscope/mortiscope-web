import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { PdfExportPasswordStep } from "@/features/export/components/pdf-export-password-step";

/**
 * Groups related tests into a suite for the PDF Export Password Step component.
 */
describe("PdfExportPasswordStep", () => {
  const defaultProps = {
    password: "",
    onPasswordChange: vi.fn(),
    isPending: false,
  };

  /**
   * Test case to verify that the instruction label is rendered correctly.
   */
  it("renders the instruction label", () => {
    // Arrange: Render the component with default props.
    render(<PdfExportPasswordStep {...defaultProps} />);

    // Assert: Check if the instruction text is present in the document.
    expect(
      screen.getByText("Enter a password to protect access to this document.")
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the password change handler is called when the user types.
   */
  it("calls onPasswordChange when typing", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handlePasswordChange = vi.fn();

    render(<PdfExportPasswordStep {...defaultProps} onPasswordChange={handlePasswordChange} />);

    // Act: Type a character into the password input field.
    const input = screen.getByPlaceholderText("Enter viewer password");
    await user.type(input, "a");

    // Assert: Verify that the handler was called with the input value.
    expect(handlePasswordChange).toHaveBeenCalledWith("a");
  });

  /**
   * Test case to verify that no validation error is shown when the password is empty (initial state).
   */
  it("does not show error when password is empty (initial state)", () => {
    // Arrange: Render the component with an empty `password` prop.
    render(<PdfExportPasswordStep {...defaultProps} password="" />);

    // Assert: Ensure the error message is not present in the document.
    expect(screen.queryByText("Password must be at least 8 characters.")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that a validation error is displayed when the password is too short.
   */
  it("shows error when password is too short (1-7 characters)", () => {
    // Arrange: Render the component with a short `password` string.
    render(<PdfExportPasswordStep {...defaultProps} password="short" />);

    // Assert: Check if the specific error message is present.
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  /**
   * Test case to verify that no validation error is shown for a valid password length.
   */
  it("does not show error when password is valid (8+ characters)", () => {
    // Arrange: Render the component with a valid `password` string.
    render(<PdfExportPasswordStep {...defaultProps} password="longpassword" />);

    // Assert: Ensure the error message is not present in the document.
    expect(screen.queryByText("Password must be at least 8 characters.")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the component is disabled and visually altered when in a pending state.
   */
  it("disables input and applies visual styles when pending", () => {
    // Arrange: Render the component with `isPending` set to true.
    const { container } = render(<PdfExportPasswordStep {...defaultProps} isPending={true} />);

    // Assert: Check that the input field is disabled.
    const input = screen.getByPlaceholderText("Enter viewer password");
    expect(input).toBeDisabled();

    // Assert: Verify that the wrapper element has the correct styling classes for the pending state.
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("pointer-events-none", "opacity-50");
  });
});
