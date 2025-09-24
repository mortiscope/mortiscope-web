import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { PdfPasswordInput } from "@/features/export/components/pdf-password-input";

/**
 * Groups related tests into a suite for the PDF Password Input component.
 */
describe("PdfPasswordInput", () => {
  /**
   * Test case to verify that the component renders correctly with default props.
   */
  it("renders with default props and hidden password type", () => {
    // Arrange: Render the component with empty value and default state.
    const handleChange = vi.fn();
    render(<PdfPasswordInput value="" onChange={handleChange} disabled={false} />);

    // Assert: Verify the input exists, has type "password", and the toggle button is present.
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Show password")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the onChange handler is called when the user types.
   */
  it("handles user input correctly", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<PdfPasswordInput value="" onChange={handleChange} disabled={false} />);

    // Act: Type text into the password input field.
    const input = screen.getByPlaceholderText("Enter password");
    await user.type(input, "secret123");

    // Assert: Verify that the change handler was triggered.
    expect(handleChange).toHaveBeenCalled();
  });

  /**
   * Test case to verify that clicking the eye icon toggles password visibility.
   */
  it("toggles password visibility when the eye icon is clicked", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<PdfPasswordInput value="secret" onChange={handleChange} disabled={false} />);

    // Assert: Verify initial state is obscured (password type).
    const input = screen.getByPlaceholderText("Enter password");
    const toggleButton = screen.getByLabelText("Show password");

    expect(input).toHaveAttribute("type", "password");

    // Act: Click the toggle button to show password.
    await user.click(toggleButton);

    // Assert: Verify state is visible (text type) and label is updated.
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Hide password")).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute("aria-label", "Hide password");

    // Act: Click the toggle button again to hide password.
    await user.click(screen.getByLabelText("Hide password"));

    // Assert: Verify state is obscured again.
    expect(input).toHaveAttribute("type", "password");
    expect(toggleButton).toHaveAttribute("aria-label", "Show password");
  });

  /**
   * Test case to verify that the input and toggle button are disabled when the prop is set.
   */
  it("disables the input and toggle button when disabled prop is true", () => {
    // Arrange: Render the component with `disabled` set to true.
    const handleChange = vi.fn();
    render(<PdfPasswordInput value="" onChange={handleChange} disabled={true} />);

    // Assert: Check that both the input field and the toggle button are disabled.
    const input = screen.getByPlaceholderText("Enter password");
    const toggleButton = screen.getByLabelText("Show password");

    expect(input).toBeDisabled();
    expect(toggleButton).toBeDisabled();
  });

  /**
   * Test case to verify that error styles and messages are displayed when an error exists.
   */
  it("displays error message and applies error styling when hasError is true", () => {
    // Arrange: Render the component with `hasError` set to true and a specific message.
    const handleChange = vi.fn();
    const errorMessage = "Password is too short";

    render(
      <PdfPasswordInput
        value=""
        onChange={handleChange}
        disabled={false}
        hasError={true}
        errorMessage={errorMessage}
      />
    );

    // Assert: Check that the input has error styling and the message is visible.
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toHaveClass("border-rose-500");
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  /**
   * Test case to verify that normal styles are applied when there is no error.
   */
  it("applies normal styling when hasError is false", () => {
    // Arrange: Render the component with `hasError` set to false.
    const handleChange = vi.fn();

    render(<PdfPasswordInput value="" onChange={handleChange} disabled={false} hasError={false} />);

    // Assert: Check that the input has default border styling and no error styling.
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toHaveClass("border-slate-200");
    expect(input).not.toHaveClass("border-rose-500");
  });

  /**
   * Test case to verify that a custom placeholder can be rendered.
   */
  it("renders with a custom placeholder", () => {
    // Arrange: Render the component with a custom `placeholder` prop.
    const handleChange = vi.fn();
    const customPlaceholder = "Custom Placeholder";

    render(
      <PdfPasswordInput
        value=""
        onChange={handleChange}
        disabled={false}
        placeholder={customPlaceholder}
      />
    );

    // Assert: Verify that the custom placeholder text is present in the document.
    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
  });
});
