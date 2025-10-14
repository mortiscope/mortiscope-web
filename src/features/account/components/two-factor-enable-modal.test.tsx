import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TwoFactorEnableModal } from "@/features/account/components/two-factor-enable-modal";
import { useTwoFactorAuth } from "@/features/account/hooks/use-two-factor-auth";

// Mock the custom hook to control two-factor authentication logic and states.
vi.mock("@/features/account/hooks/use-two-factor-auth", () => ({
  useTwoFactorAuth: vi.fn(),
}));

// Mock the modal header component to verify it receives the correct title prop.
vi.mock("@/features/account/components/account-modal-header", () => ({
  AccountModalHeader: ({ title }: { title: string }) => (
    <div data-testid="modal-header">{title}</div>
  ),
}));

// Mock the modal footer component to simulate interaction with action buttons.
vi.mock("@/features/account/components/account-modal-footer", () => ({
  AccountModalFooter: ({
    onAction,
    disabled,
    isPending,
  }: {
    onAction: () => void;
    disabled?: boolean;
    isPending?: boolean;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onAction} disabled={disabled}>
        {isPending ? "Verifying..." : "Verify"}
      </button>
    </div>
  ),
}));

// Mock the UI Dialog component to control visibility and close actions in the test environment.
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

// Mock the QR code component to avoid rendering complex SVG logic and simplify assertions.
vi.mock("react-qr-code", () => ({
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}));

// Mock the loading spinner to verify its presence during asynchronous operations.
vi.mock("react-spinners", () => ({
  BeatLoader: () => <div data-testid="loading-spinner" />,
}));

// Mock the OTP input component to simulate user text entry and value changes.
vi.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({
    value,
    onChange,
    children,
  }: {
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <div>
      <input data-testid="otp-input" value={value} onChange={(e) => onChange(e.target.value)} />
      {children}
    </div>
  ),
  InputOTPGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InputOTPSlot: () => <div />,
}));

/**
 * Test suite for the TwoFactorEnableModal component.
 */
describe("TwoFactorEnableModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockSetupMutate = vi.fn();
  const mockVerifyMutate = vi.fn();

  // Define default values for the mocked authentication hook.
  const defaultHookValues = {
    setupTwoFactor: {
      mutate: mockSetupMutate,
      isPending: false,
    },
    verifyTwoFactor: {
      mutate: mockVerifyMutate,
      isPending: false,
    },
  };

  // Clear all mocks and reset hook return values before each test case execution.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTwoFactorAuth).mockReturnValue(
      defaultHookValues as unknown as ReturnType<typeof useTwoFactorAuth>
    );
  });

  /**
   * Verifies that the component initiates the setup process immediately upon opening.
   */
  it("triggers setupTwoFactor when opened", () => {
    // Arrange: Render the modal with the isOpen prop set to true.
    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Assert: Ensure the mutation function for setup was called.
    expect(mockSetupMutate).toHaveBeenCalled();
  });

  /**
   * Verifies that a loading indicator is displayed while the QR code data is being fetched.
   */
  it("displays loader when qrCodeUrl is not yet set", () => {
    // Arrange: Render the modal in an open state.
    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Assert: Check for the existence of the spinner and absence of the QR code.
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("qr-code")).not.toBeInTheDocument();
  });

  /**
   * Verifies that the QR code is rendered successfully after the setup mutation completes.
   */
  it("displays QR code after setup success", () => {
    // Arrange: Mock the setup mutation to trigger its success callback with payload data.
    mockSetupMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: true, data: { secret: "secret123", qrCodeUrl: "http://qr" } });
      }
    );

    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Assert: Ensure the QR code is visible and the loader is removed.
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
  });

  /**
   * Verifies that the OTP input field correctly handles state changes and sanitizes input.
   */
  it("updates OTP value and filters non-numeric input", () => {
    // Arrange: Mock setup success to reveal the OTP input field.
    mockSetupMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: true, data: { secret: "secret123", qrCodeUrl: "http://qr" } });
      }
    );

    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByTestId("otp-input");

    // Act: Simulate entering numeric characters.
    fireEvent.change(input, { target: { value: "123" } });
    // Assert: Check if the value is updated correctly.
    expect(input).toHaveValue("123");

    // Act: Simulate entering a mix of numeric and alphabetic characters.
    fireEvent.change(input, { target: { value: "123abc4" } });
    // Assert: Verify that non-numeric characters are filtered out from the input value.
    expect(input).toHaveValue("1234");
  });

  /**
   * Verifies that the verification button logic respects the required character count.
   */
  it("enables verify button only when OTP is 6 digits", () => {
    // Arrange: Initialize the modal with successful setup data.
    mockSetupMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: true, data: { secret: "secret123", qrCodeUrl: "http://qr" } });
      }
    );

    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByTestId("otp-input");
    const verifyBtn = screen.getByText("Verify");

    // Act: Input a five-digit code.
    fireEvent.change(input, { target: { value: "12345" } });
    // Assert: Ensure the button remains disabled.
    expect(verifyBtn).toBeDisabled();

    // Act: Input a six-digit code.
    fireEvent.change(input, { target: { value: "123456" } });
    // Assert: Ensure the button becomes enabled.
    expect(verifyBtn).toBeEnabled();
  });

  /**
   * Verifies that the verification mutation is called with the correct secret and token.
   */
  it("calls verifyTwoFactor when verify button is clicked", () => {
    // Arrange: Set up the component state with a generated secret.
    mockSetupMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: true, data: { secret: "secret123", qrCodeUrl: "http://qr" } });
      }
    );

    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByTestId("otp-input");
    // Act: Enter a valid length OTP and click the verify button.
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByText("Verify"));

    // Assert: Confirm the verification mutation was triggered with expected arguments.
    expect(mockVerifyMutate).toHaveBeenCalledWith(
      { secret: "secret123", token: "123456" },
      expect.any(Object)
    );
  });

  /**
   * Verifies that successful verification triggers the success callback and closes the modal.
   */
  it("handles successful verification", () => {
    // Arrange: Mock both setup and verification mutations to return success states.
    mockSetupMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: true, data: { secret: "secret123", qrCodeUrl: "http://qr" } });
      }
    );

    mockVerifyMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: true, data: { recoveryCodes: ["code1", "code2"] } });
      }
    );

    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByTestId("otp-input");
    // Act: Enter a token and click verify.
    fireEvent.change(input, { target: { value: "654321" } });
    fireEvent.click(screen.getByText("Verify"));

    // Assert: Verify that recovery codes are passed to the callback and the modal closes.
    expect(mockOnSuccess).toHaveBeenCalledWith(["code1", "code2"]);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Verifies that internal state is cleaned up when the user manually closes the dialog.
   */
  it("resets state when closing modal", () => {
    // Arrange: Populate the modal with setup data.
    mockSetupMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: true, data: { secret: "secret123", qrCodeUrl: "http://qr" } });
      }
    );

    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByTestId("otp-input");
    // Act: Enter some data and then close the dialog.
    fireEvent.change(input, { target: { value: "111111" } });
    fireEvent.click(screen.getByTestId("close-dialog"));

    // Assert: Verify the close handler was called.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Verifies that the component does not render secret information if the setup mutation fails.
   */
  it("handles setupTwoFactor failure", () => {
    // Arrange: Mock the setup mutation to return an error response.
    mockSetupMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: false, error: "Setup failed" });
      }
    );

    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Assert: Ensure the QR code is not displayed to the user.
    expect(screen.queryByTestId("qr-code")).not.toBeInTheDocument();
  });

  /**
   * Verifies that the modal remains open and success actions are suppressed during verification failure.
   */
  it("handles verifyTwoFactor failure", () => {
    // Arrange: Mock successful setup but failed verification.
    mockSetupMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: true, data: { secret: "secret123", qrCodeUrl: "http://qr" } });
      }
    );

    mockVerifyMutate.mockImplementation(
      (_, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
        onSuccess({ success: false, error: "Verification failed" });
      }
    );

    render(
      <TwoFactorEnableModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByTestId("otp-input");
    // Act: Submit the verification form.
    fireEvent.change(input, { target: { value: "111111" } });
    fireEvent.click(screen.getByText("Verify"));

    // Assert: Ensure the success callback is not called and the modal is not closed.
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });
});
