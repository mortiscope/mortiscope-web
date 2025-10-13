import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountAllSessionsModal } from "@/features/account/components/account-all-sessions-modal";
import { useSignOutAllSessions } from "@/features/account/hooks/use-sign-out-all-sessions";

// Mock the custom hook responsible for handling the sign-out logic and form state.
vi.mock("@/features/account/hooks/use-sign-out-all-sessions", () => ({
  useSignOutAllSessions: vi.fn(),
}));

// Mock the modal header component to verify the title prop is passed correctly.
vi.mock("@/features/account/components/account-modal-header", () => ({
  AccountModalHeader: ({ title }: { title: string }) => (
    <div data-testid="modal-header">{title}</div>
  ),
}));

// Mock the modal footer to simulate user interactions with the cancel and action buttons.
vi.mock("@/features/account/components/account-modal-footer", () => ({
  AccountModalFooter: ({ onCancel, onAction }: { onCancel: () => void; onAction: () => void }) => (
    <div data-testid="modal-footer">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onAction}>Sign Out</button>
    </div>
  ),
}));

// Mock the inner form component to ensure it is rendered within the modal.
vi.mock("@/features/account/components/sign-out-all-form", () => ({
  SignOutAllForm: () => <div data-testid="sign-out-form">Form Content</div>,
}));

// Mock the UI Dialog components to control and inspect the visibility of the modal.
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
        <button data-testid="dialog-overlay-close" onClick={() => onOpenChange(false)}>
          Close Overlay
        </button>
        <button data-testid="dialog-reopen" onClick={() => onOpenChange(true)}>
          Reopen
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
}));

import { AccountAllSessionsModalFormValues } from "@/features/account/schemas/account";

/**
 * Test suite for the `AccountAllSessionsModal` component.
 */
describe("AccountAllSessionsModal", () => {
  // Define mock functions for form interactions.
  const mockResetForm = vi.fn();
  const mockHandleSubmit = vi.fn();
  const mockFormHandleSubmit = vi.fn(
    (fn: (data: AccountAllSessionsModalFormValues) => void) => (e?: React.BaseSyntheticEvent) => {
      e?.preventDefault?.();
      fn({ password: "password", signOutOption: "exclude_current" });
    }
  );

  // Define the default return values for the useSignOutAllSessions hook.
  const defaultHookReturn = {
    form: { handleSubmit: mockFormHandleSubmit },
    isSigningOut: false,
    isFormValid: true,
    password: "",
    signOutOption: "exclude_current",
    handleSubmit: mockHandleSubmit,
    resetForm: mockResetForm,
  };

  // Define the default props for the AccountAllSessionsModal component.
  const defaultProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    userId: "user-123",
    currentSessionToken: "token-abc",
    onSuccess: vi.fn(),
  };

  // Reset all mocks and define the hook return value before each test case.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSignOutAllSessions).mockReturnValue(
      defaultHookReturn as unknown as ReturnType<typeof useSignOutAllSessions>
    );
  });

  /**
   * Test case to verify that the modal content is rendered correctly when the isOpen prop is true.
   */
  it("renders the modal content when open", () => {
    // Arrange: Render the component with the isOpen prop set to true.
    render(<AccountAllSessionsModal {...defaultProps} />);

    // Assert: Check that the dialog, header, form, and footer are visible.
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("modal-header")).toHaveTextContent("Sign Out All Devices");
    expect(screen.getByTestId("sign-out-form")).toBeInTheDocument();
    expect(screen.getByTestId("modal-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal does not render when the isOpen prop is false.
   */
  it("does not render when isOpen is false", () => {
    // Arrange: Render the component with the isOpen prop set to false.
    render(<AccountAllSessionsModal {...defaultProps} isOpen={false} />);

    // Assert: Confirm that the dialog element is not present in the document.
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the useSignOutAllSessions hook is initialized with the correct arguments.
   */
  it("initializes the hook with correct parameters", () => {
    // Arrange: Render the component with standard props.
    render(<AccountAllSessionsModal {...defaultProps} />);

    // Assert: Verify that the hook was called with the correct `userId`, `currentSessionToken`, and callbacks.
    expect(useSignOutAllSessions).toHaveBeenCalledWith(
      "user-123",
      "token-abc",
      defaultProps.onSuccess,
      expect.any(Function)
    );
  });

  /**
   * Test case to verify that the form is reset and the visibility state is updated when closing via the dialog overlay.
   */
  it("calls resetForm and onOpenChange when closing via dialog overlay/interaction", () => {
    // Arrange: Define a mock for the onOpenChange prop and render the component.
    const onOpenChange = vi.fn();
    render(<AccountAllSessionsModal {...defaultProps} onOpenChange={onOpenChange} />);

    // Act: Simulate a click on the dialog close button.
    fireEvent.click(screen.getByTestId("dialog-overlay-close"));

    // Assert: Check that the form was reset and the visibility was set to false.
    expect(mockResetForm).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the form is reset and the visibility state is updated when clicking the cancel button.
   */
  it("calls resetForm and onOpenChange when clicking cancel in footer", () => {
    // Arrange: Define a mock for the onOpenChange prop and render the component.
    const onOpenChange = vi.fn();
    render(<AccountAllSessionsModal {...defaultProps} onOpenChange={onOpenChange} />);

    // Act: Simulate a click on the cancel button within the footer.
    fireEvent.click(screen.getByText("Cancel"));

    // Assert: Check that the form was reset and the visibility was set to false.
    expect(mockResetForm).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the form submission handlers are triggered when the action button is clicked.
   */
  it("submits the form when clicking the action button in footer", () => {
    // Arrange: Render the component.
    render(<AccountAllSessionsModal {...defaultProps} />);

    // Act: Simulate a click on the sign-out action button.
    fireEvent.click(screen.getByText("Sign Out"));

    // Assert: Check that the hook submission handler and the form submission logic were invoked.
    expect(mockFormHandleSubmit).toHaveBeenCalled();
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the modal resets and closes when the internal onClose callback from the hook is triggered.
   */
  it("calls resetForm and onOpenChange when the hook's onClose callback is triggered", () => {
    // Arrange: Define a mock for the onOpenChange prop and render the component.
    const onOpenChange = vi.fn();
    render(<AccountAllSessionsModal {...defaultProps} onOpenChange={onOpenChange} />);

    // Act: Retrieve the fourth argument (the onClose callback) from the hook call and execute it.
    const calls = vi.mocked(useSignOutAllSessions).mock.calls;
    const lastCall = calls[calls.length - 1];
    const onCloseCallback = lastCall[3];

    if (onCloseCallback) {
      onCloseCallback();
    }

    // Assert: Verify that the form reset and the modal visibility change were triggered.
    expect(mockResetForm).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the form is not reset if the dialog triggers a change to the open state.
   */
  it("calls onOpenChange(true) without resetting form when dialog is reopened (branch coverage)", () => {
    // Arrange: Define a mock for the onOpenChange prop and render the component.
    const onOpenChange = vi.fn();
    render(<AccountAllSessionsModal {...defaultProps} onOpenChange={onOpenChange} />);

    // Act: Simulate the dialog triggering an open state change.
    fireEvent.click(screen.getByTestId("dialog-reopen"));

    // Assert: Confirm that the visibility update occurred but the form was not reset.
    expect(mockResetForm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
