import { userEvent } from "@testing-library/user-event";
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { completeTwoFactorSignIn, verifySigninTwoFactor } from "@/features/auth/actions/two-factor";
import TwoFactorForm from "@/features/auth/components/two-factor-form";

// Mocks the server actions.
vi.mock("@/features/auth/actions/two-factor", () => ({
  verifySigninTwoFactor: vi.fn(),
  completeTwoFactorSignIn: vi.fn(),
}));

// Mocks the search params.
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

describe("TwoFactorForm", () => {
  // Mock ResizeObserver which is used by input-otp but missing in JSDOM
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // Mock elementFromPoint (used by input-otp for click handling)
    if (typeof document !== "undefined") {
      document.elementFromPoint = vi.fn();
    }
  });

  beforeEach(() => {
    // Default: No error in search params
    // We cast to unknown then ReadonlyURLSearchParams to satisfy strict linting without 'any'
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as ReadonlyURLSearchParams);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the form renders the OTP input and buttons correctly.
   */
  it("renders the two-factor form elements", () => {
    // Arrange: Render the component.
    render(<TwoFactorForm />);

    // Assert: Check for title, inputs, and buttons.
    expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
    expect(screen.getByText(/enter the 6-digit code/i)).toBeInTheDocument();

    // The OTP input usually renders as a textbox
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    // Verify button should be present but disabled initially
    const verifyButton = screen.getByRole("button", { name: /verify code/i });
    expect(verifyButton).toBeInTheDocument();
    expect(verifyButton).toBeDisabled();

    // Recovery link
    expect(screen.getByRole("link", { name: /use recovery code/i })).toBeInTheDocument();
  });

  /**
   * Test case to verify the specific UI state when the session is missing.
   */
  it("renders error state when 'no-session' error is present in URL", () => {
    // Arrange: Mock search params to return "no-session" error.
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockImplementation((key) => (key === "error" ? "no-session" : null)),
    } as unknown as ReadonlyURLSearchParams);

    render(<TwoFactorForm />);

    // Assert: The text appears twice (Header + Error Alert), so we use getAllByText
    const messages = screen.getAllByText(
      "This page is used to verify your identity with two-factor authentication."
    );
    expect(messages).toHaveLength(2);

    const backButton = screen.getByRole("link", { name: /back to sign in/i });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute("href", "/signin");
  });

  /**
   * Test case to ensure the verify button becomes enabled only when 6 digits are entered.
   */
  it("enables verify button when 6 digits are entered", async () => {
    // Arrange: Setup user and render.
    const user = userEvent.setup();
    render(<TwoFactorForm />);
    const verifyButton = screen.getByRole("button", { name: /verify code/i });
    const input = screen.getByRole("textbox");

    // Act: Type 5 digits.
    await user.type(input, "12345");
    // Assert: Still disabled.
    expect(verifyButton).toBeDisabled();

    // Act: Type the 6th digit.
    await user.type(input, "6");
    // Assert: Now enabled.
    expect(verifyButton).toBeEnabled();
  });

  /**
   * Test case to verify successful 2FA flow: Server verification -> Server-side SignIn (redirect).
   */
  it("handles successful verification and completes sign-in via server action", async () => {
    // Arrange: Mock successful responses for all steps.
    const user = userEvent.setup();

    vi.mocked(verifySigninTwoFactor).mockResolvedValue({
      success: "Verification successful!",
      verified: true,
      email: "mortiscope@example.com",
      userId: "user-123",
    });

    vi.mocked(completeTwoFactorSignIn).mockRejectedValue(
      Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/dashboard;307" })
    );

    render(<TwoFactorForm />);

    // Act: Enter code and submit.
    await user.type(screen.getByRole("textbox"), "123456");
    const verifyButton = screen.getByRole("button", { name: /verify code/i });
    await user.click(verifyButton);

    await waitFor(() => {
      expect(verifySigninTwoFactor).toHaveBeenCalledWith("123456");
      expect(completeTwoFactorSignIn).toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify that an invalid code displays an error message.
   */
  it("displays error message on invalid code", async () => {
    // Arrange: Mock server action to return failure.
    const user = userEvent.setup();
    vi.mocked(verifySigninTwoFactor).mockResolvedValue({
      error: "Invalid verification code",
    });

    render(<TwoFactorForm />);

    // Act: Enter code and submit.
    await user.type(screen.getByRole("textbox"), "123456");
    await user.click(screen.getByRole("button", { name: /verify code/i }));

    // Assert: Check for error message.
    await waitFor(() => {
      expect(screen.getByText("Invalid verification code.")).toBeInTheDocument();
    });

    // Assert: Server-side sign-in should not be called.
    expect(completeTwoFactorSignIn).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify behavior when server verification passes but server-side sign-in fails.
   */
  it("handles server-side sign-in failure gracefully", async () => {
    // Arrange: Server verification OK, but `completeTwoFactorSignIn` returns error.
    const user = userEvent.setup();
    vi.mocked(verifySigninTwoFactor).mockResolvedValue({
      success: "Verification successful!",
      verified: true,
      email: "mortiscope@example.com",
      userId: "user-123",
    });

    vi.mocked(completeTwoFactorSignIn).mockResolvedValue({
      error: "Authentication failed. Please try again.",
    });

    render(<TwoFactorForm />);

    // Act: Submit form.
    await user.type(screen.getByRole("textbox"), "123456");
    await user.click(screen.getByRole("button", { name: /verify code/i }));

    // Assert: Wait for potential async operations.
    await waitFor(() => {
      expect(completeTwoFactorSignIn).toHaveBeenCalled();
    });

    // Assert: The verify button should be re-enabled after failure.
    await waitFor(() => {
      const verifyButton = screen.getByRole("button", { name: /verify code/i });
      expect(verifyButton).toBeInTheDocument();
    });
  });
});
