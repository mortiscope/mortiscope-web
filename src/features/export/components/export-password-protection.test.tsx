import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ExportPasswordProtection } from "@/features/export/components/export-password-protection";

/**
 * Groups related tests into a suite for the Export Password Protection component.
 */
describe("ExportPasswordProtection", () => {
  const defaultProps = {
    password: "",
    onPasswordChange: vi.fn(),
    isEnabled: false,
    onToggleEnabled: vi.fn(),
    disabled: false,
  };

  /**
   * Test case to verify that the component renders the static description and necessary input controls.
   */
  it("renders the description and controls", () => {
    // Arrange: Render the component with default props.
    render(<ExportPasswordProtection {...defaultProps} />);

    // Assert: Check if the description text, password input, and toggle switch are present in the document.
    expect(
      screen.getByText("Enable password protection to secure the exported file.")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle password protection")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the password input is disabled when protection is turned off.
   */
  it("disables the input when protection is disabled (isEnabled=false)", () => {
    // Arrange: Render the component with `isEnabled` set to false.
    render(<ExportPasswordProtection {...defaultProps} isEnabled={false} />);

    // Assert: Verify that the password input field is disabled.
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toBeDisabled();
  });

  /**
   * Test case to verify that the password input is enabled when protection is turned on.
   */
  it("enables the input when protection is enabled (isEnabled=true)", () => {
    // Arrange: Render the component with `isEnabled` set to true.
    render(<ExportPasswordProtection {...defaultProps} isEnabled={true} />);

    // Assert: Verify that the password input field is enabled.
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toBeEnabled();
  });

  /**
   * Test case to verify that the toggle callback is called when the switch is clicked.
   */
  it("calls onToggleEnabled when the switch is clicked", async () => {
    // Arrange: Setup user event and render with a mock toggle handler.
    const user = userEvent.setup();
    const handleToggle = vi.fn();

    render(<ExportPasswordProtection {...defaultProps} onToggleEnabled={handleToggle} />);

    // Act: Simulate a user click on the toggle switch.
    const toggle = screen.getByLabelText("Toggle password protection");
    await user.click(toggle);

    // Assert: Verify that the handler was called with the correct boolean value.
    expect(handleToggle).toHaveBeenCalledWith(true);
  });

  /**
   * Test case to verify that the password change callback is triggered when the user types in the input.
   */
  it("calls onPasswordChange when typing in the input (if enabled)", async () => {
    // Arrange: Setup user event and render with enabled state and mock change handler.
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <ExportPasswordProtection
        {...defaultProps}
        isEnabled={true}
        onPasswordChange={handleChange}
      />
    );

    // Act: Type text into the password input field.
    const input = screen.getByPlaceholderText("Enter password");
    await user.type(input, "secret");

    // Assert: Verify that the change handler was called.
    expect(handleChange).toHaveBeenCalled();
  });

  /**
   * Test case to verify that both the switch and input are disabled when the component is globally disabled.
   */
  it("disables both switch and input when the component is disabled via props", () => {
    // Arrange: Render the component with the `disabled` prop set to true.
    render(<ExportPasswordProtection {...defaultProps} isEnabled={true} disabled={true} />);

    // Assert: Verify that both the password input and the toggle switch are disabled.
    const input = screen.getByPlaceholderText("Enter password");
    const toggle = screen.getByLabelText("Toggle password protection");

    expect(input).toBeDisabled();
    expect(toggle).toBeDisabled();
  });

  /**
   * Test case to verify that a validation error is displayed for passwords that are too short.
   */
  it("shows validation error for short passwords when enabled", () => {
    // Arrange: Render the component enabled with a short password string.
    render(<ExportPasswordProtection {...defaultProps} isEnabled={true} password="short" />);

    // Assert: Check for the error message and the specific error styling on the input.
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toHaveClass("border-rose-500");
  });

  /**
   * Test case to verify that validation errors are not shown when protection is disabled, even if the password is invalid.
   */
  it("does not show validation error when disabled, even if password is short", () => {
    // Arrange: Render the component disabled with a short password string.
    render(<ExportPasswordProtection {...defaultProps} isEnabled={false} password="short" />);

    // Assert: Ensure the error message is absent and the input does not have error styling.
    expect(screen.queryByText("Password must be at least 8 characters.")).not.toBeInTheDocument();
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).not.toHaveClass("border-rose-500");
  });

  /**
   * Test case to verify that no validation error is shown for a valid password.
   */
  it("does not show validation error for valid passwords", () => {
    // Arrange: Render the component enabled with a valid password string.
    render(
      <ExportPasswordProtection {...defaultProps} isEnabled={true} password="valid-password-123" />
    );

    // Assert: Ensure the error message is not present in the document.
    expect(screen.queryByText("Password must be at least 8 characters.")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the initial empty state does not trigger validation errors.
   */
  it("does not show validation error for empty passwords (initial state)", () => {
    // Arrange: Render the component enabled with an empty password string.
    render(<ExportPasswordProtection {...defaultProps} isEnabled={true} password="" />);

    // Assert: Ensure the error message is not present in the document.
    expect(screen.queryByText("Password must be at least 8 characters.")).not.toBeInTheDocument();
  });
});
