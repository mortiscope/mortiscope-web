import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { EditCaseButton } from "@/features/cases/components/edit-case-button";

// Mock the Tooltip components to isolate the button's rendering and behavior logic.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-root">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock the icons used within the component.
vi.mock("react-icons/pi", () => ({
  PiNotePencil: () => <svg data-testid="icon-pencil" />,
  PiSealPercent: () => <svg />,
  PiSealWarning: () => <svg />,
}));

/**
 * Test suite for the `EditCaseButton component`.
 */
describe("EditCaseButton", () => {
  /**
   * Test case to verify that the button renders enabled by default with the correct label and icon.
   */
  it("renders the button enabled by default", () => {
    // Arrange: Render the component without specific props.
    render(<EditCaseButton />);

    // Assert: Check for the presence of the button with the correct accessible name.
    const button = screen.getByRole("button", { name: "Edit Case" });
    expect(button).toBeInTheDocument();
    // Assert: Check that the button is not disabled.
    expect(button).not.toBeDisabled();
    // Assert: Check for the presence of the pencil icon.
    expect(screen.getByTestId("icon-pencil")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the button is correctly wrapped in a Tooltip when it is enabled.
   */
  it("wraps the button in a Tooltip when enabled", () => {
    // Arrange: Render the component in an enabled state.
    render(<EditCaseButton isDisabled={false} />);

    // Assert: Check for the presence of the mocked Tooltip components.
    expect(screen.getByTestId("tooltip-root")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
    // Assert: Check that the Tooltip content displays the correct text.
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Edit Case");
  });

  /**
   * Test case to verify that the button is rendered without a Tooltip wrapper when it is disabled.
   */
  it("does not wrap the button in a Tooltip when disabled", () => {
    // Arrange: Render the component with `isDisabled` set to true.
    render(<EditCaseButton isDisabled={true} />);

    // Assert: Check that the mocked Tooltip root component is not present.
    expect(screen.queryByTestId("tooltip-root")).not.toBeInTheDocument();

    // Assert: Check that the button is present and disabled.
    const button = screen.getByRole("button", { name: "Edit Case" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  /**
   * Test case to verify that appropriate styling and accessibility attributes are applied to the wrapper element when the button is disabled.
   */
  it("applies correct styling to the wrapper when disabled", () => {
    // Arrange: Render the component with `isDisabled` set to true.
    render(<EditCaseButton isDisabled={true} />);

    // Assert: Find the button and its parent wrapper element.
    const button = screen.getByRole("button", { name: "Edit Case" });
    const wrapper = button.parentElement;

    // Assert: Check for the disabled cursor style class.
    expect(wrapper).toHaveClass("cursor-not-allowed");
    // Assert: Check for the `tabIndex` attribute to remove it from keyboard navigation.
    expect(wrapper).toHaveAttribute("tabIndex", "-1");
  });

  /**
   * Test case to verify that the `onClick` handler is executed when the enabled button is clicked.
   */
  it("calls onClick when clicked", async () => {
    // Arrange: Define a mock function for the click event and set up user events.
    const onClickMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component with the mock handler.
    render(<EditCaseButton onClick={onClickMock} />);

    // Act: Click the button.
    const button = screen.getByRole("button", { name: "Edit Case" });
    await user.click(button);

    // Assert: Check that the mock click handler was called exactly once.
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the `onClick` handler is not executed when the button is disabled.
   */
  it("does not call onClick when disabled", async () => {
    // Arrange: Define a mock click handler and set up user events.
    const onClickMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component in a disabled state with the mock handler.
    render(<EditCaseButton isDisabled={true} onClick={onClickMock} />);

    // Act: Attempt to click the button.
    const button = screen.getByRole("button", { name: "Edit Case" });
    await user.click(button);

    // Assert: Check that the mock click handler was never called.
    expect(onClickMock).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure the component does not throw an error if clicked when no `onClick` handler is provided.
   */
  it("does not error when clicked without an onClick handler", async () => {
    // Arrange: Set up user events and render the component without an `onClick` prop.
    const user = userEvent.setup();
    render(<EditCaseButton />);

    // Act: Click the button.
    const button = screen.getByRole("button", { name: "Edit Case" });
    await user.click(button);

    // Assert: Check that the button is still in the document, confirming no crash occurred.
    expect(button).toBeInTheDocument();
  });
});
