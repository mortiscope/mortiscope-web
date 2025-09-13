import { userEvent } from "@testing-library/user-event";
import { ReadonlyURLSearchParams, useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { clearTwoFactorSession, verifySigninTwoFactor } from "@/features/auth/actions/two-factor";
import TwoFactorForm from "@/features/auth/components/two-factor-form";

// Mocks the server actions.
vi.mock("@/features/auth/actions/two-factor", () => ({
  verifySigninTwoFactor: vi.fn(),
  clearTwoFactorSession: vi.fn(),
}));

// Mocks the router and search params.
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
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

  const pushMock = vi.fn();

  beforeEach(() => {
    // Default mocks for navigation
    vi.mocked(useRouter).mockReturnValue({
      push: pushMock,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });

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
   * Test case to verify successful 2FA flow: Server verification -> Client SignIn -> Router Push.
   */
  it("handles successful verification and redirects to dashboard", async () => {
    // Arrange: Mock successful responses for all steps.
    const user = userEvent.setup();
    const testEmail = "mortiscope@example.com";

    vi.mocked(verifySigninTwoFactor).mockResolvedValue({
      success: "Verification successful!",
      verified: true,
      email: testEmail,
      userId: "user-123",
    });

    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: undefined,
      status: 200,
      url: "",
      code: "success",
    });

    vi.mocked(clearTwoFactorSession).mockResolvedValue({ success: "Session cleared" });

    render(<TwoFactorForm />);

    // Act: Enter code and submit.
    await user.type(screen.getByRole("textbox"), "123456");
    const verifyButton = screen.getByRole("button", { name: /verify code/i });
    await user.click(verifyButton);

    await waitFor(() => {
      expect(verifySigninTwoFactor).toHaveBeenCalledWith("123456");

      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: testEmail,
        password: "2fa-verified",
        redirect: false,
      });

      expect(clearTwoFactorSession).toHaveBeenCalled();

      expect(pushMock).toHaveBeenCalledWith("/dashboard");
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

    // Assert: Redirect logic should not be called.
    expect(signIn).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify behavior when server verification passes but client sign-in fails.
   */
  it("does not redirect if client-side sign-in fails", async () => {
    // Arrange: Server OK, but NextAuth fails.
    const user = userEvent.setup();
    vi.mocked(verifySigninTwoFactor).mockResolvedValue({
      success: "Verification successful!",
      verified: true,
      email: "mortiscope@example.com",
      userId: "user-123",
    });

    vi.mocked(signIn).mockResolvedValue({
      ok: false,
      error: "CredentialsSignin",
      status: 401,
      url: "",
      code: "error",
    });

    render(<TwoFactorForm />);

    // Act: Submit form.
    await user.type(screen.getByRole("textbox"), "123456");
    await user.click(screen.getByRole("button", { name: /verify code/i }));

    // Assert: Wait for potential async operations.
    await waitFor(() => {
      expect(signIn).toHaveBeenCalled();
    });

    // Assert: Should not redirect or clear session if sign-in failed.
    expect(clearTwoFactorSession).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
