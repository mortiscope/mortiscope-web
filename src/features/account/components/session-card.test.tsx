import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { SessionCard } from "@/features/account/components/session-card";

// Mock the sub-component that displays specific session details to isolate card-level logic.
vi.mock("@/features/account/components/session-information", () => ({
  SessionInformation: () => <div data-testid="session-info">Session Information</div>,
}));

/**
 * Test suite for the `SessionCard` component.
 */
describe("SessionCard", () => {
  const mockSession = {
    id: "session-123",
    device: "Desktop",
    browser: "Chrome",
  } as unknown as UserSessionInfo;

  const mockOnSessionClick = vi.fn();

  /**
   * Test case to verify that the card correctly renders session info and the review action trigger.
   */
  it("renders session information and review button", () => {
    // Arrange: Render the component with standard session data.
    render(
      <SessionCard
        sessionItem={mockSession}
        isCurrentSession={false}
        onSessionClick={mockOnSessionClick}
      />
    );

    // Assert: Verify the presence of the mocked info section and the interactive review button.
    expect(screen.getByTestId("session-info")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review/i })).toBeInTheDocument();
  });

  /**
   * Test case to verify that the active session is visually highlighted with specific styles and badges.
   */
  it("displays 'Current' badge and active styles when isCurrentSession is true", () => {
    // Arrange: Render the component with the `isCurrentSession` flag set to true.
    const { container } = render(
      <SessionCard
        sessionItem={mockSession}
        isCurrentSession={true}
        onSessionClick={mockOnSessionClick}
      />
    );

    // Assert: Check for the "Current" badge text and specific TailWind emerald theme classes.
    expect(screen.getByText("Current")).toBeInTheDocument();

    expect(container.firstChild).toHaveClass("border-emerald-500");
    expect(container.firstChild).toHaveClass("bg-emerald-50");
  });

  /**
   * Test case to verify that inactive sessions use the default neutral styling without the current badge.
   */
  it("does not display 'Current' badge and uses default styles when isCurrentSession is false", () => {
    // Arrange: Render the component with the `isCurrentSession` flag set to false.
    const { container } = render(
      <SessionCard
        sessionItem={mockSession}
        isCurrentSession={false}
        onSessionClick={mockOnSessionClick}
      />
    );

    // Assert: Confirm the badge is missing and the container uses standard slate border classes.
    expect(screen.queryByText("Current")).not.toBeInTheDocument();

    expect(container.firstChild).toHaveClass("border-slate-200");
    expect(container.firstChild).not.toHaveClass("bg-emerald-50");
  });

  /**
   * Test case to verify that clicking anywhere on the card container triggers the selection callback.
   */
  it("calls onSessionClick when the card container is clicked", () => {
    // Arrange: Render the component.
    const { container } = render(
      <SessionCard
        sessionItem={mockSession}
        isCurrentSession={false}
        onSessionClick={mockOnSessionClick}
      />
    );

    // Act: Simulate a click event on the root element of the card.
    fireEvent.click(container.firstChild as Element);

    // Assert: Verify the callback was executed with the correct `mockSession` object.
    expect(mockOnSessionClick).toHaveBeenCalledTimes(1);
    expect(mockOnSessionClick).toHaveBeenCalledWith(mockSession);
  });

  /**
   * Test case to verify that clicking the specific review button triggers the selection callback.
   */
  it("calls onSessionClick when the review button is clicked", () => {
    // Arrange: Render the component.
    render(
      <SessionCard
        sessionItem={mockSession}
        isCurrentSession={false}
        onSessionClick={mockOnSessionClick}
      />
    );

    // Act: Simulate a click event on the review button.
    const button = screen.getByRole("button", { name: /review/i });
    fireEvent.click(button);

    // Assert: Verify the callback was executed with the correct `mockSession` object.
    expect(mockOnSessionClick).toHaveBeenCalledTimes(1);
    expect(mockOnSessionClick).toHaveBeenCalledWith(mockSession);
  });
});
