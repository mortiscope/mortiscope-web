import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { resetPassword } from "@/features/auth/actions/reset-password";
import ResetPasswordForm from "@/features/auth/components/reset-password-form";

// Mock Next.js navigation hooks to control URL parameters in tests.
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

// Mock server action for password reset.
vi.mock("@/features/auth/actions/reset-password", () => ({
  resetPassword: vi.fn(),
}));

// Groups related tests into a suite for the Reset Password Form component.
describe("ResetPasswordForm", () => {
  // Mock function to track search params behavior.
  const mockGet = vi.fn();

  // Reset all mocks before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchParams).mockReturnValue({
      get: mockGet,
    } as unknown as ReturnType<typeof useSearchParams>);
  });

  /**
   * Test case to verify that error state is rendered when no token in URL.
   */
  it("renders error state when no token in URL", async () => {
    // Arrange: Mock the search params to return null for token.
    mockGet.mockReturnValue(null);
    render(<ResetPasswordForm />);

    // Assert: Check if the error message is displayed.
    await waitFor(() => {
      expect(
        screen.getByText("It looks like this password reset link is invalid.")
      ).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that "Go to Forgot Password" link is rendered in error state.
   */
  it("renders Go to Forgot Password link in error state", async () => {
    // Arrange: Mock the search params to return null for token.
    mockGet.mockReturnValue(null);
    render(<ResetPasswordForm />);

    // Assert: Check if the link is present with correct href.
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "Go to Forgot Password" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/forgot-password");
    });
  });

  /**
   * Test case to verify that the form renders with title and description when token exists.
   */
  it("renders form with title and description when token exists", async () => {
    // Arrange: Mock the search params to return a valid token.
    mockGet.mockReturnValue("valid-token-123");
    render(<ResetPasswordForm />);

    // Assert: Check if the heading and description are present.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Reset Password" })).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Enter your new password below. Make sure that it meets the security requirements."
      )
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the new password input field is rendered.
   */
  it("renders new password input field", async () => {
    // Arrange: Mock the search params to return a valid token.
    mockGet.mockReturnValue("valid-token-123");
    render(<ResetPasswordForm />);

    // Assert: Check if the new password input is present.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    expect(screen.getByText("New Password")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the confirm password input field is rendered.
   */
  it("renders confirm password input field", async () => {
    // Arrange: Mock the search params to return a valid token.
    mockGet.mockReturnValue("valid-token-123");
    render(<ResetPasswordForm />);

    // Assert: Check if the confirm password input is present.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Confirm your new password")).toBeInTheDocument();
    });
    expect(screen.getByText("Confirm New Password")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the Reset Password button is rendered.
   */
  it("renders Reset Password submit button", async () => {
    // Arrange: Mock the search params to return a valid token.
    mockGet.mockReturnValue("valid-token-123");
    render(<ResetPasswordForm />);

    // Assert: Check if the submit button is present.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reset Password" })).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the submit button is disabled when form is invalid.
   */
  it("disables submit button when form is invalid", async () => {
    // Arrange: Mock the search params to return a valid token.
    mockGet.mockReturnValue("valid-token-123");
    render(<ResetPasswordForm />);

    // Assert: Check that the button is disabled when inputs are empty.
    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Reset Password" });
      expect(button).toBeDisabled();
    });
  });

  /**
   * Test case to verify that the submit button is enabled when form is valid.
   */
  it("enables submit button when form is valid", async () => {
    // Arrange: Mock the search params to return a valid token.
    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Type valid passwords in both fields.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText("Enter your new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm your new password");

    await user.type(newPasswordInput, "NewPassword123!");
    await user.type(confirmPasswordInput, "NewPassword123!");

    // Assert: Check that the button is enabled.
    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Reset Password" });
      expect(button).not.toBeDisabled();
    });
  });

  /**
   * Test case to verify that the user can type in password fields.
   */
  it("allows typing in password fields", async () => {
    // Arrange: Mock the search params to return a valid token.
    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Type in the input fields.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText(
      "Enter your new password"
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm your new password"
    ) as HTMLInputElement;

    await user.type(newPasswordInput, "TestPass123!");
    await user.type(confirmPasswordInput, "TestPass123!");

    // Assert: Check that the input values are updated.
    expect(newPasswordInput.value).toBe("TestPass123!");
    expect(confirmPasswordInput.value).toBe("TestPass123!");
  });

  /**
   * Test case to verify that the form calls resetPassword on submission.
   */
  it("calls resetPassword on form submission", async () => {
    // Arrange: Mock the reset password function.
    vi.mocked(resetPassword).mockResolvedValue({
      error: "Invalid token",
    });

    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText("Enter your new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm your new password");

    await user.type(newPasswordInput, "NewPassword123!");
    await user.type(confirmPasswordInput, "NewPassword123!");

    const button = screen.getByRole("button", { name: "Reset Password" });
    await user.click(button);

    // Assert: Check that the reset password function was called.
    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith(
        {
          newPassword: "NewPassword123!",
          confirmNewPassword: "NewPassword123!",
        },
        "valid-token-123"
      );
    });
  });

  /**
   * Test case to verify that success message is shown on successful password reset.
   */
  it("shows success message on successful password reset", async () => {
    // Arrange: Mock successful password reset.
    vi.mocked(resetPassword).mockResolvedValue({
      success: "Your password has been reset successfully.",
    });

    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText("Enter your new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm your new password");

    await user.type(newPasswordInput, "NewPassword123!");
    await user.type(confirmPasswordInput, "NewPassword123!");

    const button = screen.getByRole("button", { name: "Reset Password" });
    await user.click(button);

    // Assert: Check that success message is displayed.
    await waitFor(() => {
      expect(screen.getByText("Your password has been reset successfully.")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that error message is shown on failed password reset.
   */
  it("shows error message on failed password reset", async () => {
    // Arrange: Mock failed password reset.
    vi.mocked(resetPassword).mockResolvedValue({
      error: "The reset link has expired. Please request a new one.",
    });

    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText("Enter your new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm your new password");

    await user.type(newPasswordInput, "NewPassword123!");
    await user.type(confirmPasswordInput, "NewPassword123!");

    const button = screen.getByRole("button", { name: "Reset Password" });
    await user.click(button);

    // Assert: Check that error message is displayed.
    await waitFor(() => {
      expect(
        screen.getByText("The reset link has expired. Please request a new one.")
      ).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that "Back to Sign In" link is shown after successful reset.
   */
  it("shows Back to Sign In link after successful reset", async () => {
    // Arrange: Mock successful password reset.
    vi.mocked(resetPassword).mockResolvedValue({
      success: "Your password has been reset successfully.",
    });

    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText("Enter your new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm your new password");

    await user.type(newPasswordInput, "NewPassword123!");
    await user.type(confirmPasswordInput, "NewPassword123!");

    const button = screen.getByRole("button", { name: "Reset Password" });
    await user.click(button);

    // Assert: Check that "Back to Sign In" link is displayed.
    await waitFor(() => {
      const link = screen.getByRole("link", { name: "Back to Sign In" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/signin");
    });
  });

  /**
   * Test case to verify that "Back to Sign In" link is shown in form state.
   */
  it("shows Back to Sign In link in form state", async () => {
    // Arrange: Mock the search params to return a valid token.
    mockGet.mockReturnValue("valid-token-123");
    render(<ResetPasswordForm />);

    // Assert: Check if the link is present with correct href.
    await waitFor(() => {
      const links = screen.getAllByRole("link", { name: /back to sign in/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", "/signin");
    });
  });

  /**
   * Test case to verify that form is hidden after successful reset.
   */
  it("hides form after successful reset", async () => {
    // Arrange: Mock successful password reset.
    vi.mocked(resetPassword).mockResolvedValue({
      success: "Your password has been reset successfully.",
    });

    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText("Enter your new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm your new password");

    await user.type(newPasswordInput, "NewPassword123!");
    await user.type(confirmPasswordInput, "NewPassword123!");

    const button = screen.getByRole("button", { name: "Reset Password" });
    await user.click(button);

    // Assert: Check that form inputs are no longer present.
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Enter your new password")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Confirm your new password")).not.toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that inputs are disabled during submission.
   */
  it("disables inputs during submission", async () => {
    // Arrange: Mock password reset with a delay to keep pending state.
    vi.mocked(resetPassword).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                error: "Invalid token",
              }),
            100
          )
        )
    );

    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText(
      "Enter your new password"
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm your new password"
    ) as HTMLInputElement;

    await user.type(newPasswordInput, "NewPassword123!");
    await user.type(confirmPasswordInput, "NewPassword123!");

    const button = screen.getByRole("button", { name: "Reset Password" });
    await user.click(button);

    // Assert: Check that inputs are disabled during pending state.
    await waitFor(() => {
      expect(newPasswordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
    });
  });

  /**
   * Test case to verify that submit button shows pending text during submission.
   */
  it("shows pending text on submit button during submission", async () => {
    // Arrange: Mock password reset with a delay to keep pending state.
    vi.mocked(resetPassword).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                error: "Invalid token",
              }),
            100
          )
        )
    );

    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText("Enter your new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm your new password");

    await user.type(newPasswordInput, "NewPassword123!");
    await user.type(confirmPasswordInput, "NewPassword123!");

    const button = screen.getByRole("button", { name: "Reset Password" });
    await user.click(button);

    // Assert: Check that button shows "Resetting..." text.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Resetting..." })).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that description is hidden after successful reset.
   */
  it("hides description after successful reset", async () => {
    // Arrange: Mock successful password reset.
    vi.mocked(resetPassword).mockResolvedValue({
      success: "Your password has been reset successfully.",
    });

    mockGet.mockReturnValue("valid-token-123");
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    });
    const newPasswordInput = screen.getByPlaceholderText("Enter your new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm your new password");

    await user.type(newPasswordInput, "NewPassword123!");
    await user.type(confirmPasswordInput, "NewPassword123!");

    const button = screen.getByRole("button", { name: "Reset Password" });
    await user.click(button);

    // Assert: Check that description is no longer present.
    await waitFor(() => {
      expect(
        screen.queryByText(
          "Enter your new password below."
        )
      ).not.toBeInTheDocument();
    });
  });
});
