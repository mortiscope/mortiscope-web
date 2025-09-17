import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { ReviewDetailsSummary } from "@/features/cases/components/review-details-summary";

// Mock the `framer-motion` component for isolation and to verify container rendering.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: React.ComponentProps<"div">) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock the Card components to isolate the structure of the summary display.
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Define default props for the component under test.
const defaultProps = {
  caseName: "Case Name",
  temperatureDisplay: "25°C",
  caseDateDisplay: "May 15, 2025",
  locationDisplay: "Laguna, Philippines",
  variants: {},
};

/**
 * Test suite for the `ReviewDetailsSummary` component.
 */
describe("ReviewDetailsSummary", () => {
  /**
   * Test case to verify that the main title for the summary section is rendered.
   */
  it("renders the summary title", () => {
    // Arrange: Render the component.
    render(<ReviewDetailsSummary {...defaultProps} />);

    // Assert: Check for the presence of the section heading.
    expect(screen.getByRole("heading", { name: "Analysis Details" })).toBeInTheDocument();
  });

  /**
   * Test case to verify that all provided data points are correctly displayed with their respective labels.
   */
  it("displays all provided details correctly", () => {
    // Arrange: Render the component with default data.
    render(<ReviewDetailsSummary {...defaultProps} />);

    // Assert: Check for the presence of the `caseName` (rendered twice: once as a title, once as a data item).
    expect(screen.getAllByText("Case Name")).toHaveLength(2);

    // Assert: Check for the data item labels.
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText("Case Date")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();

    // Assert: Check for the presence of the display values.
    expect(screen.getByText("25°C")).toBeInTheDocument();
    expect(screen.getByText("May 15, 2025")).toBeInTheDocument();
    expect(screen.getByText("Laguna, Philippines")).toBeInTheDocument();
  });

  /**
   * Test case to verify that a fallback "N/A" text is displayed when `caseName` is undefined.
   */
  it("renders fallback 'N/A' when caseName is missing", () => {
    // Arrange: Render the component with `caseName` set to undefined.
    render(<ReviewDetailsSummary {...defaultProps} caseName={undefined} />);

    // Assert: Check for the presence of the "N/A" fallback text.
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  /**
   * Test case to verify that a fallback "N/A" text is displayed when `locationDisplay` is an empty string.
   */
  it("renders fallback 'N/A' when locationDisplay is empty", () => {
    // Arrange: Render the component with `locationDisplay` set to an empty string.
    render(<ReviewDetailsSummary {...defaultProps} locationDisplay="" />);

    // Assert: Check for the presence of the "N/A" fallback text.
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the correct CSS classes are applied for the responsive grid layout.
   */
  it("applies correct layout classes", () => {
    // Arrange: Render the component.
    const { container } = render(<ReviewDetailsSummary {...defaultProps} />);

    // Assert: Find the grid container and check for expected responsive classes.
    const gridContainer = container.querySelector(".md\\:grid");
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass("space-y-4", "md:grid-cols-2");
  });
});
