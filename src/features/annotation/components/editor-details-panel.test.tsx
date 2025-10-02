import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EditorDetailsPanel } from "@/features/annotation/components/editor-details-panel";

// Mock framer-motion to simplify the aside element and avoid animation-related test failures.
vi.mock("framer-motion", () => ({
  motion: {
    aside: ({ children, className }: { children: React.ReactNode; className: string }) => (
      <aside data-testid="details-panel" className={className}>
        {children}
      </aside>
    ),
  },
}));

/**
 * Test suite for the `EditorDetailsPanel` component.
 */
describe("EditorDetailsPanel", () => {
  const mockOnClose = vi.fn();
  const defaultProps = {
    title: "Test Panel",
    isOpen: true,
    onClose: mockOnClose,
    children: <div data-testid="child-content">Panel Content</div>,
  };

  /**
   * Test case to verify that the panel is visible in the DOM when the open flag is active.
   */
  it("renders when isOpen is true", () => {
    // Arrange: Render the panel with the `isOpen` prop set to true.
    render(<EditorDetailsPanel {...defaultProps} />);

    // Assert: Check for the existence of the panel element via test ID.
    expect(screen.getByTestId("details-panel")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the panel is excluded from the DOM when the open flag is inactive.
   */
  it("does not render when isOpen is false", () => {
    // Arrange: Render the panel with the `isOpen` prop set to false.
    render(<EditorDetailsPanel {...defaultProps} isOpen={false} />);

    // Assert: Ensure the panel element is not found in the document.
    expect(screen.queryByTestId("details-panel")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the provided title string is displayed correctly in the UI.
   */
  it("displays the correct title", () => {
    // Arrange: Render the panel with a specific title.
    render(<EditorDetailsPanel {...defaultProps} />);

    // Assert: Verify the presence of the text passed in the `title` prop.
    expect(screen.getByText("Test Panel")).toBeInTheDocument();
  });

  /**
   * Test case to verify that nested React components are rendered within the panel body.
   */
  it("renders children correctly", () => {
    // Arrange: Render the panel containing a test child div.
    render(<EditorDetailsPanel {...defaultProps} />);

    // Assert: Verify that both the child element and its text content are present.
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Panel Content")).toBeInTheDocument();
  });

  /**
   * Test case to verify that specific Tailwind CSS classes are applied for correct positioning and styling.
   */
  it("applies correct layout classes", () => {
    // Arrange: Render the panel.
    render(<EditorDetailsPanel {...defaultProps} />);

    // Act: Select the main aside element.
    const aside = screen.getByTestId("details-panel");

    // Assert: Verify the presence of classes responsible for fixed positioning and background color.
    expect(aside).toHaveClass("fixed", "top-16", "right-0", "flex-col", "bg-emerald-700");
  });
});
