import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TwoFactorDisableModal } from "@/features/account/components/two-factor-disable-modal";
import { useTwoFactorAuth } from "@/features/account/hooks/use-two-factor-auth";

// Mock the custom hook to control the two-factor authentication mutation state.
vi.mock("@/features/account/hooks/use-two-factor-auth", () => ({
  useTwoFactorAuth: vi.fn(),
}));

// Mock the toast notifications to verify success and error messages are displayed.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the modal header component to verify the correct title is passed as a prop.
vi.mock("@/features/account/components/account-modal-header", () => ({
  AccountModalHeader: ({ title }: { title: string }) => (
    <div data-testid="modal-header">{title}</div>
  ),
}));

// Mock the modal footer to track action triggers and button states.
vi.mock("@/features/account/components/account-modal-footer", () => ({
  AccountModalFooter: ({
    onAction,
    disabled,
    isPending,
  }: {
    onAction: () => void;
    disabled: boolean;
    isPending: boolean;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onAction} disabled={disabled}>
        {isPending ? "Disabling..." : "Disable"}
      </button>
    </div>
  ),
}));

// Mock the password input component with forwardRef to ensure focus and value handling.
vi.mock("@/features/account/components/account-password-input", async () => {
  const React = await import("react");
  const { forwardRef } = React;
  const MockInput = forwardRef<
    HTMLInputElement,
    React.ComponentProps<"input"> & { focusColor?: string; hasError?: boolean }
  >(({ focusColor, hasError, ...props }, ref) => (
    <input
      data-testid="password-input"
      data-focus-color={focusColor}
      data-has-error={hasError}
      type="password"
      placeholder="Current Password"
      ref={ref}
      {...props}
    />
  ));
  MockInput.displayName = "AccountPasswordInput";
  return {
    AccountPasswordInput: MockInput,
  };
});

// Mock the UI Dialog component to control visibility and close actions within the test environment.
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
        <button data-testid="close-dialog" onClick={() => onOpenChange(false)} />
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * Test suite for the `TwoFactorDisableModal` component.
 */
describe("TwoFactorDisableModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockMutate = vi.fn();

  // Define default hook values for the mutation state.
  const defaultHookValues = {
    disableTwoFactor: {
      mutate: mockMutate,
      isPending: false,
    },
  };

  // Define default props to be passed to the modal component.
  const defaultProps = {
    isOpen: true,
    onOpenChange: mockOnOpenChange,
    onSuccess: mockOnSuccess,
  };

  // Reset mocks and provide default implementation for the auth hook before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTwoFactorAuth).mockReturnValue(
      defaultHookValues as unknown as ReturnType<typeof useTwoFactorAuth>
    );
  });

  /**
   * Test case to verify that the modal and its sub-components render correctly when the `isOpen` prop is true.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the modal with default open props.
    render(<TwoFactorDisableModal {...defaultProps} />);

    // Assert: Verify that the dialog container, header title, warning text, input field, and footer are visible.
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("modal-header")).toHaveTextContent("Disable Two-Factor");
    expect(screen.getByText(/Warning:/i)).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("modal-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component does not render any dialog markup when the `isOpen` prop is false.
   */
  it("does not render when closed", () => {
    // Arrange: Render the modal with the `isOpen` prop set to false.
    render(<TwoFactorDisableModal {...defaultProps} isOpen={false} />);

    // Assert: Verify that the dialog test ID is not present in the document.
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the disable button state is correctly tied to the presence of text in the password input.
   */
  it("validates form and controls submit button state", async () => {
    // Arrange: Render the modal to access input and button.
    render(<TwoFactorDisableModal {...defaultProps} />);
    const disableBtn = screen.getByText("Disable");
    const input = screen.getByTestId("password-input");

    // Assert: Verify the button is initially disabled for an empty input.
    expect(disableBtn).toBeDisabled();

    // Act: Update the input value with a password string.
    fireEvent.change(input, { target: { value: "password123" } });

    // Assert: Verify that the button becomes enabled after input.
    await waitFor(() => {
      expect(disableBtn).toBeEnabled();
    });

    // Act: Clear the input value.
    fireEvent.change(input, { target: { value: "" } });

    // Assert: Verify the button returns to a disabled state.
    await waitFor(() => {
      expect(disableBtn).toBeDisabled();
    });
  });

  /**
   * Test case to verify the complete successful flow including mutation call, toast notification, and callback execution.
   */
  it("handles successful disable flow", async () => {
    // Arrange: Mock the mutate function to trigger the success callback immediately.
    mockMutate.mockImplementation((_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({ success: true });
    });

    render(<TwoFactorDisableModal {...defaultProps} />);
    const input = screen.getByTestId("password-input");
    const disableBtn = screen.getByText("Disable");

    // Act: Enter a password and click the enabled disable button.
    fireEvent.change(input, { target: { value: "securepass" } });
    await waitFor(() => {
      expect(disableBtn).toBeEnabled();
    });
    fireEvent.click(disableBtn);

    // Assert: Verify the mutation was called with the correct `currentPassword` payload.
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { currentPassword: "securepass" },
        expect.any(Object)
      );
    });

    // Assert: Verify that a success toast is shown and internal callbacks are triggered.
    expect(toast.success).toHaveBeenCalledWith(
      "Two-factor authentication disabled successfully.",
      expect.any(Object)
    );
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the component handles a server-side password error during the mutation.
   */
  it("handles password error from server", async () => {
    // Arrange: Mock the mutate function to return a specific "Invalid password" error payload.
    mockMutate.mockImplementation((_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({ success: false, error: "Invalid password" });
    });

    render(<TwoFactorDisableModal {...defaultProps} />);
    const input = screen.getByTestId("password-input");
    fireEvent.change(input, { target: { value: "wrongpass" } });

    // Act: Click the disable button to trigger the mutation.
    await waitFor(() => {
      expect(screen.getByText("Disable")).toBeEnabled();
    });
    fireEvent.click(screen.getByText("Disable"));

    // Assert: Verify that the mutation logic was executed.
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify handling of a generic server-side error during the disable mutation.
   */
  it("handles generic server error", async () => {
    // Arrange: Mock the mutate function to return a "Server error" payload.
    mockMutate.mockImplementation((_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({ success: false, error: "Server error" });
    });

    render(<TwoFactorDisableModal {...defaultProps} />);
    const input = screen.getByTestId("password-input");
    fireEvent.change(input, { target: { value: "pass" } });

    // Act: Trigger the disable action.
    await waitFor(() => {
      expect(screen.getByText("Disable")).toBeEnabled();
    });
    fireEvent.click(screen.getByText("Disable"));

    // Assert: Verify that the mutation logic was executed.
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify that an unexpected mutation failure triggers a fallback error toast.
   */
  it("handles unexpected mutation error (onError)", async () => {
    // Arrange: Mock the mutate function to trigger the `onError` callback.
    mockMutate.mockImplementation((_, { onError }: { onError: () => void }) => {
      onError();
    });

    render(<TwoFactorDisableModal {...defaultProps} />);
    const input = screen.getByTestId("password-input");
    fireEvent.change(input, { target: { value: "pass" } });

    // Act: Trigger the disable action.
    await waitFor(() => {
      expect(screen.getByText("Disable")).toBeEnabled();
    });
    fireEvent.click(screen.getByText("Disable"));

    // Assert: Verify that a generic error message is displayed to the user via toast.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", expect.any(Object));
    });
  });

  /**
   * Test case to verify fallback behavior when the server returns a failure status without a specific error message.
   */
  it("handles server error without message (default fallback)", async () => {
    // Arrange: Mock the mutate function to return success false with no error string.
    mockMutate.mockImplementation((_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({ success: false });
    });

    render(<TwoFactorDisableModal {...defaultProps} />);
    const input = screen.getByTestId("password-input");
    fireEvent.change(input, { target: { value: "pass" } });

    // Act: Trigger the disable action.
    await waitFor(() => {
      expect(screen.getByText("Disable")).toBeEnabled();
    });
    fireEvent.click(screen.getByText("Disable"));

    // Assert: Verify that the mutation was reached.
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify that closing the dialog triggers the `onOpenChange` callback to reset the UI state.
   */
  it("resets form when closed via handleClose", () => {
    // Arrange: Render the modal and simulate user input.
    render(<TwoFactorDisableModal {...defaultProps} />);
    const input = screen.getByTestId("password-input");
    fireEvent.change(input, { target: { value: "some-value" } });

    // Act: Click the close button within the dialog.
    fireEvent.click(screen.getByTestId("close-dialog"));

    // Assert: Verify that the parent is notified to close the modal.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the UI correctly reflects a pending state during an active mutation.
   */
  it("shows pending state during mutation", () => {
    // Arrange: Mock the hook to return `isPending` as true.
    vi.mocked(useTwoFactorAuth).mockReturnValue({
      disableTwoFactor: {
        mutate: mockMutate,
        isPending: true,
      },
    } as unknown as ReturnType<typeof useTwoFactorAuth>);

    render(<TwoFactorDisableModal {...defaultProps} />);

    // Assert: Verify the button text changes to a loading indicator and the button is disabled.
    expect(screen.getByText("Disabling...")).toBeInTheDocument();
    expect(screen.getByText("Disabling...")).toBeDisabled();
  });
});
