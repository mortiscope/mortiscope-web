import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PanelListItem } from "@/features/annotation/components/panel-list-item";

// Mock framer-motion to simplify the rendering of animated container divs for standard DOM testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: ReactNode; className?: string }) => (
      <div data-testid="motion-item" className={className}>
        {children}
      </div>
    ),
  },
}));

/**
 * Test suite for the `PanelListItem` component.
 */
describe("PanelListItem", () => {
  /**
   * Test case to verify that the component correctly renders both the label and value strings.
   */
  it("renders label and value correctly", () => {
    // Arrange: Render the list item with standard string props.
    render(<PanelListItem label="Test Label" value="Test Value" />);

    // Assert: Verify that both the label and value are present in the document.
    expect(screen.getByText("Test Label")).toBeInTheDocument();
    expect(screen.getByText("Test Value")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component defaults to the emerald color theme when no variant is specified.
   */
  it("applies default emerald styling", () => {
    // Arrange: Render the component without an explicit color variant.
    render(<PanelListItem label="Label" value="Value" />);

    // Assert: Check that the value element contains the default emerald utility class.
    const valueElement = screen.getByText("Value");
    expect(valueElement).toHaveClass("text-emerald-200");
  });

  /**
   * Test case to verify that the component applies amber styling when the `colorVariant` is set to amber.
   */
  it("applies amber styling when variant is amber", () => {
    // Arrange: Render the component with the amber color variant.
    render(<PanelListItem label="Label" value="Value" colorVariant="amber" />);

    // Assert: Verify that the value element contains the amber utility class.
    const valueElement = screen.getByText("Value");
    expect(valueElement).toHaveClass("text-amber-200");
  });

  /**
   * Test case to verify that the component applies teal styling when the `colorVariant` is set to teal.
   */
  it("applies teal styling when variant is teal", () => {
    // Arrange: Render the component with the teal color variant.
    render(<PanelListItem label="Label" value="Value" colorVariant="teal" />);

    // Assert: Verify that the value element contains the teal utility class.
    const valueElement = screen.getByText("Value");
    expect(valueElement).toHaveClass("text-teal-200");
  });

  /**
   * Test case to verify that the component supports rendering a complex `ReactNode` within the value slot.
   */
  it("renders complex ReactNode as value", () => {
    // Arrange: Render the component passing a span element as the `value` prop.
    render(<PanelListItem label="Complex" value={<span data-testid="complex-value">123</span>} />);

    // Assert: Verify the custom ReactNode is successfully rendered.
    expect(screen.getByTestId("complex-value")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component container uses the correct Flexbox layout classes.
   */
  it("has correct layout classes", () => {
    // Arrange: Render the component.
    render(<PanelListItem label="Label" value="Value" />);

    // Assert: Verify the motion container applies the flex and justification classes for list alignment.
    const container = screen.getByTestId("motion-item");
    expect(container).toHaveClass("flex", "items-center", "justify-between");
  });
});
