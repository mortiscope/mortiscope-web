import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PanelSectionHeader } from "@/features/annotation/components/panel-section-header";

// Mock framer-motion to simplify the rendering of animated container divs for standard DOM testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className: string }) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock icon component to verify that the icon prop is correctly received and rendered.
const MockIcon = ({ className }: { className?: string }) => (
  <svg data-testid="mock-icon" className={className} />
);

/**
 * Test suite for the `PanelSectionHeader` component.
 */
describe("PanelSectionHeader", () => {
  /**
   * Test case to verify that the component correctly renders the title and icon with default emerald styling.
   */
  it("renders correctly with default props", () => {
    // Arrange: Render the header without an explicit color variant.
    render(<PanelSectionHeader icon={MockIcon} title="Default Section" />);

    // Assert: Verify that the title and icon are present in the document.
    expect(screen.getByText("Default Section")).toBeInTheDocument();
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();

    // Assert: Verify that the default emerald color classes are applied to the title and icon.
    const title = screen.getByText("Default Section");
    expect(title).toHaveClass("text-emerald-200");

    const icon = screen.getByTestId("mock-icon");
    expect(icon).toHaveClass("text-emerald-300");
  });

  /**
   * Test case to verify that the component applies the correct color classes when the amber variant is specified.
   */
  it("renders correctly with amber variant", () => {
    // Arrange: Render the component with the `colorVariant` set to `amber`.
    render(<PanelSectionHeader icon={MockIcon} title="Amber Section" colorVariant="amber" />);

    // Assert: Verify that the title and icon use amber utility classes.
    const title = screen.getByText("Amber Section");
    expect(title).toHaveClass("text-amber-200");

    const icon = screen.getByTestId("mock-icon");
    expect(icon).toHaveClass("text-amber-300");
  });

  /**
   * Test case to verify that the component applies the correct color classes when the teal variant is specified.
   */
  it("renders correctly with teal variant", () => {
    // Arrange: Render the component with the `colorVariant` set to `teal`.
    render(<PanelSectionHeader icon={MockIcon} title="Teal Section" colorVariant="teal" />);

    // Assert: Verify that the title and icon use teal utility classes.
    const title = screen.getByText("Teal Section");
    expect(title).toHaveClass("text-teal-200");

    const icon = screen.getByTestId("mock-icon");
    expect(icon).toHaveClass("text-teal-300");
  });

  /**
   * Test case to verify that the component applies the correct color classes when the sky variant is specified.
   */
  it("renders correctly with sky variant", () => {
    // Arrange: Render the component with the `colorVariant` set to `sky`.
    render(<PanelSectionHeader icon={MockIcon} title="Sky Section" colorVariant="sky" />);

    // Assert: Verify that the title and icon use sky utility classes.
    const title = screen.getByText("Sky Section");
    expect(title).toHaveClass("text-sky-200");

    const icon = screen.getByTestId("mock-icon");
    expect(icon).toHaveClass("text-sky-300");
  });
});
