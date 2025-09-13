import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent, waitFor } from "@/__tests__/setup/test-utils";
import { forgotPassword } from "@/features/auth/actions/forgot-password";
import ForgotPasswordForm from "@/features/auth/components/forgot-password-form";

// Mock the server action to prevent actual API calls during testing.
vi.mock("@/features/auth/actions/forgot-password", () => ({
  forgotPassword: vi.fn(),
}));

// Groups related tests into a suite for the Forgot Password Form.
describe("ForgotPasswordForm", () => {
  /**
   * Test case to verify that the form renders all necessary elements correctly.
   */
  it("renders the form elements correctly", () => {
    // Arrange: Render the component.
    render(<ForgotPasswordForm />);

    // Assert: Verify the presence of headers, inputs, and buttons.
    expect(screen.getByRole("heading", { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();

    // Assert: Verify the footer link exists.
    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute(
      "href",
      "/signin"
    );
  });

  /**
   * Test case to ensure the submit button is disabled by default (due to empty invalid form).
   */
  it("has the submit button disabled initially", () => {
    // Arrange: Render the component.
    render(<ForgotPasswordForm />);

    // Assert: The button should be disabled because the form is invalid (empty email).
    const submitButton = screen.getByRole("button", { name: /send reset link/i });
    expect(submitButton).toBeDisabled();
  });

  /**
   * Test case to verify that validation errors appear for invalid inputs and keep the button disabled.
   */
  it("validates email format and keeps button disabled for invalid input", async () => {
    // Arrange: Setup user event and render.
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    // Act: Type an invalid email.
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "not-an-email");

    // Assert: The button should remain disabled.
    const submitButton = screen.getByRole("button", { name: /send reset link/i });
    expect(submitButton).toBeDisabled();
  });

  /**
   * Test case to verify the successful submission flow.
   */
  it("calls the forgotPassword action with correct values on valid submission", async () => {
    // Arrange: Setup user, mock success response, and render.
    const user = userEvent.setup();
    const successMessage = "Reset link sent to your email";

    // Mock the server action to return a success object.
    vi.mocked(forgotPassword).mockResolvedValue({ success: successMessage });

    render(<ForgotPasswordForm />);

    // Act: Type a valid email and submit.
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "mortiscope@example.com");

    const submitButton = screen.getByRole("button", { name: /send reset link/i });

    // Wait for the button to become enabled (form is valid).
    await waitFor(() => expect(submitButton).toBeEnabled());

    await user.click(submitButton);

    // Assert: Check if the action was called with the correct email.
    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith({ email: "mortiscope@example.com" });
    });

    // Assert: Verify the success message is displayed.
    expect(screen.getByText(successMessage)).toBeInTheDocument();
  });

  /**
   * Test case to verify how the form handles server-side errors.
   */
  it("displays an error message when the action fails", async () => {
    // Arrange: Setup user, mock error response, and render.
    const user = userEvent.setup();
    const errorMessage = "User not found";

    // Mock the server action to return an error object.
    vi.mocked(forgotPassword).mockResolvedValue({ error: errorMessage });

    render(<ForgotPasswordForm />);

    // Act: Type a valid email and submit.
    await user.type(screen.getByLabelText(/email/i), "nonexistent@example.com");

    const submitButton = screen.getByRole("button", { name: /send reset link/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    // Assert: Verify the error message is displayed.
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify the button shows a loading state during submission.
   */
  it("shows loading state while mutation is pending", async () => {
    // Arrange: Setup user and a delayed mock to simulate network latency.
    const user = userEvent.setup();

    // Create a promise that can control or simply delay.
    vi.mocked(forgotPassword).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { success: "Done" };
    });

    render(<ForgotPasswordForm />);

    // Act: Type valid email and submit.
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    const submitButton = screen.getByRole("button", { name: /send reset link/i });
    await user.click(submitButton);

    // Assert: Check for loading text immediately after click.
    expect(screen.getByText(/sending.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Act: Wait for the mock to resolve.
    await waitFor(() => {
      expect(screen.queryByText(/sending.../i)).not.toBeInTheDocument();
    });
  });
});
