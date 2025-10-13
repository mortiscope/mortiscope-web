import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { AccountPasswordInput } from "@/features/account/components/account-password-input";

// Mock the phosphorus icon library to verify specific icon rendering for eye toggles and status seals.
vi.mock("react-icons/pi", () => ({
  PiEye: () => <div data-testid="icon-eye" />,
  PiEyeSlash: () => <div data-testid="icon-eye-slash" />,
  PiSealPercent: () => <div data-testid="icon-seal-percent" />,
  PiSealWarning: () => <div data-testid="icon-seal-warning" />,
}));

/**
 * Test suite for the `AccountPasswordInput` component.
 */
describe("AccountPasswordInput", () => {
  /**
   * Test case to verify that the component initializes with standard attributes and a hidden password type.
   */
  it("renders with default props", () => {
    // Arrange: Render the password input with default settings.
    render(<AccountPasswordInput />);

    // Assert: Verify the presence of the placeholder, the password input type, and the initial eye-slash icon.
    const input = screen.getByPlaceholderText("Enter your password");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");

    const toggleButton = screen.getByRole("button", { name: "Show password" });
    expect(toggleButton).toBeInTheDocument();

    expect(screen.getByTestId("icon-eye-slash")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the toggle button switches the input between plain text and obscured characters.
   */
  it("toggles password visibility when button is clicked", () => {
    // Arrange: Render the component.
    render(<AccountPasswordInput />);

    const input = screen.getByPlaceholderText("Enter your password");
    const toggleButton = screen.getByRole("button", { name: "Show password" });

    // Assert: Check the initial hidden state.
    expect(input).toHaveAttribute("type", "password");
    expect(screen.queryByTestId("icon-eye-slash")).toBeInTheDocument();

    // Act: Click the button to reveal the password.
    fireEvent.click(toggleButton);

    // Assert: Verify the type changed to text and the icon/aria-label updated.
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByTestId("icon-eye")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-eye-slash")).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute("aria-label", "Hide password");

    // Act: Click the button again to hide the password.
    fireEvent.click(toggleButton);

    // Assert: Confirm the state returned to the original hidden configuration.
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByTestId("icon-eye-slash")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the disabled state prevents interaction with both the field and the visibility toggle.
   */
  it("disables both input and toggle button when disabled prop is true", () => {
    // Arrange: Render the component with the `disabled` prop enabled.
    render(<AccountPasswordInput disabled />);

    const input = screen.getByPlaceholderText("Enter your password");
    const toggleButton = screen.getByRole("button");

    // Assert: Verify that neither element can receive focus or interaction.
    expect(input).toBeDisabled();
    expect(toggleButton).toBeDisabled();
  });

  /**
   * Test case to verify that error-specific TailWind classes are applied when a validation failure occurs.
   */
  it("applies error styling when hasError is true", () => {
    // Arrange: Render the component with the `hasError` state active.
    render(<AccountPasswordInput hasError />);

    const input = screen.getByPlaceholderText("Enter your password");

    // Assert: Confirm that specific red border classes are applied for visual feedback.
    expect(input).toHaveClass("border-red-500");
    expect(input).toHaveClass("focus-visible:!border-red-500");
  });

  /**
   * Test case to verify that custom HTML attributes and CSS classes are correctly propagated to the input.
   */
  it("applies custom placeholder and className", () => {
    // Arrange: Provide custom strings for the `placeholder` and `className` props.
    render(<AccountPasswordInput placeholder="Custom Placeholder" className="custom-class" />);

    // Assert: Verify the input element reflects these specific values.
    const input = screen.getByPlaceholderText("Custom Placeholder");
    expect(input).toHaveClass("custom-class");
  });

  /**
   * Test case to verify that the component correctly maps focus ring colors based on the theme prop.
   */
  it("applies correct focus color classes based on props", () => {
    // Arrange & Act: Sequentially rerender the component with different `focusColor` values.
    const { rerender } = render(<AccountPasswordInput focusColor="emerald" />);
    let input = screen.getByPlaceholderText("Enter your password");

    // Assert: Verify emerald styling.
    expect(input).toHaveClass("focus-visible:!border-emerald-600");

    // Act: Update to slate theme.
    rerender(<AccountPasswordInput focusColor="slate" />);
    input = screen.getByPlaceholderText("Enter your password");

    // Assert: Verify slate styling.
    expect(input).toHaveClass("focus-visible:!border-slate-600");

    // Act: Update to rose theme.
    rerender(<AccountPasswordInput focusColor="rose" />);
    input = screen.getByPlaceholderText("Enter your password");

    // Assert: Verify rose styling.
    expect(input).toHaveClass("focus-visible:!border-rose-600");
  });

  /**
   * Test case to verify that the component defaults to a rose theme if no focus color is specified.
   */
  it("defaults to rose focus color if not specified", () => {
    // Arrange: Render the component with default props.
    render(<AccountPasswordInput />);

    const input = screen.getByPlaceholderText("Enter your password");

    // Assert: Verify that the default rose styling is applied.
    expect(input).toHaveClass("focus-visible:!border-rose-600");
  });

  /**
   * Test case to verify that React refs are correctly attached to the underlying HTML input element.
   */
  it("forwards ref to the input element", () => {
    // Arrange: Create a React ref.
    const ref = React.createRef<HTMLInputElement>();
    render(<AccountPasswordInput ref={ref} />);

    // Assert: Verify that the ref points to a valid input element with the expected initial state.
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe("password");
  });

  /**
   * Test case to verify that standard HTML attributes are passed through to the native input element.
   */
  it("passes through standard input attributes", () => {
    // Arrange: Provide native attributes like `name`, `id`, and `maxLength`.
    render(<AccountPasswordInput name="password-field" id="pwd-id" maxLength={20} />);

    const input = screen.getByPlaceholderText("Enter your password");

    // Assert: Verify that each attribute is correctly mapped to the rendered HTML.
    expect(input).toHaveAttribute("name", "password-field");
    expect(input).toHaveAttribute("id", "pwd-id");
    expect(input).toHaveAttribute("maxLength", "20");
  });
});
