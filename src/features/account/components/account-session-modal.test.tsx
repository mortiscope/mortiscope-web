import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { AccountSessionModal } from "@/features/account/components/account-session-modal";
import { useRevokeSession } from "@/features/account/hooks/use-revoke-session";

// Mock the custom hook responsible for revoking specific user sessions.
vi.mock("@/features/account/hooks/use-revoke-session", () => ({
  useRevokeSession: vi.fn(),
}));

// Mock the modal header to verify that the session details title is rendered.
vi.mock("@/features/account/components/account-modal-header", () => ({
  AccountModalHeader: ({ title }: { title: string }) => (
    <div data-testid="modal-header">{title}</div>
  ),
}));

// Mock the session details list to ensure the correct session metadata is displayed.
vi.mock("@/features/account/components/session-details-list", () => ({
  SessionDetailsList: ({ session }: { session: UserSessionInfo }) => (
    <div data-testid="session-details">Details for {session.id}</div>
  ),
}));

// Mock the footer to track button interactions and the visibility of the signing-out state.
vi.mock("@/features/account/components/account-modal-footer", () => ({
  AccountModalFooter: ({
    onCancel,
    onAction,
    disabled,
    isPending,
  }: {
    onCancel: () => void;
    onAction: () => void;
    disabled: boolean;
    isPending: boolean;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onCancel}>Close</button>
      <button onClick={onAction} disabled={disabled}>
        {isPending ? "Signing out..." : "Sign Out"}
      </button>
    </div>
  ),
}));

// Mock the UI Dialog components to provide testable triggers for state changes and overlays.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog">
        <button data-testid="dialog-overlay" onClick={() => onOpenChange(false)} />
        <button onClick={() => onOpenChange(true)}>Simulate Re-Open</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
}));

// Mock framer-motion to avoid animation-related timing issues during tests.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

/**
 * Test suite for the `AccountSessionModal` component.
 */
describe("AccountSessionModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockHandleSignOut = vi.fn();
  const mockResetState = vi.fn();
  const mockOnSuccess = vi.fn();

  // Define default values returned by the useRevokeSession hook.
  const defaultHookValues = {
    isSigningOut: false,
    handleSignOut: mockHandleSignOut,
    resetState: mockResetState,
  };

  const mockSession = {
    id: "session-123",
    sessionToken: "token-123",
    device: "Chrome on Windows",
  } as unknown as UserSessionInfo;

  // Define default props for the AccountSessionModal component.
  const defaultProps = {
    isOpen: true,
    onOpenChange: mockOnOpenChange,
    session: mockSession,
    userId: "user-1",
    currentSessionToken: "token-456",
    onSuccess: mockOnSuccess,
  };

  // Reset all mocks and initialize the hook return value before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    (useRevokeSession as Mock).mockReturnValue(defaultHookValues);
  });

  /**
   * Test case to verify that the modal does not render if no session data is provided.
   */
  it("renders nothing if session is null", () => {
    // Arrange: Render the component with a null `session` prop.
    render(<AccountSessionModal {...defaultProps} session={null} />);

    // Assert: Verify that the dialog is not present in the document.
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal is hidden when the isOpen prop is false.
   */
  it("renders nothing if isOpen is false", () => {
    // Arrange: Render the component with the `isOpen` prop set to false.
    render(<AccountSessionModal {...defaultProps} isOpen={false} />);

    // Assert: Verify that the dialog is not present in the document.
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify the visual structure of the modal when active.
   */
  it("renders correctly when open with a session", () => {
    // Arrange: Render the component with default props.
    render(<AccountSessionModal {...defaultProps} />);

    // Assert: Check for header content, session details, and the footer.
    expect(screen.getByTestId("modal-header")).toHaveTextContent("Session Details");
    expect(screen.getByTestId("session-details")).toHaveTextContent("Details for session-123");
    expect(screen.getByTestId("modal-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that useRevokeSession is initialized with the correct user and session tokens.
   */
  it("initializes hook with correct parameters", () => {
    // Arrange: Render the component.
    render(<AccountSessionModal {...defaultProps} />);

    // Assert: Check that the hook was called with the `userId`, `currentSessionToken`, and callbacks.
    expect(useRevokeSession).toHaveBeenCalledWith(
      "user-1",
      "token-456",
      mockOnSuccess,
      expect.any(Function)
    );
  });

  /**
   * Test case to verify that users can sign out of other devices from the modal.
   */
  it("enables 'Sign Out' button if looking at a different session", () => {
    // Arrange: Render a session that does not match the current device token.
    render(
      <AccountSessionModal
        {...defaultProps}
        session={{ ...mockSession, sessionToken: "token-other" } as unknown as UserSessionInfo}
        currentSessionToken="token-current"
      />
    );

    // Assert: Check that the sign-out button is interactive.
    const signOutBtn = screen.getByText("Sign Out");
    expect(signOutBtn).toBeEnabled();
  });

  /**
   * Test case to verify that users cannot sign out of their current session via this specific modal.
   */
  it("disables 'Sign Out' button if looking at the current session", () => {
    // Arrange: Render a session that matches the active device token.
    render(
      <AccountSessionModal
        {...defaultProps}
        session={{ ...mockSession, sessionToken: "same-token" } as unknown as UserSessionInfo}
        currentSessionToken="same-token"
      />
    );

    // Assert: Check that the sign-out button is disabled.
    const signOutBtn = screen.getByText("Sign Out");
    expect(signOutBtn).toBeDisabled();
  });

  /**
   * Test case to verify that clicking the sign-out button triggers the revocation logic for the session.
   */
  it("calls handleSignOut when 'Sign Out' button is clicked", () => {
    // Arrange: Render the component.
    render(<AccountSessionModal {...defaultProps} />);

    // Act: Simulate a click on the sign-out button.
    fireEvent.click(screen.getByText("Sign Out"));

    // Assert: Verify that the hook handler was called with the selected session.
    expect(mockHandleSignOut).toHaveBeenCalledWith(mockSession);
  });

  /**
   * Test case to verify that the modal performs cleanup and closes when the close button is clicked.
   */
  it("calls resetState and onOpenChange when 'Close' button is clicked", () => {
    // Arrange: Render the component.
    render(<AccountSessionModal {...defaultProps} />);

    // Act: Simulate a click on the close button.
    fireEvent.click(screen.getByText("Close"));

    // Assert: Confirm that state was reset and the visibility update was triggered.
    expect(mockResetState).toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the modal performs cleanup and closes when the overlay is interacted with.
   */
  it("calls resetState and onOpenChange when dialog overlay is clicked", () => {
    // Arrange: Render the component.
    render(<AccountSessionModal {...defaultProps} />);

    // Act: Simulate a click on the dialog overlay.
    fireEvent.click(screen.getByTestId("dialog-overlay"));

    // Assert: Confirm that state was reset and the visibility update was triggered.
    expect(mockResetState).toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the footer reflects the active sign-out process.
   */
  it("reflects pending state in the footer", () => {
    // Arrange: Mock the hook to indicate an active signing-out state.
    (useRevokeSession as Mock).mockReturnValue({
      ...defaultHookValues,
      isSigningOut: true,
    });

    render(<AccountSessionModal {...defaultProps} />);

    // Assert: Verify that the processing text is displayed.
    expect(screen.getByText("Signing out...")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component reacts correctly to an internal closure trigger from the hook.
   */
  it("calls onOpenChange(false) when hook executes the passed onClose callback", () => {
    // Arrange: Render the component.
    render(<AccountSessionModal {...defaultProps} />);

    // Act: Retrieve and execute the onClose callback passed into the hook.
    const [, , , onCloseCallback] = (useRevokeSession as Mock).mock.calls[0];
    onCloseCallback();

    // Assert: Verify that the modal visibility state change was triggered.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that state is preserved if the dialog triggers a visibility change that is not a closure.
   */
  it("does not call resetState when onOpenChange is called with true", () => {
    // Arrange: Render the component.
    render(<AccountSessionModal {...defaultProps} />);

    // Act: Simulate the dialog triggering a reopen state.
    fireEvent.click(screen.getByText("Simulate Re-Open"));

    // Assert: Verify the visibility change occurred but the state was not reset.
    expect(mockResetState).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(true);
  });
});
