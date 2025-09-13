import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { AuthSocialProvider } from "@/features/auth/components/auth-social-provider";

// Groups related tests into a suite for the Auth Social Provider component.
describe("AuthSocialProvider", () => {
  // A default set of props is defined for reuse across tests.
  const defaultProps = {
    separatorText: "Or continue with",
  };

  /**
   * A global hook that runs automatically before each test case in this suite.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the separator text is rendered correctly.
   */
  it("renders separator with text", () => {
    // Arrange: Render the component.
    render(<AuthSocialProvider {...defaultProps} />);

    // Assert: Check for the presence of the separator text.
    expect(screen.getByText("Or continue with")).toBeInTheDocument();
  });

  /**
   * Test case to ensure all expected social provider buttons are rendered.
   */
  it("renders all four social provider buttons", () => {
    // Arrange: Render the component.
    render(<AuthSocialProvider {...defaultProps} />);

    // Act: Find all elements with the role of "button".
    const buttons = screen.getAllByRole("button");
    // Assert: Check that the number of buttons matches the expected count.
    expect(buttons).toHaveLength(4);
  });

  /**
   * Test case to verify that the logos for each social provider are rendered with correct alternative text.
   */
  it("renders social provider logos with correct alt text", () => {
    // Arrange: Render the component.
    render(<AuthSocialProvider {...defaultProps} />);

    // Assert: Check for the presence of each logo by its alt text.
    expect(screen.getByAltText("Google")).toBeInTheDocument();
    expect(screen.getByAltText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByAltText("Microsoft")).toBeInTheDocument();
    expect(screen.getByAltText("ORCID")).toBeInTheDocument();
  });

  /**
   * Test case to simulate a user click on the Google button and verify that the `signIn`
   * function is called with the correct parameters.
   */
  it("calls signIn with google provider when Google button is clicked", async () => {
    // Arrange: Set up `user-event` and render the component.
    const user = userEvent.setup();
    render(<AuthSocialProvider {...defaultProps} />);

    // Act: Find and click the Google button.
    const googleButton = screen.getByRole("button", { name: "Google" });
    await user.click(googleButton);

    // Assert: Use `waitFor` to handle the asynchronous nature of the `onClick` handler.
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("google", {
        callbackUrl: "/dashboard",
      });
    });
  });

  /**
   * Test case to simulate a click on the ORCID button and verify the `signIn` call.
   */
  it("calls signIn with orcid provider when ORCID button is clicked", async () => {
    const user = userEvent.setup();
    render(<AuthSocialProvider {...defaultProps} />);

    const orcidButton = screen.getByRole("button", { name: "ORCID" });
    await user.click(orcidButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("orcid", {
        callbackUrl: "/dashboard",
      });
    });
  });

  /**
   * Test case to simulate a click on the Microsoft button and verify the `signIn` call.
   */
  it("calls signIn with microsoft-entra-id provider when Microsoft button is clicked", async () => {
    const user = userEvent.setup();
    render(<AuthSocialProvider {...defaultProps} />);

    const microsoftButton = screen.getByRole("button", { name: "Microsoft" });
    await user.click(microsoftButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("microsoft-entra-id", {
        callbackUrl: "/dashboard",
      });
    });
  });

  /**
   * Test case to verify that the `disabled` prop correctly disables all buttons.
   */
  it("disables all buttons when disabled prop is true", () => {
    // Arrange: Render the component with the `disabled` prop.
    render(<AuthSocialProvider {...defaultProps} disabled={true} />);

    // Act: Find all buttons.
    const buttons = screen.getAllByRole("button");
    // Assert: Iterate through the buttons and check that each one is disabled.
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  /**
   * Test case to confirm that the component correctly uses a custom separator text when provided.
   */
  it("renders with custom separator text", () => {
    // Arrange: Render the component with a custom `separatorText`.
    render(<AuthSocialProvider separatorText="Sign in with" />);

    // Assert: Check that the custom text is rendered.
    expect(screen.getByText("Sign in with")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component handles errors from the `signIn` function gracefully.
   */
  it("handles signIn errors gracefully", async () => {
    // Arrange: Spy on `console.error` to suppress its output and track its calls.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Mock the `signIn` function to reject with an error for this specific test.
    vi.mocked(signIn).mockRejectedValueOnce(new Error("OAuth error"));

    const user = userEvent.setup();
    render(<AuthSocialProvider {...defaultProps} />);

    // Act: Click a button that will trigger the mocked error.
    const googleButton = screen.getByRole("button", { name: "Google" });
    await user.click(googleButton);

    // Assert: Check that our error handling logic (the `console.error` call) was executed.
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("OAuth sign-in error:", expect.any(Error));
    });

    // Clean up the spy to restore the original `console.error` implementation.
    consoleErrorSpy.mockRestore();
  });
});
