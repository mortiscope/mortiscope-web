import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ResultsEmptyState } from "@/features/results/components/results-empty-state";

// Mock the folder icon from react-icons to verify its presence using a test ID.
vi.mock("react-icons/fa6", () => ({
  FaFolder: (props: React.ComponentProps<"svg">) => <svg data-testid="icon-folder" {...props} />,
}));

/**
 * Test suite for the `ResultsEmptyState` component.
 */
describe("ResultsEmptyState", () => {
  /**
   * Test case to verify that the component displays the expected visual elements and descriptive text.
   */
  it("renders the empty state icon and text correctly", () => {
    // Arrange: Render the empty state component.
    render(<ResultsEmptyState />);

    // Assert: Check that the placeholder icon is present in the document.
    expect(screen.getByTestId("icon-folder")).toBeInTheDocument();

    // Assert: Verify that the primary heading and the sub-text explanation are correctly displayed.
    expect(screen.getByText("No Results Found")).toBeInTheDocument();
    expect(screen.getByText("You have not created any cases yet.")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component occupies the intended layout space using CSS classes.
   */
  it("applies the correct layout classes", () => {
    // Arrange: Render the component and capture the root container.
    const { container } = render(<ResultsEmptyState />);

    // Act: Retrieve the direct child of the container.
    const wrapper = container.firstChild;

    // Assert: Ensure the flexbox and alignment classes are applied for proper centering within the UI.
    expect(wrapper).toHaveClass("flex flex-1 flex-col items-center justify-center text-center");
  });
});
