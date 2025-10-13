import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountTabHeader } from "@/features/account/components/account-tab-header";

/**
 * Test suite for the `AccountTabHeader` component.
 */
describe("AccountTabHeader", () => {
  /**
   * Test case to verify that the title is rendered within the appropriate heading tag.
   */
  it("renders title correctly", () => {
    // Arrange: Render the component with a specific title and description.
    render(<AccountTabHeader title="Test Settings" description="Test Description" />);

    // Assert: Verify that the `title` prop is displayed inside an `h1` element for accessibility and SEO.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Test Settings");
  });

  /**
   * Test case to verify that the descriptive text is visible to the user.
   */
  it("renders description correctly", () => {
    // Arrange: Render the component with a specific title and description.
    render(<AccountTabHeader title="Test Settings" description="Test Description" />);

    // Assert: Check that the `description` string is present in the document.
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });
});
