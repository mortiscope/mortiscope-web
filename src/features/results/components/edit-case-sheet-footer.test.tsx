import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { EditCaseSheetFooter } from "@/features/results/components/edit-case-sheet-footer";

// Mock the framer-motion library to simplify the component tree and ensure immediate visibility for testing.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock the Button component to provide a standard HTML button for state and attribute verification.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
    className,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button disabled={disabled} type={type} className={className} data-testid="submit-button">
      {children}
    </button>
  ),
}));

// Mock the CardFooter component to verify structural placement in the document.
vi.mock("@/components/ui/card", () => ({
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <footer className={className} data-testid="card-footer">
      {children}
    </footer>
  ),
}));

/**
 * Test suite for the `EditCaseSheetFooter` component.
 */
describe("EditCaseSheetFooter", () => {
  // Define default props to represent a standard active state for the details tab.
  const defaultProps = {
    activeTab: "details",
    isSubmitting: false,
    isDisabled: false,
  };

  /**
   * Test case to verify that the footer renders correctly for tabs that require form submission.
   */
  it("renders the footer when activeTab is not 'history'", () => {
    // Arrange: Render the footer using default props.
    render(<EditCaseSheetFooter {...defaultProps} />);

    // Assert: Check that the motion container, footer wrapper, and button are present.
    expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    expect(screen.getByTestId("card-footer")).toBeInTheDocument();
    expect(screen.getByTestId("submit-button")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the footer is hidden when navigating to the read-only history tab.
   */
  it("does not render the footer when activeTab is 'history'", () => {
    // Arrange: Set the `activeTab` prop to 'history'.
    render(<EditCaseSheetFooter {...defaultProps} activeTab="history" />);

    // Assert: Confirm that the footer elements are not present in the DOM.
    expect(screen.queryByTestId("motion-div")).not.toBeInTheDocument();
    expect(screen.queryByTestId("submit-button")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the default button label when no submission is in progress.
   */
  it("displays 'Save Changes' when not submitting", () => {
    // Arrange: Ensure `isSubmitting` is set to false.
    render(<EditCaseSheetFooter {...defaultProps} isSubmitting={false} />);

    // Assert: Verify the button text content.
    expect(screen.getByTestId("submit-button")).toHaveTextContent("Save Changes");
  });

  /**
   * Test case to verify the button label updates to reflect an active submission process.
   */
  it("displays 'Saving...' when submitting", () => {
    // Arrange: Set the `isSubmitting` prop to true.
    render(<EditCaseSheetFooter {...defaultProps} isSubmitting={true} />);

    // Assert: Verify the button text changes to provide visual feedback to the user.
    expect(screen.getByTestId("submit-button")).toHaveTextContent("Saving...");
  });

  /**
   * Test case to verify that the button is programmatically locked when disabled.
   */
  it("disables the button when isDisabled is true", () => {
    // Arrange: Set the `isDisabled` prop to true.
    render(<EditCaseSheetFooter {...defaultProps} isDisabled={true} />);

    // Assert: Confirm the HTML disabled attribute is present on the button.
    expect(screen.getByTestId("submit-button")).toBeDisabled();
  });

  /**
   * Test case to verify that the button remains interactive when not disabled.
   */
  it("enables the button when isDisabled is false", () => {
    // Arrange: Ensure the `isDisabled` prop is set to false.
    render(<EditCaseSheetFooter {...defaultProps} isDisabled={false} />);

    // Assert: Confirm the button does not have the disabled attribute.
    expect(screen.getByTestId("submit-button")).not.toBeDisabled();
  });
});
