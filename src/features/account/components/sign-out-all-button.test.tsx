import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignOutAllButton } from "@/features/account/components/sign-out-all-button";

/**
 * Test suite for the `SignOutAllButton` component.
 */
describe("SignOutAllButton", () => {
  const mockOnSignOutAllDevices = vi.fn();

  /**
   * Test case to verify that the button is interactive when criteria for a bulk sign-out are met.
   */
  it("renders enabled button when user exists and has multiple sessions", () => {
    // Arrange: Render the button with a valid `userId` and more than one session.
    render(
      <SignOutAllButton
        userId="user-123"
        sessionsCount={2}
        onSignOutAllDevices={mockOnSignOutAllDevices}
      />
    );

    // Act: Locate the button by its accessible name.
    const button = screen.getByRole("button", { name: /sign out of all devices/i });

    // Assert: Verify the button is enabled and displays the active rose color and pointer cursor.
    expect(button).toBeEnabled();
    expect(button).toHaveClass("bg-rose-600");
    expect(button).toHaveClass("cursor-pointer");
  });

  /**
   * Test case to verify that the button is disabled when only one session exists, preventing redundant actions.
   */
  it("renders disabled button when session count is 1", () => {
    // Arrange: Render the button with exactly one session.
    render(
      <SignOutAllButton
        userId="user-123"
        sessionsCount={1}
        onSignOutAllDevices={mockOnSignOutAllDevices}
      />
    );

    // Act: Locate the button by its accessible name.
    const button = screen.getByRole("button", { name: /sign out of all devices/i });

    // Assert: Verify the button is disabled and reflects the disabled state via specific TailWind classes.
    expect(button).toBeDisabled();
    expect(button).toHaveClass("bg-rose-400");
    expect(button).toHaveClass("cursor-not-allowed");
    expect(button).toHaveClass("opacity-50");
  });

  /**
   * Test case to verify that the button is disabled if the `userId` prop is not provided.
   */
  it("renders disabled button when userId is missing", () => {
    // Arrange: Render the button with an undefined `userId`.
    render(
      <SignOutAllButton
        userId={undefined}
        sessionsCount={5}
        onSignOutAllDevices={mockOnSignOutAllDevices}
      />
    );

    // Act: Locate the button.
    const button = screen.getByRole("button", { name: /sign out of all devices/i });

    // Assert: Confirm the button is non-interactive despite a high session count.
    expect(button).toBeDisabled();
  });

  /**
   * Test case to verify that the `onSignOutAllDevices` callback is triggered upon a successful click.
   */
  it("calls onSignOutAllDevices when clicked and enabled", () => {
    // Arrange: Render the button in an enabled state.
    render(
      <SignOutAllButton
        userId="user-123"
        sessionsCount={3}
        onSignOutAllDevices={mockOnSignOutAllDevices}
      />
    );

    // Act: Simulate a user click on the button.
    const button = screen.getByRole("button", { name: /sign out of all devices/i });
    fireEvent.click(button);

    // Assert: Verify that the provided callback handler was executed once.
    expect(mockOnSignOutAllDevices).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that clicking the button while disabled does not trigger the callback.
   */
  it("does not call handler when clicked and disabled", () => {
    // Arrange: Render the button in a disabled state.
    render(
      <SignOutAllButton
        userId="user-123"
        sessionsCount={1}
        onSignOutAllDevices={mockOnSignOutAllDevices}
      />
    );

    // Act: Attempt to click the disabled button.
    const button = screen.getByRole("button", { name: /sign out of all devices/i });
    fireEvent.click(button);

    // Assert: Verify that the callback handler was not called.
    expect(mockOnSignOutAllDevices).not.toHaveBeenCalled();
  });
});
