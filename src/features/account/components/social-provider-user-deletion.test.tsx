import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SocialProviderUserDeletion } from "@/features/account/components/social-provider-user-deletion";

/**
 * Test suite for the `SocialProviderUserDeletion` component.
 */
describe("SocialProviderUserDeletion", () => {
  const mockOnDeleteAccount = vi.fn();
  const mockOnDeleteLockToggle = vi.fn();

  // Define default properties to maintain consistency across test cases.
  const defaultProps = {
    isDeleteLocked: true,
    isDeleteEnabled: false,
    onDeleteAccount: mockOnDeleteAccount,
    onDeleteLockToggle: mockOnDeleteLockToggle,
  };

  /**
   * Test case to verify that the component initializes in a safe, locked state.
   */
  it("renders correctly in locked state", () => {
    // Arrange: Render the component with default locked props.
    render(<SocialProviderUserDeletion {...defaultProps} />);

    // Assert: Verify the delete button is disabled and the unlock toggle is visible.
    const deleteBtn = screen.getByRole("button", { name: /delete account/i });
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveClass("cursor-not-allowed");

    const lockBtn = screen.getByRole("button", { name: /unlock/i });
    expect(lockBtn).toBeInTheDocument();
  });

  /**
   * Test case to verify that the UI correctly transitions to an enabled state when the lock is removed.
   */
  it("renders correctly in unlocked and enabled state", () => {
    // Arrange: Render the component with the `isDeleteLocked` prop set to false and deletion enabled.
    render(
      <SocialProviderUserDeletion {...defaultProps} isDeleteLocked={false} isDeleteEnabled={true} />
    );

    // Assert: Verify the delete button is active and the lock icon has updated.
    const deleteBtn = screen.getByRole("button", { name: /delete account/i });
    expect(deleteBtn).toBeEnabled();
    expect(deleteBtn).toHaveClass("cursor-pointer");

    const lockBtn = screen.getByRole("button", { name: /lock/i });
    expect(lockBtn).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the lock toggle button executes the provided callback.
   */
  it("calls onDeleteLockToggle when lock button is clicked", () => {
    // Arrange: Render the component.
    render(<SocialProviderUserDeletion {...defaultProps} />);

    // Act: Simulate a click on the lock toggle button.
    const lockBtn = screen.getByRole("button", { name: /unlock/i });
    fireEvent.click(lockBtn);

    // Assert: Confirm the `onDeleteLockToggle` handler was executed once.
    expect(mockOnDeleteLockToggle).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the account deletion logic is triggered when the enabled button is clicked.
   */
  it("calls onDeleteAccount when delete button is clicked and enabled", () => {
    // Arrange: Unlock the component and enable the delete action.
    render(
      <SocialProviderUserDeletion {...defaultProps} isDeleteLocked={false} isDeleteEnabled={true} />
    );

    // Act: Simulate a click on the active delete button.
    const deleteBtn = screen.getByRole("button", { name: /delete account/i });
    fireEvent.click(deleteBtn);

    // Assert: Confirm the `onDeleteAccount` callback was executed once.
    expect(mockOnDeleteAccount).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that interaction with a disabled delete button does not trigger the callback.
   */
  it("does not call onDeleteAccount when delete button is disabled", () => {
    // Arrange: Render the component in its default locked state.
    render(<SocialProviderUserDeletion {...defaultProps} />);

    // Act: Attempt to click the disabled delete button.
    const deleteBtn = screen.getByRole("button", { name: /delete account/i });
    fireEvent.click(deleteBtn);

    // Assert: Confirm that the `onDeleteAccount` handler was not invoked.
    expect(mockOnDeleteAccount).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that accessibility tooltips are displayed when interacting with the lock button.
   */
  it("shows tooltip when hovering over lock button", async () => {
    // Arrange: Render the component.
    render(<SocialProviderUserDeletion {...defaultProps} />);

    // Act: Focus the lock button to trigger the tooltip.
    const lockBtn = screen.getByRole("button", { name: /unlock/i });
    fireEvent.focus(lockBtn);

    // Assert: Wait for and verify the visibility and content of the tooltip element.
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Unlock");
    });
  });
});
