import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthFormLogo } from "@/features/auth/components/auth-form-logo";

/**
 * Groups related tests into a suite for the Auth Form Logo component.
 */
describe("AuthFormLogo", () => {
  /**
   * Test case to verify that the logo image is rendered with the correct source, alt text, and dimensions.
   */
  it("renders the Mortiscope logo image with correct attributes", () => {
    // Arrange: Render the component into the testing environment.
    render(<AuthFormLogo />);

    // Act: Locate the logo image element using its accessible alt text.
    const logoImage = screen.getByAltText("Mortiscope Logo");

    // Assert: Verify that the image is present in the document and contains the correct `src`, `width`, and `height` attributes.
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute("src", "/logos/logo.svg");
    expect(logoImage).toHaveAttribute("width", "80");
    expect(logoImage).toHaveAttribute("height", "80");
  });

  /**
   * Test case to verify that the logo is wrapped in a functional link pointing to the homepage.
   */
  it("wraps the Mortiscope logo in a link to the homepage", () => {
    // Arrange: Render the component into the testing environment.
    render(<AuthFormLogo />);

    // Act: Locate the link element by its accessible role and name.
    const linkElement = screen.getByRole("link", { name: "Go to homepage" });

    // Assert: Verify that the link is present, points to the root `/` path, and contains the logo image as a child element.
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute("href", "/");
    expect(linkElement).toContainElement(screen.getByAltText("Mortiscope Logo"));
  });
});
