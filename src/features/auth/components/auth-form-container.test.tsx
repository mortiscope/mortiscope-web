import { describe, expect, it } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { AuthFormContainer } from "@/features/auth/components/auth-form-container";

// Groups related tests into a suite for the Auth Form Container component.
describe("AuthFormContainer", () => {
  // A default set of props is defined to be reused across multiple tests.
  const defaultProps = {
    title: "Sign In",
    description: "Enter your credentials to continue",
    children: <div>Form Content</div>,
  };

  /**
   * Test case to verify that the main header elements are rendered correctly.
   */
  it("renders the header with title and description", () => {
    // Arrange: Render the component with default props.
    render(<AuthFormContainer {...defaultProps} />);

    // Assert: Check if the heading and description text are present in the document.
    expect(screen.getByRole("heading", { name: defaultProps.title })).toBeInTheDocument();
    expect(screen.getByText(defaultProps.description)).toBeInTheDocument();
  });

  /**
   * Test case to ensure that the `children` prop is rendered correctly within the container.
   */
  it("renders children content", () => {
    // Arrange: Render the component with default props.
    render(<AuthFormContainer {...defaultProps} />);

    // Assert: Check if the child content is present.
    expect(screen.getByText("Form Content")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the optional footer content is not rendered by default when no footer props are provided.
   */
  it("does not render footer when footer props are not provided", () => {
    // Arrange: Render the component with default props.
    render(<AuthFormContainer {...defaultProps} />);

    // Assert: The only link present should be the main logo link to the homepage.
    expect(screen.queryByRole("link")).toHaveAttribute("href", "/");
  });

  /**
   * Test case to verify that the footer content.
   */
  it("renders footer with link when all footer props are provided", () => {
    // Arrange: Define a new set of props that includes all footer-related properties.
    const propsWithFooter = {
      ...defaultProps,
      footerText: "Don't have an account?",
      footerLinkText: "Sign up",
      footerLinkHref: "/signup" as const,
    };
    render(<AuthFormContainer {...propsWithFooter} />);

    // Assert: Check for the presence of the footer text and the correctly configured link.
    expect(screen.getByText(propsWithFooter.footerText)).toBeInTheDocument();
    const footerLink = screen.getByRole("link", { name: propsWithFooter.footerLinkText });
    expect(footerLink).toBeInTheDocument();
    expect(footerLink).toHaveAttribute("href", propsWithFooter.footerLinkHref);
  });

  /**
   * Test case to ensure the footer does not render if only partial props are provided.
   */
  it("does not render footer when only some footer props are provided", () => {
    // Arrange: Define props with only the `footerText`.
    const propsWithPartialFooter = {
      ...defaultProps,
      footerText: "Don't have an account?",
    };
    render(<AuthFormContainer {...propsWithPartialFooter} />);

    // Assert: Check that no new links have been added; only the logo link should exist.
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/");
  });

  /**
   * Test case to verify that the component can correctly render more complex JSX passed as children.
   */
  it("renders with complex children", () => {
    // Arrange: Define a more complex child element structure.
    const complexChildren = (
      <form>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Submit</button>
      </form>
    );
    render(<AuthFormContainer {...defaultProps}>{complexChildren}</AuthFormContainer>);

    // Assert: Check that the elements within the complex children are rendered correctly.
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });
});
