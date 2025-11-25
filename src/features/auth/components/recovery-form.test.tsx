import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { verifySigninRecoveryCode } from "@/features/auth/actions/recovery";
import { completeTwoFactorSignIn } from "@/features/auth/actions/two-factor";
import RecoveryForm from "@/features/auth/components/recovery-form";

// Mock Next.js navigation hooks to control routing behavior in tests.
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

// Mock server action for recovery code verification.
vi.mock("@/features/auth/actions/recovery", () => ({
  verifySigninRecoveryCode: vi.fn(),
}));

// Mock server action for completing two-factor sign-in.
vi.mock("@/features/auth/actions/two-factor", () => ({
  completeTwoFactorSignIn: vi.fn(),
}));

// Groups related tests into a suite for the Recovery Form component.
describe("RecoveryForm", () => {
  // Mock function to track search params behavior.
  const mockGet = vi.fn();

  // Reset all mocks before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchParams).mockReturnValue({
      get: mockGet,
    } as unknown as ReturnType<typeof useSearchParams>);
    // Default: no error in URL
    mockGet.mockReturnValue(null);
  });

  /**
   * Test case to verify that the form renders with correct title and description in normal state.
   */
  it("renders with title and description in normal state", async () => {
    // Arrange: Render the component.
    render(<RecoveryForm />);

    // Assert: Check if the heading and description are present.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Account Recovery" })).toBeInTheDocument();
    });
    expect(
      screen.getByText("Enter one of your recovery codes to complete sign-in.")
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the recovery code input field is rendered.
   */
  it("renders recovery code input field", async () => {
    // Arrange: Render the component.
    render(<RecoveryForm />);

    // Assert: Check if the recovery code input is present.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Enter your recovery code")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the "Back to Sign In" link is rendered in normal state.
   */
  it("renders Back to Sign In link in normal state", async () => {
    // Arrange: Render the component.
    render(<RecoveryForm />);

    // Assert: Check if the link is present with correct href.
    await waitFor(() => {
      const links = screen.getAllByRole("link", { name: /back to sign in/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", "/signin");
    });
  });

  /**
   * Test case to verify that the Verify Code button is rendered.
   */
  it("renders Verify Code submit button", async () => {
    // Arrange: Render the component.
    render(<RecoveryForm />);

    // Assert: Check if the submit button is present.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Verify Code" })).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the error state is rendered when error=no-session in URL.
   */
  it("renders error state when error=no-session in URL", async () => {
    // Arrange: Mock the search params to return "no-session" error.
    mockGet.mockReturnValue("no-session");
    render(<RecoveryForm />);

    // Assert: Check if the error message and button are displayed.
    await waitFor(() => {
      const elements = screen.getAllByText(
        "This page is used to recover your account using a recovery code."
      );
      expect(elements.length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("link", { name: "Back to Sign In" })).toHaveAttribute(
      "href",
      "/signin"
    );
  });

  /**
   * Test case to verify that the recovery code input does not render in error state.
   */
  it("does not render recovery code input in error state", async () => {
    // Arrange: Mock the search params to return "no-session" error.
    mockGet.mockReturnValue("no-session");
    render(<RecoveryForm />);

    // Assert: Check that the input field is not present.
    await waitFor(() => {
      const elements = screen.getAllByText(
        "This page is used to recover your account using a recovery code."
      );
      expect(elements.length).toBeGreaterThan(0);
    });
    expect(screen.queryByLabelText("Recovery Code")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the submit button is disabled when form is invalid.
   */
  it("disables submit button when form is invalid", async () => {
    // Arrange: Render the component.
    render(<RecoveryForm />);

    // Assert: Check that the button is disabled when input is empty.
    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Verify Code" });
      expect(button).toBeDisabled();
    });
  });

  /**
   * Test case to verify that the submit button is enabled when form is valid.
   */
  it("enables submit button when form is valid", async () => {
    // Arrange: Render the component and get user event instance.
    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Type a valid recovery code.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code");
    await user.type(input, "ABCD1234");

    // Assert: Check that the button is enabled.
    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Verify Code" });
      expect(button).not.toBeDisabled();
    });
  });

  /**
   * Test case to verify that the user can type in the recovery code input.
   */
  it("allows typing in recovery code input", async () => {
    // Arrange: Render the component and get user event instance.
    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Type in the input field.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code") as HTMLInputElement;
    await user.type(input, "TEST-CODE");

    // Assert: Check that the input value is updated.
    expect(input.value).toBe("TEST-CODE");
  });

  /**
   * Test case to verify that the form calls verifySigninRecoveryCode on submission.
   */
  it("calls verifySigninRecoveryCode on form submission", async () => {
    // Arrange: Mock the verification function to return a pending state.
    vi.mocked(verifySigninRecoveryCode).mockResolvedValue({
      error: "Invalid code",
    });

    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code");
    await user.type(input, "ABCD1234");

    const button = screen.getByRole("button", { name: "Verify Code" });
    await user.click(button);

    // Assert: Check that the verification function was called.
    await waitFor(() => {
      expect(verifySigninRecoveryCode).toHaveBeenCalledWith("ABCD1234");
    });
  });

  /**
   * Test case to verify that success feedback is shown on successful verification.
   */
  it("shows success feedback on successful verification", async () => {
    // Arrange: Mock successful verification and signIn.
    vi.mocked(verifySigninRecoveryCode).mockResolvedValue({
      success: "Recovery code verified successfully.",
      verified: true,
      email: "mortiscope@example.com",
      userId: "user-123",
    });
    // completeTwoFactorSignIn throws NEXT_REDIRECT on success (handled by Next.js)
    vi.mocked(completeTwoFactorSignIn).mockRejectedValue(
      Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/dashboard;307" })
    );

    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code");
    await user.type(input, "ABCD1234");

    const button = screen.getByRole("button", { name: "Verify Code" });
    await user.click(button);

    // Assert: Check that success message is displayed.
    await waitFor(() => {
      expect(screen.getByText("Recovery successful!")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that error feedback is shown on failed verification.
   */
  it("shows error feedback on failed verification", async () => {
    // Arrange: Mock failed verification.
    vi.mocked(verifySigninRecoveryCode).mockResolvedValue({
      error: "Invalid recovery code",
    });

    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code");
    await user.type(input, "WXYZABCD");

    const button = screen.getByRole("button", { name: "Verify Code" });
    await user.click(button);

    // Assert: Check that error message is displayed.
    await waitFor(() => {
      expect(screen.getByText("Invalid recovery code")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that completeTwoFactorSignIn is called on successful verification.
   */
  it("calls completeTwoFactorSignIn on successful verification", async () => {
    // Arrange: Mock successful verification and server-side sign-in.
    vi.mocked(verifySigninRecoveryCode).mockResolvedValue({
      success: "Recovery code verified successfully.",
      verified: true,
      email: "mortiscope@example.com",
      userId: "user-123",
    });
    vi.mocked(completeTwoFactorSignIn).mockRejectedValue(
      Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/dashboard;307" })
    );

    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code");
    await user.type(input, "ABCD1234");

    const button = screen.getByRole("button", { name: "Verify Code" });
    await user.click(button);

    // Assert: Check that completeTwoFactorSignIn was called.
    await waitFor(() => {
      expect(completeTwoFactorSignIn).toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify that server-side sign-in failure is handled gracefully.
   */
  it("handles server-side sign-in failure gracefully", async () => {
    // Arrange: Mock successful verification but failed server-side sign-in.
    vi.mocked(verifySigninRecoveryCode).mockResolvedValue({
      success: "Recovery code verified successfully.",
      verified: true,
      email: "mortiscope@example.com",
      userId: "user-123",
    });
    vi.mocked(completeTwoFactorSignIn).mockResolvedValue({
      error: "Authentication failed. Please try again.",
    });

    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code");
    await user.type(input, "ABCD1234");

    const button = screen.getByRole("button", { name: "Verify Code" });
    await user.click(button);

    // Assert: completeTwoFactorSignIn was called.
    await waitFor(() => {
      expect(completeTwoFactorSignIn).toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify that input is disabled during verification.
   */
  it("disables input during verification", async () => {
    // Arrange: Mock verification with a delay to keep pending state.
    vi.mocked(verifySigninRecoveryCode).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                error: "Invalid code",
              }),
            100
          )
        )
    );

    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code") as HTMLInputElement;
    await user.type(input, "ABCD1234");

    const button = screen.getByRole("button", { name: "Verify Code" });
    await user.click(button);

    // Assert: Check that input is disabled during pending state.
    await waitFor(() => {
      expect(input).toBeDisabled();
    });
  });

  /**
   * Test case to verify that submit button shows pending text during verification.
   */
  it("shows pending text on submit button during verification", async () => {
    // Arrange: Mock verification with a delay to keep pending state.
    vi.mocked(verifySigninRecoveryCode).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                error: "Invalid code",
              }),
            100
          )
        )
    );

    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code");
    await user.type(input, "ABCD1234");

    const button = screen.getByRole("button", { name: "Verify Code" });
    await user.click(button);

    // Assert: Check that button shows "Verifying..." text.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Verifying..." })).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that submit button shows redirecting text after successful verification.
   */
  it("shows redirecting text on submit button after successful verification", async () => {
    // Arrange: Mock successful verification and signIn with delay.
    vi.mocked(verifySigninRecoveryCode).mockResolvedValue({
      success: "Recovery code verified successfully.",
      verified: true,
      email: "mortiscope@example.com",
      userId: "user-123",
    });
    vi.mocked(completeTwoFactorSignIn).mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                Object.assign(new Error("NEXT_REDIRECT"), {
                  digest: "NEXT_REDIRECT;push;/dashboard;307",
                })
              ),
            100
          )
        )
    );

    const user = userEvent.setup();
    render(<RecoveryForm />);

    // Act: Fill in the form and submit.
    await waitFor(() => {
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("Recovery Code");
    await user.type(input, "ABCD1234");

    const button = screen.getByRole("button", { name: "Verify Code" });
    await user.click(button);

    // Assert: Check that button shows "Redirecting..." text.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Redirecting..." })).toBeInTheDocument();
    });
  });
});
