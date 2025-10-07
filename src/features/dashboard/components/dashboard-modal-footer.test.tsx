import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardModalFooter } from "@/features/dashboard/components/dashboard-modal-footer";

// Mock the framer-motion library to avoid animation side effects and allow direct inspection of the motion wrapper.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock the UI Button component to simplify the DOM structure and facilitate event simulation.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

// Mock the DialogFooter from the Radix-based UI library to verify proper semantic nesting.
vi.mock("@/components/ui/dialog", () => ({
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

/**
 * Test suite for the `DashboardModalFooter` component.
 */
describe("DashboardModalFooter", () => {
  const mockVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };
  const mockOnClose = vi.fn();

  /**
   * Test case to verify that the component displays the default label when no custom text is provided.
   */
  it("renders with default button text", () => {
    // Arrange: Render the footer with only the required `onClose` and `variants` props.
    render(<DashboardModalFooter onClose={mockOnClose} variants={mockVariants} />);

    // Assert: Check that the primary button contains the fallback text "Got It".
    expect(screen.getByRole("button")).toHaveTextContent("Got It");
  });

  /**
   * Test case to verify that the component correctly overrides the button label with the `buttonText` prop.
   */
  it("renders with custom button text", () => {
    // Arrange: Render the footer with a specific string for `buttonText`.
    render(
      <DashboardModalFooter
        onClose={mockOnClose}
        variants={mockVariants}
        buttonText="Close Modal"
      />
    );

    // Assert: Check that the button displays the custom label instead of the default.
    expect(screen.getByRole("button")).toHaveTextContent("Close Modal");
  });

  /**
   * Test case to verify that clicking the footer button triggers the provided callback.
   */
  it("calls onClose when the button is clicked", () => {
    // Arrange: Render the component.
    render(<DashboardModalFooter onClose={mockOnClose} variants={mockVariants} />);

    // Act: Simulate a user click on the footer button.
    fireEvent.click(screen.getByRole("button"));

    // Assert: Verify that the `onClose` mock function was executed exactly once.
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the footer is wrapped in a motion div with specific utility classes for layout.
   */
  it("renders within the motion wrapper with correct padding classes", () => {
    // Arrange: Render the component.
    render(<DashboardModalFooter onClose={mockOnClose} variants={mockVariants} />);

    // Assert: Verify that the motion-enabled wrapper contains the expected Tailwind CSS padding and shrink classes.
    const wrapper = screen.getByTestId("motion-div");
    expect(wrapper).toHaveClass("shrink-0", "px-6", "pt-2", "pb-6");
  });

  /**
   * Test case to verify the structural integrity of the component by checking for the DialogFooter wrapper.
   */
  it("renders the DialogFooter component", () => {
    // Arrange: Render the component.
    render(<DashboardModalFooter onClose={mockOnClose} variants={mockVariants} />);

    // Assert: Ensure the component includes the standard UI dialog footer element.
    expect(screen.getByTestId("dialog-footer")).toBeInTheDocument();
  });
});
