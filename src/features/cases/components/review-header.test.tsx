import { type Variants } from "framer-motion";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ReviewHeader } from "@/features/cases/components/review-header";

// Mock the `framer-motion` component to isolate animation logic and verify prop passing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      variants,
    }: React.ComponentProps<"div"> & { variants: unknown }) => (
      <div data-testid="motion-div" className={className} data-variants={JSON.stringify(variants)}>
        {children}
      </div>
    ),
  },
}));

// Mock the Card components to isolate the header structure.
vi.mock("@/components/ui/card", () => ({
  CardHeader: ({ children, className }: React.ComponentProps<"div">) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: React.ComponentProps<"h3">) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
  CardDescription: ({ children, className }: React.ComponentProps<"p">) => (
    <p data-testid="card-description" className={className}>
      {children}
    </p>
  ),
}));

/**
 * Test suite for the `ReviewHeader` component.
 */
describe("ReviewHeader", () => {
  // Define mock animation variants for prop checking.
  const mockVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  /**
   * Test case to verify that the title and description are rendered with correct text and styling classes.
   */
  it("renders the header content correctly", () => {
    // Arrange: Render the component with mock variants.
    render(<ReviewHeader variants={mockVariants} />);

    // Assert: Check for the presence of the structural header element.
    expect(screen.getByTestId("card-header")).toBeInTheDocument();

    // Assert: Check the title content and its font styling class.
    const title = screen.getByTestId("card-title");
    expect(title).toHaveTextContent("Review and Submit");
    expect(title).toHaveClass("font-plus-jakarta-sans text-xl");

    // Assert: Check the description content and its font styling class.
    const description = screen.getByTestId("card-description");
    expect(description).toHaveTextContent(
      "Carefully review the details and images below before finalzing the submission."
    );
    expect(description).toHaveClass("font-inter");
  });

  /**
   * Test case to verify that the animation variants are correctly passed to the root motion div.
   */
  it("passes animation variants to the motion div", () => {
    // Arrange: Render the component with mock variants.
    render(<ReviewHeader variants={mockVariants} />);

    // Assert: Check the `data-variants` attribute on the mock motion div matches the mock object.
    const motionDiv = screen.getByTestId("motion-div");
    expect(motionDiv).toHaveAttribute("data-variants", JSON.stringify(mockVariants));
  });
});
