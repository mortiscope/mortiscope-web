import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { verification } from "@/features/auth/actions/verification";
import VerificationForm from "@/features/auth/components/verification-form";

// Mocks the server action.
vi.mock("@/features/auth/actions/verification", () => ({
  verification: vi.fn(),
}));

// Mocks the router hooks.
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

describe("VerificationForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify the default UI state when no token is present in the URL.
   */
  it("renders default state when no token is provided", () => {
    // Arrange: Mock search params to be empty.
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as ReadonlyURLSearchParams);

    render(<VerificationForm />);

    // Assert: Check headers and default feedback message.
    expect(screen.getByText("Email Verification")).toBeInTheDocument();
    expect(screen.getByText(/processes email verification links/i)).toBeInTheDocument();

    // Check fallback feedback message
    expect(screen.getByText("This page is used to verify an email address.")).toBeInTheDocument();

    // Check default button state
    const button = screen.getByRole("link", { name: /back to homepage/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "/");
  });

  /**
   * Test case to verify the success state when the verification action returns success.
   */
  it("renders success state and sign-in link on successful verification", async () => {
    // Arrange: Mock search params with a token.
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockImplementation((key) => (key === "token" ? "valid-token" : null)),
    } as unknown as ReadonlyURLSearchParams);

    // Arrange: Mock server action success response.
    vi.mocked(verification).mockResolvedValue({
      status: "success",
      message: "Email verified successfully!",
    });

    render(<VerificationForm />);

    // Assert: Wait for the query to resolve and show success message.
    await waitFor(() => {
      expect(screen.getByText("Email verified successfully!")).toBeInTheDocument();
    });

    // Assert: Check that the button links to the sign-in page.
    const button = screen.getByRole("link", { name: /proceed to sign in/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "/signin");
  });

  /**
   * Test case to verify the error state when the verification action fails (e.g., expired token).
   */
  it("renders error state and homepage link on failed verification", async () => {
    // Arrange: Mock search params with a token.
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockImplementation((key) => (key === "token" ? "invalid-token" : null)),
    } as unknown as ReadonlyURLSearchParams);

    // Arrange: Mock server action error response.
    vi.mocked(verification).mockResolvedValue({
      status: "error",
      message: "Token expired or invalid.",
    });

    render(<VerificationForm />);

    // Assert: Wait for the error message.
    await waitFor(() => {
      expect(screen.getByText("Token expired or invalid.")).toBeInTheDocument();
    });

    // Assert: Check that the button links back to the homepage.
    const button = screen.getByRole("link", { name: /back to homepage/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "/");
  });

  /**
   * Test case to verify that the UI updates correctly for the "Email Change" flow.
   */
  it("renders correct title and description for email change type", () => {
    // Arrange: Mock search params with 'type=email-change'.
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockImplementation((key) => {
        if (key === "type") return "email-change";
        return null;
      }),
    } as unknown as ReadonlyURLSearchParams);

    render(<VerificationForm />);

    // Assert: Check for email-change specific headers.
    expect(screen.getByText("Confirming New Email")).toBeInTheDocument();
    expect(screen.getByText(/finalizing the update to your new email/i)).toBeInTheDocument();
  });

  /**
   * Test case to ensure the loading spinner is hidden after a result is received.
   */
  it("hides loading spinner and fallback message when data arrives", async () => {
    // Arrange: Mock search params and a delayed server response.
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue("some-token"),
    } as unknown as ReadonlyURLSearchParams);

    vi.mocked(verification).mockResolvedValue({
      status: "success",
      message: "Done",
    });

    render(<VerificationForm />);

    // Act & Assert: Wait for success state.
    await waitFor(() => {
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    // Assert: The default message should be gone.
    expect(
      screen.queryByText("This page is used to verify an email address.")
    ).not.toBeInTheDocument();
  });
});
