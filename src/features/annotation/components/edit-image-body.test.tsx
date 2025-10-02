import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EditImageBody } from "@/features/annotation/components/edit-image-body";

// Mock the framer-motion library to simplify the DOM and avoid animation-related timing issues during tests.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

/**
 * Test suite for the `EditImageBody` component.
 */
describe("EditImageBody", () => {
  // Mock function to track changes to the selected navigation preference.
  const mockOnEditOptionChange = vi.fn();

  /**
   * Test case to verify that the component correctly renders labels and instructional text for all navigation options.
   */
  it("renders both radio options with descriptions", () => {
    // Arrange: Render the component with the default selection.
    render(<EditImageBody editOption="current_tab" onEditOptionChange={mockOnEditOptionChange} />);

    // Assert: Check for the presence of the "current tab" radio button and its description.
    expect(screen.getByRole("radio", { name: /Open in current tab/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Navigate to the annotation editor in the current tab. It will replace the current page."
      )
    ).toBeInTheDocument();

    // Assert: Check for the presence of the "new tab" radio button and its description.
    expect(screen.getByRole("radio", { name: /Open in new tab/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Open the annotation editor in a new browser tab. It will keep the current page intact."
      )
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the radio input for 'current_tab' is checked when passed as the active option.
   */
  it("checks the 'current_tab' option when selected", () => {
    // Arrange: Render the component with `editOption` set to `current_tab`.
    render(<EditImageBody editOption="current_tab" onEditOptionChange={mockOnEditOptionChange} />);

    const currentTabRadio = screen.getByRole("radio", { name: /Open in current tab/i });
    const newTabRadio = screen.getByRole("radio", { name: /Open in new tab/i });

    // Assert: Ensure the "current tab" is checked and the "new tab" is not.
    expect(currentTabRadio).toBeChecked();
    expect(newTabRadio).not.toBeChecked();
  });

  /**
   * Test case to verify that the radio input for 'new_tab' is checked when passed as the active option.
   */
  it("checks the 'new_tab' option when selected", () => {
    // Arrange: Render the component with `editOption` set to `new_tab`.
    render(<EditImageBody editOption="new_tab" onEditOptionChange={mockOnEditOptionChange} />);

    const currentTabRadio = screen.getByRole("radio", { name: /Open in current tab/i });
    const newTabRadio = screen.getByRole("radio", { name: /Open in new tab/i });

    // Assert: Ensure the "new tab" is checked and the "current tab" is not.
    expect(currentTabRadio).not.toBeChecked();
    expect(newTabRadio).toBeChecked();
  });

  /**
   * Test case to verify that the onEditOptionChange callback is triggered when a user selects a different radio button.
   */
  it("calls onEditOptionChange when a different option is clicked", () => {
    // Arrange: Render the component with 'current_tab' initially selected.
    render(<EditImageBody editOption="current_tab" onEditOptionChange={mockOnEditOptionChange} />);

    // Act: Simulate a user clicking on the "new tab" option.
    const newTabRadio = screen.getByRole("radio", { name: /Open in new tab/i });
    fireEvent.click(newTabRadio);

    // Assert: Verify that the callback was executed once with the correct "new_tab" value.
    expect(mockOnEditOptionChange).toHaveBeenCalledTimes(1);
    expect(mockOnEditOptionChange).toHaveBeenCalledWith("new_tab");
  });

  /**
   * Test case to verify that active and inactive containers receive appropriate CSS classes for visual emphasis.
   */
  it("applies active styling to the selected option container", () => {
    // Arrange: Render the component with 'current_tab' active.
    render(<EditImageBody editOption="current_tab" onEditOptionChange={mockOnEditOptionChange} />);

    // Act: Locate the parent label containers for both options.
    const currentTabLabel = screen.getByText("Open in current tab").closest("label");
    const newTabLabel = screen.getByText("Open in new tab").closest("label");

    // Assert: Verify that the active item uses emerald styling and the inactive item uses neutral slate styling.
    expect(currentTabLabel).toHaveClass("border-emerald-400");
    expect(currentTabLabel).toHaveClass("bg-emerald-50");

    expect(newTabLabel).toHaveClass("border-slate-200");
    expect(newTabLabel).toHaveClass("bg-white");
  });
});
