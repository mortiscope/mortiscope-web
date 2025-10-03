import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PanelInformationRow } from "@/features/annotation/components/panel-information-row";

// Mock framer-motion to simplify the rendering of animated container divs in a testing environment.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: ReactNode; className?: string }) => (
      <div data-testid="motion-row" className={className}>
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
 * Test suite for the `PanelInformationRow` component.
 */
describe("PanelInformationRow", () => {
  /**
   * Test case to verify that the component renders basic text props and the icon correctly.
   */
  it("renders correctly with basic props", () => {
    // Arrange: Render the information row with string values for label and value.
    render(<PanelInformationRow icon={MockIcon} label="Test Label" value="Test Value" />);

    // Assert: Check that the label, value, and icon are present in the document.
    expect(screen.getByText("Test Label")).toBeInTheDocument();
    expect(screen.getByText("Test Value")).toBeInTheDocument();
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component can render JSX elements passed as the value prop.
   */
  it("renders complex value content", () => {
    // Arrange: Render the component with a React element as the `value`.
    render(
      <PanelInformationRow
        icon={MockIcon}
        label="Complex"
        value={<span data-testid="complex-value">123</span>}
      />
    );

    // Assert: Verify that the label and the complex JSX value are rendered correctly.
    expect(screen.getByText("Complex")).toBeInTheDocument();
    expect(screen.getByTestId("complex-value")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component applies the expected Flexbox layout classes.
   */
  it("applies correct layout classes", () => {
    // Arrange: Render the component with default properties.
    render(<PanelInformationRow icon={MockIcon} label="Label" value="Value" />);

    // Assert: Ensure the motion container has the required layout utility classes.
    const container = screen.getByTestId("motion-row");
    expect(container).toHaveClass("flex", "items-center", "gap-3");
  });

  /**
   * Test case to verify that specific typography and color styles are applied to the label and value.
   */
  it("applies correct styling to label and value", () => {
    // Arrange: Render the component with default properties.
    render(<PanelInformationRow icon={MockIcon} label="Label" value="Value" />);

    // Assert: Check that the `label` element uses the emerald theme and small font size.
    const label = screen.getByText("Label");
    expect(label).toHaveClass("font-inter", "text-xs", "text-emerald-200");

    // Assert: Check that the `value` element uses white text and a standard font size.
    const value = screen.getByText("Value");
    expect(value).toHaveClass("font-inter", "text-sm", "text-white");
  });
});
