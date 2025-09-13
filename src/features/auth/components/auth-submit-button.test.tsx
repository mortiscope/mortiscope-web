import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { AuthSubmitButton } from "@/features/auth/components/auth-submit-button";

// Groups related tests into a suite for the Auth Submit Button component.
describe("AuthSubmitButton", () => {
  /**
   * Test case to verify that the component correctly renders the text provided as its children.
   */
  it("renders children text", () => {
    // Arrange: Render the component with child text.
    render(<AuthSubmitButton>Sign In</AuthSubmitButton>);

    // Assert: Check that a button with the correct accessible name is in the document.
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  /**
   * Test case to ensure the button defaults to `type="submit"`, which is the standard for form submission.
   */
  it("renders as submit button by default", () => {
    // Arrange: Render the component.
    render(<AuthSubmitButton>Submit</AuthSubmitButton>);

    // Act: Find the button.
    const button = screen.getByRole("button", { name: "Submit" });
    // Assert: Verify its `type` attribute.
    expect(button).toHaveAttribute("type", "submit");
  });

  /**
   * Test case to verify that the `type` prop can override the default.
   */
  it("renders as button type when specified", () => {
    // Arrange: Render the component with `type="button"`.
    render(<AuthSubmitButton type="button">Click Me</AuthSubmitButton>);

    // Act: Find the button.
    const button = screen.getByRole("button", { name: "Click Me" });
    // Assert: Verify its `type` attribute is "button".
    expect(button).toHaveAttribute("type", "button");
  });

  /**
   * Test case to ensure the button displays the `pendingText` and hides the default children
   * when the `isPending` prop is true.
   */
  it("shows pending text when isPending is true", () => {
    // Arrange: Render the component in a pending state with custom text.
    render(
      <AuthSubmitButton isPending={true} pendingText="Signing in...">
        Sign In
      </AuthSubmitButton>
    );

    // Assert: Check that the pending text is rendered and the original text is not.
    expect(screen.getByRole("button", { name: "Signing in..." })).toBeInTheDocument();
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the default "Loading..." text when `isPending` is true but no `pendingText` is provided.
   */
  it("shows default loading text when isPending is true and no pendingText provided", () => {
    // Arrange: Render the component in a pending state without custom text.
    render(<AuthSubmitButton isPending={true}>Sign In</AuthSubmitButton>);

    // Assert: Check for the default loading text.
    expect(screen.getByRole("button", { name: "Loading..." })).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `isDisabled` prop correctly disables the button.
   */
  it("disables button when isDisabled is true", () => {
    // Arrange: Render the component with `isDisabled={true}`.
    render(<AuthSubmitButton isDisabled={true}>Sign In</AuthSubmitButton>);

    // Act: Find the button.
    const button = screen.getByRole("button", { name: "Sign In" });
    // Assert: Check that the button is disabled.
    expect(button).toBeDisabled();
  });

  /**
   * Test case to simulate a user click and verify that the `onClick` handler is called.
   */
  it("calls onClick handler when clicked", async () => {
    // Arrange: Create a mock function, set up `user-event`, and render the component.
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <AuthSubmitButton type="button" onClick={handleClick}>
        Click Me
      </AuthSubmitButton>
    );

    // Act: Find and click the button.
    const button = screen.getByRole("button", { name: "Click Me" });
    await user.click(button);

    // Assert: Check that the mock handler was called exactly once.
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to ensure the `onClick` handler is not called when the button is disabled.
   */
  it("does not call onClick when disabled", async () => {
    // Arrange: Create a mock function and render a disabled button.
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <AuthSubmitButton type="button" onClick={handleClick} isDisabled={true}>
        Click Me
      </AuthSubmitButton>
    );

    // Act: Find and click the disabled button.
    const button = screen.getByRole("button", { name: "Click Me" });
    await user.click(button);

    // Assert: Check that the mock handler was not called.
    expect(handleClick).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the `asChild` pattern, where the component's styles are applied to a
   * child element (in this case, an `<a>` tag) instead of rendering its own `<button>`.
   */
  it("renders with asChild pattern", () => {
    // Arrange: Render the component with `asChild` and a child link.
    render(
      <AuthSubmitButton asChild>
        <a href="/dashboard">Go to Dashboard</a>
      </AuthSubmitButton>
    );

    // Assert: Check that a link with the correct text and `href` is rendered.
    const link = screen.getByRole("link", { name: "Go to Dashboard" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  /**
   * Test case to check for the application of specific CSS classes when the button is disabled.
   */
  it("applies disabled cursor style when disabled", () => {
    // Arrange: Render the component in a disabled state.
    const { container } = render(<AuthSubmitButton isDisabled={true}>Sign In</AuthSubmitButton>);

    // Act: Query the rendered DOM for the specific class.
    const wrapper = container.querySelector(".cursor-not-allowed");
    // Assert: Check that the element with the class exists.
    expect(wrapper).toBeInTheDocument();
  });

  /**
   * Test case to ensure the disabled-specific CSS class is not present by default.
   */
  it("does not apply disabled cursor style when not disabled", () => {
    // Arrange: Render the component in its default, enabled state.
    const { container } = render(<AuthSubmitButton>Sign In</AuthSubmitButton>);

    // Act: Query the rendered DOM.
    const wrapper = container.querySelector(".cursor-not-allowed");
    // Assert: Check that the element with the class does not exist.
    expect(wrapper).not.toBeInTheDocument();
  });

  /**
   * Test case to explicitly verify that the standard children are shown when not in a pending state.
   */
  it("shows children when not pending", () => {
    // Arrange: Render with `isPending={false}`.
    render(<AuthSubmitButton isPending={false}>Sign In</AuthSubmitButton>);

    // Assert: The button with the child text is visible.
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  /**
   * Test case to verify that the button is correctly disabled and shows pending text
   * when both `isPending` and `isDisabled` are true.
   */
  it("handles both isPending and isDisabled states", () => {
    // Arrange: Render with both props set to true.
    render(
      <AuthSubmitButton isPending={true} isDisabled={true} pendingText="Processing...">
        Submit
      </AuthSubmitButton>
    );

    // Act: Find the button by its pending text.
    const button = screen.getByRole("button", { name: "Processing..." });
    // Assert: Check that the button is disabled.
    expect(button).toBeDisabled();
  });
});
