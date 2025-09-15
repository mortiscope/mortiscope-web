import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UploadNoResults } from "@/features/upload/components/upload-no-results";

// Mock the `framer-motion` component to ensure only the structural integrity of the `UploadNoResults` is tested.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: React.ComponentProps<"div">) => (
      <div className={className} data-testid="motion-div">
        {children}
      </div>
    ),
  },
}));

// Mock the icon component from `react-icons/hi` to verify its presence in the rendered output.
vi.mock("react-icons/hi", () => ({
  HiOutlineSearch: () => <svg data-testid="search-icon" />,
}));

/**
 * Test suite for the `UploadNoResults` component.
 */
describe("UploadNoResults", () => {
  /**
   * Test case to verify that the component correctly renders the empty state title, descriptive message, and search icon.
   */
  it("renders the empty state message and icon", () => {
    // Arrange: Render the component.
    render(<UploadNoResults />);

    // Assert: Check for the presence of the main title indicating no results were found.
    expect(screen.getByText("No Files Found")).toBeInTheDocument();
    // Assert: Check for the descriptive text explaining why no files are displayed.
    expect(screen.getByText("Your search term did not match any files.")).toBeInTheDocument();
    // Assert: Check for the presence of the mock search icon.
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });
});
