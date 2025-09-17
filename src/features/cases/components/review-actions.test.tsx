import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { ReviewActions } from "@/features/cases/components/review-actions";

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

// Define default props for the component under test.
const defaultProps = {
  isProcessing: false,
  isCancelling: false,
  isSubmitting: false,
  isPending: false,
  onCancel: vi.fn(),
  onPrevious: vi.fn(),
  onSubmit: vi.fn(),
  variants: {},
};

/**
 * Test suite for the `ReviewActions` component.
 */
describe("ReviewActions", () => {
  /**
   * Test suite for the default state where the case is not currently being processed.
   */
  describe("Standard State (Not Processing)", () => {
    /**
     * Test case to verify that the "Previous" and "Submit" buttons are rendered when processing is inactive.
     */
    it("renders Previous and Submit buttons", () => {
      // Arrange: Render the component in the standard state.
      render(<ReviewActions {...defaultProps} isProcessing={false} />);

      // Assert: Check for the presence of the navigation and submission buttons.
      expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
      // Assert: Check for the absence of the "Cancel" button, which is processing-specific.
      expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    });

    /**
     * Test case to verify that clicking the "Previous" button triggers the `onPrevious` callback.
     */
    it("calls onPrevious when clicked", async () => {
      // Arrange: Define a spy for the callback and set up user events.
      const onPreviousMock = vi.fn();
      const user = userEvent.setup();

      // Arrange: Render the component with the mock handler.
      render(<ReviewActions {...defaultProps} onPrevious={onPreviousMock} />);

      // Act: Click the "Previous" button.
      await user.click(screen.getByRole("button", { name: "Previous" }));
      // Assert: Check that the mock function was called exactly once.
      expect(onPreviousMock).toHaveBeenCalledTimes(1);
    });

    /**
     * Test case to verify that clicking the "Submit" button triggers the `onSubmit` callback.
     */
    it("calls onSubmit when clicked", async () => {
      // Arrange: Define a spy for the callback and set up user events.
      const onSubmitMock = vi.fn();
      const user = userEvent.setup();

      // Arrange: Render the component with the mock handler.
      render(<ReviewActions {...defaultProps} onSubmit={onSubmitMock} />);

      // Act: Click the "Submit" button.
      await user.click(screen.getByRole("button", { name: "Submit" }));
      // Assert: Check that the mock function was called exactly once.
      expect(onSubmitMock).toHaveBeenCalledTimes(1);
    });

    /**
     * Test case to verify that all action buttons are disabled and the "Submit" button displays loading text when `isSubmitting` is true.
     */
    it("disables buttons and shows loading text when submitting", () => {
      // Arrange: Render the component with `isSubmitting` set to true.
      render(<ReviewActions {...defaultProps} isSubmitting={true} />);

      // Assert: Check that the submit button displays "Submitting..." and is disabled.
      const submitBtn = screen.getByRole("button", { name: "Submitting..." });
      const prevBtn = screen.getByRole("button", { name: "Previous" });

      expect(submitBtn).toBeDisabled();
      // Assert: Check that the previous button is also disabled.
      expect(prevBtn).toBeDisabled();
    });

    /**
     * Test case to verify that buttons are disabled when the form or state logic indicates a pending action (`isPending`).
     */
    it("disables buttons when isPending is true", () => {
      // Arrange: Render the component with `isPending` set to true.
      render(<ReviewActions {...defaultProps} isPending={true} />);

      // Assert: Check that both action buttons are disabled.
      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    });
  });

  /**
   * Test suite for the state where the case is currently processing the analysis.
   */
  describe("Processing State", () => {
    /**
     * Test case to verify that only the "Cancel" button is rendered when `isProcessing` is true.
     */
    it("renders only the Cancel button", () => {
      // Arrange: Render the component with `isProcessing` set to true.
      render(<ReviewActions {...defaultProps} isProcessing={true} />);

      // Assert: Check for the presence of the "Cancel" button.
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      // Assert: Check for the absence of the other action buttons.
      expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
    });

    /**
     * Test case to verify that clicking the "Cancel" button triggers the `onCancel` callback.
     */
    it("calls onCancel when clicked", async () => {
      // Arrange: Define a spy for the callback and set up user events.
      const onCancelMock = vi.fn();
      const user = userEvent.setup();

      // Arrange: Render the component in the processing state with the mock handler.
      render(<ReviewActions {...defaultProps} isProcessing={true} onCancel={onCancelMock} />);

      // Act: Click the "Cancel" button.
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      // Assert: Check that the mock function was called exactly once.
      expect(onCancelMock).toHaveBeenCalledTimes(1);
    });

    /**
     * Test case to verify that the "Cancel" button is disabled and displays loading text when `isCancelling` is true.
     */
    it("disables the button and shows loading text when cancelling", () => {
      // Arrange: Render the component in the cancelling state.
      render(<ReviewActions {...defaultProps} isProcessing={true} isCancelling={true} />);

      // Assert: Check that the button displays "Cancelling..." and is disabled.
      const cancelBtn = screen.getByRole("button", { name: "Cancelling..." });
      expect(cancelBtn).toBeDisabled();
    });
  });
});
