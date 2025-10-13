import { fireEvent, render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { AccountSessions } from "@/features/account/components/account-sessions";
import { useSessionToken } from "@/features/account/hooks/use-session";
import { useUserSessions } from "@/features/account/hooks/use-user-sessions";

// Mock the session hook to simulate authenticated and unauthenticated states.
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock the session token hook to provide a consistent token for testing modals.
vi.mock("@/features/account/hooks/use-session", () => ({
  useSessionToken: vi.fn(),
}));

// Mock the custom hook that fetches the list of active user sessions.
vi.mock("@/features/account/hooks/use-user-sessions", () => ({
  useUserSessions: vi.fn(),
}));

// Mock the tab header component to verify it receives the correct section title.
vi.mock("@/features/account/components/account-tab-header", () => ({
  AccountTabHeader: ({ title }: { title: string }) => <div data-testid="tab-header">{title}</div>,
}));

// Mock the session list component to verify session mapping and click interactions.
vi.mock("@/features/account/components/session-list", () => ({
  SessionList: ({
    onSessionClick,
    sessions,
  }: {
    onSessionClick: (s: UserSessionInfo) => void;
    sessions: UserSessionInfo[];
  }) => (
    <div data-testid="session-list">
      {sessions.map((s) => (
        <button key={s.id} data-testid={`session-item-${s.id}`} onClick={() => onSessionClick(s)}>
          Session {s.id}
        </button>
      ))}
    </div>
  ),
}));

// Mock the global sign-out button to verify its click handler propagation.
vi.mock("@/features/account/components/sign-out-all-button", () => ({
  SignOutAllButton: ({ onSignOutAllDevices }: { onSignOutAllDevices: () => void }) => (
    <button data-testid="sign-out-all-btn" onClick={onSignOutAllDevices}>
      Sign Out All
    </button>
  ),
}));

// Mock the modal for signing out all devices to verify its conditional visibility.
vi.mock("@/features/account/components/account-all-sessions-modal", () => ({
  AccountAllSessionsModal: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: () => void }) =>
    isOpen ? (
      <div data-testid="all-sessions-modal">
        <button onClick={onSuccess}>Trigger Success</button>
      </div>
    ) : null,
}));

// Mock the modal for individual session management to verify its interaction with session data.
vi.mock("@/features/account/components/account-session-modal", () => ({
  AccountSessionModal: ({
    isOpen,
    onSuccess,
    session,
  }: {
    isOpen: boolean;
    onSuccess: () => void;
    session: UserSessionInfo | null;
  }) =>
    isOpen ? (
      <div data-testid="single-session-modal">
        <span data-testid="modal-session-id">{session?.id}</span>
        <button onClick={onSuccess}>Trigger Success</button>
      </div>
    ) : null,
}));

/**
 * Test suite for the `AccountSessions` component.
 */
describe("AccountSessions", () => {
  const mockRefetch = vi.fn();
  const mockSessions: UserSessionInfo[] = [
    {
      id: "s1",
      device: "Device 1",
      ipAddress: "127.0.0.1",
      browser: "Chrome",
      operatingSystem: "Windows",
      lastActive: new Date(),
      location: "Location 1",
      dateAdded: new Date(),
      isCurrentSession: true,
      isActiveNow: true,
      sessionToken: "token-s1",
    },
    {
      id: "s2",
      device: "Device 2",
      ipAddress: "127.0.0.1",
      browser: "Firefox",
      operatingSystem: "Linux",
      lastActive: new Date(),
      location: "Location 2",
      dateAdded: new Date(),
      isCurrentSession: false,
      isActiveNow: false,
      sessionToken: "token-s2",
    },
  ];

  const defaultSession = {
    user: { id: "user-123" },
    expires: "2026-01-01",
  };

  // Reset all mocks and initialize standard authentication and session states before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    (useSession as Mock).mockReturnValue({
      data: defaultSession,
      status: "authenticated",
      update: vi.fn(),
    });

    (useSessionToken as Mock).mockReturnValue("token-abc");

    (useUserSessions as Mock).mockReturnValue({
      sessions: mockSessions,
      isLoading: false,
      refetch: mockRefetch,
      error: null,
    });
  });

  /**
   * Test case to verify that the session fetch is called with an empty identifier when no user is logged in.
   */
  it("calls useUserSessions with empty string when user is undefined", () => {
    // Arrange: Mock the session as unauthenticated.
    (useSession as Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<AccountSessions />);

    // Assert: Check that the session fetch hook was called with an empty string fallback.
    expect(useUserSessions).toHaveBeenCalledWith("");
  });

  /**
   * Test case to verify that the component handles missing session lists without crashing.
   */
  it("handles undefined sessions list gracefully", () => {
    // Arrange: Mock the sessions fetch to return an undefined list.
    (useUserSessions as Mock).mockReturnValue({
      sessions: undefined,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(<AccountSessions />);

    // Assert: Verify that the list container exists but contains no session items.
    expect(screen.getByTestId("session-list")).toBeInTheDocument();
    expect(screen.queryByTestId("session-item-s1")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the component functions correctly even if the current session token cannot be retrieved.
   */
  it("passes undefined token to children when session token is null", async () => {
    // Arrange: Mock the session token hook to return null.
    (useSessionToken as Mock).mockReturnValue(null);

    render(<AccountSessions />);

    // Assert: Confirm the main UI renders and the "Sign Out All" modal can still be opened.
    expect(screen.getByTestId("session-list")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sign-out-all-btn"));
    expect(await screen.findByTestId("all-sessions-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the UI displays a loading state (empty render) while fetching session data.
   */
  it("renders nothing when data is not ready", () => {
    // Arrange: Set the loading state to true in the session hook.
    (useUserSessions as Mock).mockReturnValue({
      sessions: [],
      isLoading: true,
      refetch: mockRefetch,
    });

    const { container } = render(<AccountSessions />);

    // Assert: Verify that neither the header nor the list is rendered.
    expect(screen.queryByTestId("tab-header")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass("w-full");
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that all primary UI components are visible once data loading is complete.
   */
  it("renders content when data is ready", () => {
    // Arrange: Render the component in a ready state.
    render(<AccountSessions />);

    // Assert: Verify the presence of the header, the global sign-out button, and the session list.
    expect(screen.getByTestId("tab-header")).toHaveTextContent("Sessions");
    expect(screen.getByTestId("sign-out-all-btn")).toBeInTheDocument();
    expect(screen.getByTestId("session-list")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the global sign-out button triggers the "Sign Out All" modal.
   */
  it("opens Sign Out All modal when button is clicked", async () => {
    // Arrange: Render the component.
    render(<AccountSessions />);

    // Act: Simulate a click on the global sign-out button.
    fireEvent.click(screen.getByTestId("sign-out-all-btn"));

    // Assert: Check that the bulk session management modal appears.
    expect(await screen.findByTestId("all-sessions-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that a successful bulk sign-out triggers a refresh of the session data.
   */
  it("refetches sessions when Sign Out All modal succeeds", async () => {
    // Arrange: Open the "Sign Out All" modal.
    render(<AccountSessions />);
    fireEvent.click(screen.getByTestId("sign-out-all-btn"));

    // Act: Simulate a success signal from the modal.
    const successBtn = await screen.findByText("Trigger Success");
    fireEvent.click(successBtn);

    // Assert: Verify that the session list was refetched.
    expect(mockRefetch).toHaveBeenCalled();
  });

  /**
   * Test case to verify that clicking an individual session entry triggers the single session management modal.
   */
  it("opens Single Session modal when a session is clicked", async () => {
    // Arrange: Render the component.
    render(<AccountSessions />);

    // Act: Click a specific session item from the list.
    fireEvent.click(screen.getByTestId("session-item-s1"));

    // Assert: Verify that the single session modal appears and reflects the correct session ID.
    expect(await screen.findByTestId("single-session-modal")).toBeInTheDocument();
    expect(screen.getByTestId("modal-session-id")).toHaveTextContent("s1");
  });

  /**
   * Test case to verify that a successful single session revocation refreshes the list and closes the modal.
   */
  it("refetches and closes modal when Single Session modal succeeds", async () => {
    // Arrange: Open the single session modal for a specific item.
    render(<AccountSessions />);
    fireEvent.click(screen.getByTestId("session-item-s1"));

    // Act: Simulate a success signal from the single session modal.
    const successBtn = await screen.findByText("Trigger Success");
    fireEvent.click(successBtn);

    // Assert: Verify that the list was refetched and the modal was unmounted.
    expect(mockRefetch).toHaveBeenCalled();
    expect(screen.queryByTestId("single-session-modal")).not.toBeInTheDocument();
  });
});
