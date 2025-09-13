import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { signUp } from "@/features/auth/actions/signup";
import SignUpForm from "@/features/auth/components/sign-up-form";

// Mocks the server action used for registration.
vi.mock("@/features/auth/actions/signup", () => ({
  signUp: vi.fn(),
}));

// Groups related tests for the SignUpForm component.
describe("SignUpForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that all necessary form fields are rendered correctly.
   */
  it("renders the sign-up form elements", () => {
    // Arrange: Render the component.
    render(<SignUpForm />);

    // Assert: Check for the presence of all input fields and the submit button.
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // Using placeholder text for passwords to avoid conflict with "Show Password" buttons
    expect(screen.getByPlaceholderText(/^enter your password$/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^confirm your password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  /**
   * Test case to ensure the submit button is disabled when the form is empty or invalid.
   */
  it("disables the submit button when the form is invalid", async () => {
    // Arrange: Render the component and setup user interactions.
    const user = userEvent.setup();
    render(<SignUpForm />);
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    // Assert: Button should be disabled initially due to empty fields.
    expect(submitButton).toBeDisabled();

    // Act: Fill the form but leave passwords non-matching.
    await user.type(screen.getByLabelText(/first name/i), "Mortiscope");
    await user.type(screen.getByLabelText(/last name/i), "Account");
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    await user.type(screen.getByPlaceholderText(/^enter your password$/i), "Password123!");
    await user.type(screen.getByPlaceholderText(/^confirm your password$/i), "Mismatch!");

    // Assert: Button should remain disabled due to validation error.
    expect(submitButton).toBeDisabled();
  });

  /**
   * Test case to verify that the signUp action is called with correct data on valid submission.
   */
  it("calls the signUp action with form values on valid submission", async () => {
    // Arrange: Mock successful sign-up response.
    const user = userEvent.setup();
    vi.mocked(signUp).mockResolvedValue({ success: "Verification email sent!" });
    render(<SignUpForm />);

    // Act: Fill out the form with valid data.
    await user.type(screen.getByLabelText(/first name/i), "Mortiscope");
    await user.type(screen.getByLabelText(/last name/i), "Account");
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    await user.type(screen.getByPlaceholderText(/^enter your password$/i), "Password123!");
    await user.type(screen.getByPlaceholderText(/^confirm your password$/i), "Password123!");

    const submitButton = screen.getByRole("button", { name: /sign up/i });

    // Assert: Check button is enabled and click it.
    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    // Assert: Verify the server action was called with the correct payload.
    expect(signUp).toHaveBeenCalledWith({
      firstName: "Mortiscope",
      lastName: "Account",
      email: "mortiscope@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
  });

  /**
   * Test case to verify that a success message is displayed after successful registration.
   */
  it("displays a success message when sign-up succeeds", async () => {
    // Arrange: Mock the signUp action to return a success message.
    const user = userEvent.setup();
    const successMessage = "Verification email sent!";
    vi.mocked(signUp).mockResolvedValue({ success: successMessage });
    render(<SignUpForm />);

    // Act: Submit the form with valid data.
    await user.type(screen.getByLabelText(/first name/i), "Mortiscope");
    await user.type(screen.getByLabelText(/last name/i), "Account");
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    await user.type(screen.getByPlaceholderText(/^enter your password$/i), "Password123!");
    await user.type(screen.getByPlaceholderText(/^confirm your password$/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    // Assert: Wait for the success message to appear.
    await waitFor(() => {
      expect(screen.getByText(successMessage)).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that server-side errors are displayed to the user.
   */
  it("displays an error message when sign-up fails", async () => {
    // Arrange: Mock the signUp action to return an error.
    const user = userEvent.setup();
    const errorMessage = "Email already in use";
    vi.mocked(signUp).mockResolvedValue({ error: errorMessage });
    render(<SignUpForm />);

    // Act: Submit the form.
    await user.type(screen.getByLabelText(/first name/i), "Mortiscope");
    await user.type(screen.getByLabelText(/last name/i), "Account");
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    await user.type(screen.getByPlaceholderText(/^enter your password$/i), "Password123!");
    await user.type(screen.getByPlaceholderText(/^confirm your password$/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    // Assert: Wait for the error message to appear.
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  /**
   * Test case to ensure the loading state is displayed during submission.
   */
  it("shows loading state while submission is pending", async () => {
    // Arrange: Mock `signUp` to never resolve immediately.
    const user = userEvent.setup();
    vi.mocked(signUp).mockImplementation(() => new Promise(() => {}));
    render(<SignUpForm />);

    // Act: Submit the form.
    await user.type(screen.getByLabelText(/first name/i), "Mortiscope");
    await user.type(screen.getByLabelText(/last name/i), "Account");
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    await user.type(screen.getByPlaceholderText(/^enter your password$/i), "Password123!");
    await user.type(screen.getByPlaceholderText(/^confirm your password$/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    // Assert: Check if the button text changes to indicate loading.
    expect(screen.getByRole("button", { name: /signing up/i })).toBeDisabled();
  });
});
