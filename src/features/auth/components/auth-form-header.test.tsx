import { describe, expect, it } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { AuthFormHeader } from "@/features/auth/components/auth-form-header";

// Groups related tests into a suite for the Auth Form Header component.
describe("AuthFormHeader", () => {
  // A default set of props is defined to be reused across multiple tests, reducing duplication.
  const defaultProps = {
    title: "Welcome Back",
    description: "Sign in to your account to continue",
  };

  /**
   * Test case to verify that the component's logo image is rendered with the correct alternative text.
   */
  it("renders the logo with correct alt text", () => {
    // Arrange: Render the component with default props.
    render(<AuthFormHeader {...defaultProps} />);

    // Act: Find the image by its alt text.
    const logo = screen.getByAltText("Mortiscope Logo");
    // Assert: Check if the logo image is present in the document.
    expect(logo).toBeInTheDocument();
  });

  /**
   * Test case to ensure that the logo is wrapped in a link that correctly points to the homepage.
   */
  it("renders the logo as a link to homepage", () => {
    // Arrange: Render the component.
    render(<AuthFormHeader {...defaultProps} />);

    // Act: Find the link by its accessible name (aria-label).
    const logoLink = screen.getByRole("link", { name: /go to homepage/i });
    // Assert: Check that the link exists and has the correct `href` attribute.
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute("href", "/");
  });

  /**
   * Test case to verify that the `title` prop is rendered as a heading with the correct text and styles.
   */
  it("displays the title as a heading", () => {
    // Arrange: Render the component.
    render(<AuthFormHeader {...defaultProps} />);

    // Act: Find the heading by its role and accessible name.
    const heading = screen.getByRole("heading", { name: defaultProps.title });
    // Assert: Check that the heading exists and has the expected font class.
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("font-plus-jakarta-sans");
  });

  /**
   * Test case to ensure that the `description` prop is rendered correctly as text on the screen.
   */
  it("displays the description text", () => {
    // Arrange: Render the component.
    render(<AuthFormHeader {...defaultProps} />);

    // Act: Find the element containing the description text.
    const description = screen.getByText(defaultProps.description);
    // Assert: Check that the description is present in the document.
    expect(description).toBeInTheDocument();
  });

  /**
   * Test case to confirm that the component correctly uses custom props when they are provided.
   */
  it("renders with custom title and description", () => {
    // Arrange: Define a new set of custom props.
    const customProps = {
      title: "Create Account",
      description: "Register to MortiScope",
    };
    render(<AuthFormHeader {...customProps} />);

    // Assert: Check that the custom title and description are rendered correctly.
    expect(screen.getByRole("heading", { name: customProps.title })).toBeInTheDocument();
    expect(screen.getByText(customProps.description)).toBeInTheDocument();
  });
});
