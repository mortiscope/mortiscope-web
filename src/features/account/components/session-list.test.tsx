import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { SessionList } from "@/features/account/components/session-list";

// Mock the SessionCard sub-component to verify how the list maps and passes data to individual items.
vi.mock("@/features/account/components/session-card", () => ({
  SessionCard: ({
    sessionItem,
    isCurrentSession,
    onSessionClick,
  }: {
    sessionItem: UserSessionInfo;
    isCurrentSession: boolean;
    onSessionClick: (s: UserSessionInfo) => void;
  }) => (
    <button
      data-testid={`session-card-${sessionItem.id}`}
      data-current={isCurrentSession}
      onClick={() => onSessionClick(sessionItem)}
    >
      {sessionItem.device || "Unknown Device"}
    </button>
  ),
}));

/**
 * Test suite for the `SessionList` component.
 */
describe("SessionList", () => {
  const mockSessions = [
    {
      id: "session-1",
      sessionToken: "token-1",
      device: "iPhone 13",
      ipAddress: "192.168.1.1",
      lastActiveAt: new Date(),
    },
    {
      id: "session-2",
      sessionToken: "token-2",
      device: "MacBook Pro",
      ipAddress: "192.168.1.2",
      lastActiveAt: new Date(),
    },
  ] as unknown as UserSessionInfo[];

  const mockOnSessionClick = vi.fn();

  /**
   * Test case to verify that the component correctly renders an entry for every session in the provided array.
   */
  it("renders a list of session cards", () => {
    // Arrange: Render the list with mock session data.
    render(
      <SessionList
        sessions={mockSessions}
        currentSessionToken="token-1"
        onSessionClick={mockOnSessionClick}
      />
    );

    // Assert: Check that specific test IDs and device labels for each session are present in the DOM.
    expect(screen.getByTestId("session-card-session-1")).toBeInTheDocument();
    expect(screen.getByTestId("session-card-session-2")).toBeInTheDocument();
    expect(screen.getByText("iPhone 13")).toBeInTheDocument();
    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component accurately distinguishes the current active session based on the token.
   */
  it("correctly identifies the current session", () => {
    // Arrange: Provide a token that matches the first session item.
    render(
      <SessionList
        sessions={mockSessions}
        currentSessionToken="token-1"
        onSessionClick={mockOnSessionClick}
      />
    );

    const firstSession = screen.getByTestId("session-card-session-1");
    const secondSession = screen.getByTestId("session-card-session-2");

    // Assert: Verify that the `isCurrentSession` logic correctly flags the matching token.
    expect(firstSession).toHaveAttribute("data-current", "true");
    expect(secondSession).toHaveAttribute("data-current", "false");
  });

  /**
   * Test case to verify that clicking a session card triggers the click handler with the specific session object.
   */
  it("calls onSessionClick with the correct session item", () => {
    // Arrange: Render the component.
    render(
      <SessionList
        sessions={mockSessions}
        currentSessionToken="token-1"
        onSessionClick={mockOnSessionClick}
      />
    );

    // Act: Simulate a click event on the second session card.
    const secondSessionButton = screen.getByTestId("session-card-session-2");
    fireEvent.click(secondSessionButton);

    // Assert: Confirm the callback was executed once with the correct session metadata.
    expect(mockOnSessionClick).toHaveBeenCalledTimes(1);
    expect(mockOnSessionClick).toHaveBeenCalledWith(mockSessions[1]);
  });

  /**
   * Test case to verify that the component renders an empty container without error when no sessions are provided.
   */
  it("renders nothing (empty grid) if sessions array is empty", () => {
    // Arrange: Render the list with an empty `sessions` array.
    render(
      <SessionList sessions={[]} currentSessionToken={null} onSessionClick={mockOnSessionClick} />
    );

    // Assert: Confirm that no session card elements are found in the document.
    const cards = screen.queryAllByTestId(/session-card-/);
    expect(cards).toHaveLength(0);
  });
});
