import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ResultsNoSearchResults } from "@/features/results/components/results-no-search-results";

// Mock framer-motion to bypass animation logic and provide a stable div for testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className: string }) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock the search icon from react-icons to verify its presence in the UI via a test ID.
vi.mock("react-icons/hi", () => ({
  HiOutlineSearch: (props: React.ComponentProps<"svg">) => (
    <svg data-testid="search-icon" {...props} />
  ),
}));

/**
 * Test suite for the `ResultsNoSearchResults` component.
 */
describe("ResultsNoSearchResults", () => {
  const defaultProps = {
    title: "No results found",
    description: "Try adjusting your search query",
  };

  /**
   * Test case to verify that the component correctly renders dynamic text passed via props.
   */
  it("renders the title and description correctly", () => {
    // Arrange: Render the component with default title and description props.
    render(<ResultsNoSearchResults {...defaultProps} />);

    // Assert: Verify that the `title` and `description` strings are present in the document.
    expect(screen.getByText("No results found")).toBeInTheDocument();
    expect(screen.getByText("Try adjusting your search query")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the visual search icon is rendered.
   */
  it("renders the search icon", () => {
    // Arrange: Render the component.
    render(<ResultsNoSearchResults {...defaultProps} />);

    // Assert: Check that the mocked search icon element is in the document.
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component uses the intended motion wrapper and styling classes.
   */
  it("renders within the motion container with correct classes", () => {
    // Arrange: Render the component.
    render(<ResultsNoSearchResults {...defaultProps} />);

    // Act: Locate the motion-enhanced container.
    const container = screen.getByTestId("motion-div");

    // Assert: Ensure the container has the expected Tailwind CSS classes for layout and centering.
    expect(container).toHaveClass(
      "flex flex-1 flex-col items-center justify-center py-10 text-center"
    );
  });
});
