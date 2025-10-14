import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TwoFactorSection } from "@/features/account/components/two-factor-section";

/**
 * Test suite for the `TwoFactorSection` component.
 */
describe("TwoFactorSection", () => {
  const mockOnTwoFactorToggle = vi.fn();
  const mockOnRecoveryCodesClick = vi.fn();

  /**
   * Test case to verify the UI state when two-factor authentication is turned off.
   */
  it("renders correctly when 2FA is disabled", () => {
    // Arrange: Render the component with `isTwoFactorEnabled` set to false.
    render(
      <TwoFactorSection
        isTwoFactorEnabled={false}
        onTwoFactorToggle={mockOnTwoFactorToggle}
        onRecoveryCodesClick={mockOnRecoveryCodesClick}
      />
    );

    // Assert: Check that the section title is visible and the switch is in an unchecked state.
    expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();

    // Assert: Verify that the recovery codes button is not rendered when 2FA is disabled.
    expect(screen.queryByRole("button", { name: /recovery codes/i })).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the UI state when two-factor authentication is turned on.
   */
  it("renders correctly when 2FA is enabled", () => {
    // Arrange: Render the component with `isTwoFactorEnabled` set to true.
    render(
      <TwoFactorSection
        isTwoFactorEnabled={true}
        onTwoFactorToggle={mockOnTwoFactorToggle}
        onRecoveryCodesClick={mockOnRecoveryCodesClick}
      />
    );

    // Assert: Check that the switch is in a checked state.
    const toggle = screen.getByRole("switch");
    expect(toggle).toBeChecked();

    // Assert: Verify that the recovery codes button is rendered when 2FA is enabled.
    const button = screen.getByRole("button", { name: /recovery codes/i });
    expect(button).toBeInTheDocument();
  });

  /**
   * Test case to verify that interaction with the switch triggers the toggle callback.
   */
  it("calls onTwoFactorToggle when switch is clicked", () => {
    // Arrange: Render the component in a disabled state.
    render(
      <TwoFactorSection
        isTwoFactorEnabled={false}
        onTwoFactorToggle={mockOnTwoFactorToggle}
        onRecoveryCodesClick={mockOnRecoveryCodesClick}
      />
    );

    // Act: Simulate a user clicking the toggle switch.
    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    // Assert: Check that the `onTwoFactorToggle` function was called with the correct boolean value.
    expect(mockOnTwoFactorToggle).toHaveBeenCalledTimes(1);
    expect(mockOnTwoFactorToggle).toHaveBeenCalledWith(true);
  });

  /**
   * Test case to verify that clicking the recovery codes button triggers the appropriate callback.
   */
  it("calls onRecoveryCodesClick when recovery button is clicked", () => {
    // Arrange: Render the component in an enabled state to ensure the button is visible.
    render(
      <TwoFactorSection
        isTwoFactorEnabled={true}
        onTwoFactorToggle={mockOnTwoFactorToggle}
        onRecoveryCodesClick={mockOnRecoveryCodesClick}
      />
    );

    // Act: Simulate a user clicking the recovery codes button.
    const button = screen.getByRole("button", { name: /recovery codes/i });
    fireEvent.click(button);

    // Assert: Check that the `onRecoveryCodesClick` function was executed once.
    expect(mockOnRecoveryCodesClick).toHaveBeenCalledTimes(1);
  });
});
