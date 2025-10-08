import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { DashboardInformationItem } from "@/features/dashboard/components/dashboard-information-item";

// Mock icon component to verify SVG rendering within the information item.
const MockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg data-testid="mock-icon" {...props} />
);

/**
 * Test suite for the `DashboardInformationItem` component.
 */
describe("DashboardInformationItem", () => {
  /**
   * Test case to verify that the component correctly displays the provided title and icon.
   */
  it("renders the title and icon correctly", () => {
    // Arrange: Render the item within a list container to satisfy semantic requirements.
    render(
      <ul>
        <DashboardInformationItem icon={MockIcon} title="Test Title">
          Some content.
        </DashboardInformationItem>
      </ul>
    );

    // Assert: Check for the presence of the title text and the mock icon SVG.
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  /**
   * Test case to verify that a period-delimited string is transformed into a structured bulleted list.
   */
  it("parses and formats string content into a bulleted list of sentences", () => {
    // Arrange: Define a string containing multiple sentences.
    const textContent = "First point. Second point. Third point.";

    // Act: Render the component with the string as children.
    render(
      <ul>
        <DashboardInformationItem icon={MockIcon} title="Formatted List">
          {textContent}
        </DashboardInformationItem>
      </ul>
    );

    // Assert: Verify each sentence is rendered individually.
    expect(screen.getByText("First point.")).toBeInTheDocument();
    expect(screen.getByText("Second point.")).toBeInTheDocument();
    expect(screen.getByText("Third point.")).toBeInTheDocument();

    // Assert: Verify that the internal mapping created list items for the segments.
    const listItems = screen.getAllByRole("listitem");
    expect(listItems.length).toBeGreaterThan(1);
  });

  /**
   * Test case to verify that the string parsing logic removes unnecessary whitespace and ignores empty segments.
   */
  it("handles whitespace and empty segments in string content correctly", () => {
    // Arrange: Define a string with irregular spacing and trailing periods.
    const textContent = "   Trimmed start.    Trimmed middle.   ";

    // Act: Render the component.
    render(
      <ul>
        <DashboardInformationItem icon={MockIcon} title="Whitespace Test">
          {textContent}
        </DashboardInformationItem>
      </ul>
    );

    // Assert: Verify segments are cleaned and purely empty segments are not rendered.
    expect(screen.getByText("Trimmed start.")).toBeInTheDocument();
    expect(screen.getByText("Trimmed middle.")).toBeInTheDocument();
    expect(screen.queryByText(".")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that non-string children are rendered as-is without being split or placed in an internal list.
   */
  it("renders ReactNode children directly without list formatting", () => {
    // Act: Render the component with a JSX element as children.
    render(
      <ul>
        <DashboardInformationItem icon={MockIcon} title="JSX Content">
          <div data-testid="custom-content">
            <span>Custom Element</span>
          </div>
        </DashboardInformationItem>
      </ul>
    );

    // Assert: Verify the custom element is preserved in the DOM.
    expect(screen.getByTestId("custom-content")).toBeInTheDocument();
    expect(screen.getByText("Custom Element")).toBeInTheDocument();

    // Assert: Verify that no secondary list was created inside the component.
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(1);
  });
});
