import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { EditCaseSheetHeader } from "@/features/results/components/edit-case-sheet-header";

// Mock the Radix UI Dialog primitives to simplify the DOM structure and facilitate data attribute targeting.
vi.mock("@radix-ui/react-dialog", () => ({
  Title: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="sheet-title" className={className}>
      {children}
    </h2>
  ),
  Description: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p data-testid="sheet-description" className={className}>
      {children}
    </p>
  ),
  Close: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="sheet-close" className={className}>
      {children}
    </button>
  ),
}));

// Mock the Lucide icon library to replace SVG assets with testable mock elements.
vi.mock("lucide-react", () => ({
  XIcon: ({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} />
  ),
}));

/**
 * Test suite for the `EditCaseSheetHeader` component.
 */
describe("EditCaseSheetHeader", () => {
  /**
   * Test case to verify the primary title rendering and associated styling.
   */
  it("renders the title correctly", () => {
    // Arrange: Render the header component.
    render(<EditCaseSheetHeader />);

    // Assert: Check that the title exists, contains the expected text, and applies the correct font and color classes.
    const title = screen.getByTestId("sheet-title");
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent("Edit Case");
    expect(title).toHaveClass(
      "font-plus-jakarta-sans text-lg font-semibold text-slate-900 md:text-xl"
    );
  });

  /**
   * Test case to verify that an accessibility description is provided for screen readers.
   */
  it("renders the hidden description for accessibility", () => {
    // Arrange: Render the header component.
    render(<EditCaseSheetHeader />);

    // Assert: Verify that a description is present but visually hidden via the `sr-only` utility class.
    const description = screen.getByTestId("sheet-description");
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass("sr-only");
    expect(description).toHaveTextContent(
      "Make changes to the case details, notes, or view its history here."
    );
  });

  /**
   * Test case to verify the rendering and positioning of the sheet close button.
   */
  it("renders the close button with the correct icon", () => {
    // Arrange: Render the header component.
    render(<EditCaseSheetHeader />);

    // Assert: Verify that the close trigger is correctly positioned and contains the expected mock icon.
    const closeButton = screen.getByTestId("sheet-close");
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveClass("absolute top-1/2 right-4");

    const icon = screen.getByTestId("x-icon");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-4 w-4");
  });

  /**
   * Test case to verify that the close button is properly labeled for assistive technologies.
   */
  it("includes screen reader text for the close button", () => {
    // Arrange: Render the header component.
    render(<EditCaseSheetHeader />);

    // Assert: Verify the presence of visually hidden text intended specifically for screen reader users.
    expect(screen.getByText("Close")).toHaveClass("sr-only");
  });
});
