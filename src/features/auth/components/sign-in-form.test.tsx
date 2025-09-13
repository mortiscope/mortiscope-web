import { userEvent } from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { signIn } from "@/features/auth/actions/signin";
import SignInForm from "@/features/auth/components/sign-in-form";

// Mocks the server action used for authentication.
vi.mock("@/features/auth/actions/signin", () => ({
  signIn: vi.fn(),
}));

// Mocks the router to assert redirection logic.
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Groups related tests for the SignInForm component.
describe("SignInForm", () => {
  // A mock function for the router push method.
  const pushMock = vi.fn();

  beforeEach(() => {
    // Reset the router mock before each test.
    vi.mocked(useRouter).mockReturnValue({
      push: pushMock,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that all necessary form elements are rendered correctly.
   */
  it("renders the sign-in form elements", () => {
    // Arrange: Render the component.
    render(<SignInForm />);

    // Assert: Check for the presence of inputs, buttons, and links.
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // specific placeholder check to avoid conflict with "Show password" button
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  /**
   * Test case to ensure the submit button is disabled initially or when inputs are invalid.
   */
  it("disables the submit button when the form is invalid", async () => {
    // Arrange: Render the component and setup user interactions.
    const user = userEvent.setup();
    render(<SignInForm />);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    // Assert: Button should be disabled initially (due to empty fields).
    expect(submitButton).toBeDisabled();

    // Act: Enter an invalid email.
    await user.type(screen.getByLabelText(/email/i), "invalid-email");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "123");

    // Assert: Button should remain disabled due to validation schema.
    expect(submitButton).toBeDisabled();
  });

  /**
   * Test case to verify that the signIn action is called with correct data on submission.
   */
  it("calls the signIn action with form values on valid submission", async () => {
    // Arrange: Mock successful sign-in response.
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue(undefined);
    render(<SignInForm />);

    // Act: Fill out the form with valid data and submit.
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "Password123!");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    // Assert: Check button is enabled and click it.
    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    // Assert: Verify the server action was called with the correct payload.
    expect(signIn).toHaveBeenCalledWith({
      email: "mortiscope@example.com",
      password: "Password123!",
    });
  });

  /**
   * Test case to verify that server-side errors are displayed to the user.
   */
  it("displays an error message when sign-in fails", async () => {
    // Arrange: Mock the signIn action to return an error.
    const user = userEvent.setup();
    const errorMessage = "Invalid credentials";
    vi.mocked(signIn).mockResolvedValue({ error: errorMessage });
    render(<SignInForm />);

    // Act: Submit the form.
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "WrongPassword!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Assert: Wait for the error message to appear in the document.
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify redirection when Two-Factor Authentication is required.
   */
  it("redirects to the 2FA page if the response requires it", async () => {
    // Arrange: Mock the signIn action to indicate 2FA is required.
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({
      success: "Password verified. Please complete two-factor authentication.",
      requiresTwoFactor: true,
    });
    render(<SignInForm />);

    // Act: Submit the form.
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Assert: Verify that the router pushed the user to the 2FA page.
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/signin/two-factor");
    });
  });

  /**
   * Test case to ensure the loading state is displayed during submission.
   */
  it("shows loading state while submission is pending", async () => {
    // Arrange: Mock signIn to never resolve immediately (simulating network delay).
    const user = userEvent.setup();
    vi.mocked(signIn).mockImplementation(() => new Promise(() => {}));
    render(<SignInForm />);

    // Act: Submit the form.
    await user.type(screen.getByLabelText(/email/i), "mortiscope@example.com");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Assert: Check if the button text changes to indicate loading.
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });
});
