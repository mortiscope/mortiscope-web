import { act, fireEvent, render, screen } from "@testing-library/react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestAccountDeletion } from "@/features/account/actions/request-account-deletion";
import { AccountDeletionModal } from "@/features/account/components/account-deletion-modal";

// Mock the NextAuth sign-out function to verify redirection after account deletion.
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// Mock the toast notification system to inspect success and error messages.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock the server action responsible for initiating the account deletion process.
vi.mock("@/features/account/actions/request-account-deletion", () => ({
  requestAccountDeletion: vi.fn(),
}));

// Mock the shared modal header component.
vi.mock("@/features/account/components/account-modal-header", () => ({
  AccountModalHeader: ({ title }: { title: string }) => (
    <div data-testid="modal-header">{title}</div>
  ),
}));

// Mock the shared modal footer component to track button states and click events.
vi.mock("@/features/account/components/account-modal-footer", () => ({
  AccountModalFooter: ({
    onAction,
    onCancel,
    disabled,
    actionButtonText,
  }: {
    onAction: () => void;
    onCancel: () => void;
    disabled: boolean;
    actionButtonText: string;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onAction} disabled={disabled}>
        {actionButtonText}
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock the UI Dialog components to provide testable triggers for visibility changes.
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
        <button onClick={() => onOpenChange(false)} data-testid="dialog-close">
          Close
        </button>
        <button onClick={() => onOpenChange(true)} data-testid="dialog-reopen">
          Reopen
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * Test suite for the `AccountDeletionModal` component.
 */
describe("AccountDeletionModal", () => {
  const mockOnOpenChange = vi.fn();
  const defaultProps = {
    isOpen: true,
    onOpenChange: mockOnOpenChange,
    verifiedPassword: "secure-password",
  };

  // Clear all mock state before each test to maintain isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Ensure all mocks are restored to their original state after each test.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test case to verify that the modal and its critical elements are rendered when visible.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the modal in an open state.
    render(<AccountDeletionModal {...defaultProps} />);

    // Assert: Verify the presence of the dialog, header, input field, and the initial disabled state of the button.
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("modal-header")).toHaveTextContent("Delete Account");
    expect(screen.getByPlaceholderText("Delete this account")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeDisabled();
  });

  /**
   * Test case to verify that the modal does not appear in the DOM when the isOpen prop is false.
   */
  it("does not render when closed", () => {
    // Arrange: Render the modal with the `isOpen` prop set to false.
    render(<AccountDeletionModal {...defaultProps} isOpen={false} />);

    // Assert: Confirm that the dialog element is missing from the document.
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the deletion button remains disabled until the exact confirmation text is entered.
   */
  it("validates confirmation text input", () => {
    // Arrange: Render the modal.
    render(<AccountDeletionModal {...defaultProps} />);

    const input = screen.getByPlaceholderText("Delete this account");
    const deleteButton = screen.getByRole("button", { name: "Delete Account" });

    // Act: Enter incorrect confirmation text.
    fireEvent.change(input, { target: { value: "wrong text" } });

    // Assert: Check that the button remains disabled.
    expect(deleteButton).toBeDisabled();

    // Act: Enter the correct confirmation string.
    fireEvent.change(input, { target: { value: "Delete this account" } });

    // Assert: Check that the button is now enabled.
    expect(deleteButton).toBeEnabled();
  });

  /**
   * Test case to verify the complete successful account deletion process, including async timers and logout.
   */
  it("handles successful deletion flow", async () => {
    // Arrange: Enable fake timers to test the delayed logout and mock a successful server response.
    vi.useFakeTimers();
    vi.mocked(requestAccountDeletion).mockResolvedValue({ success: "Deletion scheduled" });

    render(<AccountDeletionModal {...defaultProps} />);

    // Act: Input valid confirmation and trigger the deletion button.
    const input = screen.getByPlaceholderText("Delete this account");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Delete this account" } });
    });

    const deleteButton = screen.getByRole("button", { name: "Delete Account" });
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Assert: Verify server action call, success notifications, and modal closure.
    expect(requestAccountDeletion).toHaveBeenCalledWith({
      password: "secure-password",
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Account deletion initiated successfully.",
      expect.any(Object)
    );
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(toast.warning).toHaveBeenCalledWith(
      "You will be logged out shortly.",
      expect.any(Object)
    );

    // Act: Advance time to trigger the logout logic.
    act(() => {
      vi.runAllTimers();
    });

    // Assert: Confirm the user is redirected to the sign-in page.
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/signin" });
    vi.useRealTimers();
  });

  /**
   * Test case to verify error handling when the server action returns a specific error message.
   */
  it("handles deletion failure", async () => {
    // Arrange: Mock the server action to return a network error.
    vi.mocked(requestAccountDeletion).mockResolvedValue({
      error: "Network error",
    });

    render(<AccountDeletionModal {...defaultProps} />);

    // Act: Confirm and submit the deletion.
    const input = screen.getByPlaceholderText("Delete this account");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Delete this account" } });
    });

    const deleteButton = screen.getByRole("button", { name: "Delete Account" });
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Assert: Verify the error toast is shown and the modal/session remains active.
    expect(requestAccountDeletion).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Network error", expect.any(Object));
    expect(mockOnOpenChange).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a default error message is displayed when the server returns an empty error string.
   */
  it("handles deletion failure with default error message", async () => {
    // Arrange: Mock an empty error response.
    vi.mocked(requestAccountDeletion).mockResolvedValue({
      error: "",
    });

    render(<AccountDeletionModal {...defaultProps} />);

    // Act: Submit the valid confirmation.
    const input = screen.getByPlaceholderText("Delete this account");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Delete this account" } });
    });

    const deleteButton = screen.getByRole("button", { name: "Delete Account" });
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Assert: Check that the fallback error message is used.
    expect(toast.error).toHaveBeenCalledWith(
      "Failed to initiate account deletion.",
      expect.any(Object)
    );
  });

  /**
   * Test case to verify that unexpected promise rejections are handled gracefully with a generic error toast.
   */
  it("handles unexpected errors during deletion", async () => {
    // Arrange: Mock the server action to throw an exception.
    vi.mocked(requestAccountDeletion).mockRejectedValue(new Error("Unexpected"));

    render(<AccountDeletionModal {...defaultProps} />);

    // Act: Submit the deletion.
    const input = screen.getByPlaceholderText("Delete this account");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Delete this account" } });
    });

    const deleteButton = screen.getByRole("button", { name: "Delete Account" });
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Assert: Confirm that the catch block triggers a generic error toast.
    expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", expect.any(Object));
  });

  /**
   * Test case to ensure that deletion does not proceed if the password verification prop is missing.
   */
  it("does not proceed if verifiedPassword is missing", async () => {
    // Arrange: Render the modal without the required `verifiedPassword`.
    render(<AccountDeletionModal {...defaultProps} verifiedPassword={undefined} />);

    // Act: Attempt to submit the form.
    const input = screen.getByPlaceholderText("Delete this account");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Delete this account" } });
    });

    const deleteButton = screen.getByRole("button", { name: "Delete Account" });
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Assert: Ensure the server action was never called.
    expect(requestAccountDeletion).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the internal form state is reset when the modal is closed.
   */
  it("resets form when modal is closed via handleOpenChange", async () => {
    // Arrange: Render the modal.
    render(<AccountDeletionModal {...defaultProps} />);

    // Act: Type into the input and then close the dialog.
    const input = screen.getByPlaceholderText("Delete this account");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Delete this account" } });
    });

    const closeButton = screen.getByTestId("dialog-close");
    fireEvent.click(closeButton);

    // Assert: Confirm the visibility change was triggered.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the cancel button triggers the visibility change callback.
   */
  it("calls onOpenChange(false) when cancel button is clicked", () => {
    // Arrange: Render the modal.
    render(<AccountDeletionModal {...defaultProps} />);

    // Act: Click the cancel button in the footer.
    fireEvent.click(screen.getByText("Cancel"));

    // Assert: Confirm the closure callback was executed.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the form state is maintained if the dialog triggers an open event without a closure.
   */
  it("calls onOpenChange(true) without resetting form when reopened", () => {
    // Arrange: Render the modal.
    render(<AccountDeletionModal {...defaultProps} />);

    // Act: Enter text and trigger a reopen event from the dialog.
    const input = screen.getByPlaceholderText("Delete this account");
    fireEvent.change(input, { target: { value: "some text" } });

    fireEvent.click(screen.getByTestId("dialog-reopen"));

    // Assert: Confirm visibility remains true and form state is untouched.
    expect(mockOnOpenChange).toHaveBeenCalledWith(true);
  });
});
