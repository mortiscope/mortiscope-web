import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { AuthPasswordInput } from "@/features/auth/components/auth-password-input";

/**
 * A simple wrapper component that provides the necessary `react-hook-form` context
 * for the `AuthPasswordInput` component to render correctly within tests.
 */
function TestFormWrapper({ children }: { children: React.ReactNode }) {
  // Initializes the form context that `FormProvider` then provides.
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
}

// Groups related tests into a suite for the Auth Password Input component.
describe("AuthPasswordInput", () => {
  // A mock `field` object is created to simulate the props passed by `react-hook-form`'s `Controller`.
  const mockField = {
    name: "password",
    value: "",
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
  };

  // A default set of props is defined to be reused across multiple tests.
  const defaultProps = {
    field: mockField,
    label: "Password",
    placeholder: "Enter your password",
    id: "password",
  };

  /**
   * Test case to verify that the component renders its basic elements: the label and the input with a placeholder.
   */
  it("renders with label and placeholder", () => {
    // Arrange: Render the component within the form context wrapper.
    render(
      <TestFormWrapper>
        <AuthPasswordInput {...defaultProps} />
      </TestFormWrapper>
    );

    // Assert: Check that the input can be found by its label and placeholder text.
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  });

  /**
   * Test case to ensure the input field defaults to `type="password"` for security.
   */
  it("renders password input with type password by default", () => {
    // Arrange: Render the component.
    render(
      <TestFormWrapper>
        <AuthPasswordInput {...defaultProps} />
      </TestFormWrapper>
    );

    // Act: Find the input element.
    const input = screen.getByPlaceholderText("Enter your password");
    // Assert: Verify its `type` attribute.
    expect(input).toHaveAttribute("type", "password");
  });

  /**
   * Test case to verify the presence and accessibility of the visibility toggle button.
   */
  it("renders toggle button with correct aria-label", () => {
    // Arrange: Render the component.
    render(
      <TestFormWrapper>
        <AuthPasswordInput {...defaultProps} />
      </TestFormWrapper>
    );

    // Act: Find the button by its accessible name (aria-label).
    const toggleButton = screen.getByRole("button", { name: /show password/i });
    // Assert: Check that the button is in the document.
    expect(toggleButton).toBeInTheDocument();
  });

  /**
   * Test case to simulate a user clicking the visibility toggle button and verify that the
   * input type and button's accessible name change accordingly.
   */
  it("toggles password visibility when button is clicked", async () => {
    // Arrange: Set up `user-event` and render the component.
    const user = userEvent.setup();
    render(
      <TestFormWrapper>
        <AuthPasswordInput {...defaultProps} />
      </TestFormWrapper>
    );

    const input = screen.getByPlaceholderText("Enter your password");
    const toggleButton = screen.getByRole("button", { name: /show password/i });

    // Assert: Check the initial state.
    expect(input).toHaveAttribute("type", "password");

    // Act: Simulate a user click on the toggle button.
    await user.click(toggleButton);
    // Assert: Verify the input type and button label have changed.
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();

    // Act: Click the button again.
    await user.click(toggleButton);
    // Assert: Verify it has reverted to the original state.
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `disabled` prop correctly disables the input field.
   */
  it("disables input when disabled prop is true", () => {
    // Arrange: Render the component with the `disabled` prop set to true.
    render(
      <TestFormWrapper>
        <AuthPasswordInput {...defaultProps} disabled={true} />
      </TestFormWrapper>
    );

    // Act: Find the input element.
    const input = screen.getByPlaceholderText("Enter your password");
    // Assert: Check that the input is disabled.
    expect(input).toBeDisabled();
  });

  /**
   * Test case to ensure the `id` prop is correctly applied to the input element.
   */
  it("applies custom id to input", () => {
    // Arrange: Render the component with a custom `id`.
    render(
      <TestFormWrapper>
        <AuthPasswordInput {...defaultProps} id="custom-password-id" />
      </TestFormWrapper>
    );

    // Act: Find the input element.
    const input = screen.getByPlaceholderText("Enter your password");
    // Assert: Verify its `id` attribute.
    expect(input).toHaveAttribute("id", "custom-password-id");
  });

  /**
   * Test case to verify that the `field` prop from `react-hook-form` is correctly connected to the input.
   */
  it("connects field props to input", async () => {
    // Arrange: Set up `user-event` and render the component.
    const user = userEvent.setup();
    render(
      <TestFormWrapper>
        <AuthPasswordInput {...defaultProps} />
      </TestFormWrapper>
    );

    const input = screen.getByPlaceholderText("Enter your password");

    // Act: Simulate a user typing into the input field.
    await user.type(input, "test@123");

    // Assert: Check that the mock `onChange` function was called.
    expect(mockField.onChange).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the toggle button has `tabIndex="-1"`
   */
  it("toggle button has tabIndex -1", () => {
    // Arrange: Render the component.
    render(
      <TestFormWrapper>
        <AuthPasswordInput {...defaultProps} />
      </TestFormWrapper>
    );

    // Act: Find the toggle button.
    const toggleButton = screen.getByRole("button", { name: /show password/i });
    // Assert: Verify its `tabIndex` attribute.
    expect(toggleButton).toHaveAttribute("tabIndex", "-1");
  });
});
