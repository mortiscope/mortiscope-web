import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { AccountSecurity } from "@/features/account/components/account-security";
import { useAccountSecurity } from "@/features/account/hooks/use-account-security";
import { useEmailField } from "@/features/account/hooks/use-email-field";
import { usePasswordChange } from "@/features/account/hooks/use-password-change";
import { useSocialProvider } from "@/features/account/hooks/use-social-provider";
import { useTwoFactorManagement } from "@/features/account/hooks/use-two-factor-management";

// Mock the main security data hook to control loading and error states for security settings.
vi.mock("@/features/account/hooks/use-account-security", () => ({
  useAccountSecurity: vi.fn(),
}));

// Mock the social provider hook to simulate users logged in via OAuth or credentials.
vi.mock("@/features/account/hooks/use-social-provider", () => ({
  useSocialProvider: vi.fn(),
}));

// Mock the email management hook to handle email lock toggles and update logic.
vi.mock("@/features/account/hooks/use-email-field", () => ({
  useEmailField: vi.fn(),
}));

// Mock the password change hook to verify verification and password update workflows.
vi.mock("@/features/account/hooks/use-password-change", () => ({
  usePasswordChange: vi.fn(),
}));

// Mock the 2FA management hook to control visibility of modals and 2FA toggle logic.
vi.mock("@/features/account/hooks/use-two-factor-management", () => ({
  useTwoFactorManagement: vi.fn(),
}));

// Mock the toast notification library to verify error reporting.
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock the header component to verify it renders with the correct title.
vi.mock("@/features/account/components/account-tab-header", () => ({
  AccountTabHeader: ({ title }: { title: string }) => <div data-testid="tab-header">{title}</div>,
}));

// Mock the email section to verify it distinguishes between social and credential users.
vi.mock("@/features/account/components/email-section", () => ({
  EmailSection: ({ isSocialUser }: { isSocialUser: boolean }) => (
    <div data-testid="email-section">Email Section ({isSocialUser ? "Social" : "Credentials"})</div>
  ),
}));

// Mock the password verification section to verify its conditional rendering.
vi.mock("@/features/account/components/password-verification-section", () => ({
  PasswordVerificationSection: () => <div data-testid="password-verification-section" />,
}));

// Mock the password change section to verify its conditional rendering.
vi.mock("@/features/account/components/password-change-section", () => ({
  PasswordChangeSection: () => <div data-testid="password-change-section" />,
}));

// Mock the 2FA management UI to simulate user interactions for enabling or viewing codes.
vi.mock("@/features/account/components/two-factor-section", () => ({
  TwoFactorSection: ({
    onTwoFactorToggle,
    onRecoveryCodesClick,
  }: {
    onTwoFactorToggle: () => void;
    onRecoveryCodesClick: () => void;
  }) => (
    <div data-testid="two-factor-section">
      <button onClick={onTwoFactorToggle}>Toggle 2FA</button>
      <button onClick={onRecoveryCodesClick}>View Codes</button>
    </div>
  ),
}));

// Mock the enable 2FA modal to verify visibility and success callback propagation.
vi.mock("@/features/account/components/two-factor-enable-modal", () => ({
  TwoFactorEnableModal: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: () => void }) =>
    isOpen ? (
      <div data-testid="enable-2fa-modal">
        <button onClick={onSuccess}>Success</button>
      </div>
    ) : null,
}));

// Mock the recovery codes modal to verify open/close logic and state maintenance.
vi.mock("@/features/account/components/recovery-codes-modal", () => ({
  RecoveryCodesModal: ({
    isOpen,
    onOpenChange,
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    isOpen ? (
      <div data-testid="recovery-codes-modal">
        <button onClick={() => onOpenChange(false)}>Close Recovery</button>
        <button onClick={() => onOpenChange(true)}>Re-open Recovery</button>
      </div>
    ) : null,
}));

// Mock the disable 2FA modal to verify visibility and success callbacks.
vi.mock("@/features/account/components/two-factor-disable-modal", () => ({
  TwoFactorDisableModal: ({
    isOpen,
    onSuccess,
    onOpenChange,
  }: {
    isOpen: boolean;
    onSuccess: () => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    isOpen ? (
      <div data-testid="disable-2fa-modal">
        <button onClick={onSuccess}>Success</button>
        <button onClick={() => onOpenChange(false)}>Close Disable</button>
      </div>
    ) : null,
}));

// Mock the form wrapper for child content rendering.
vi.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * Test suite for the `AccountSecurity` component.
 */
describe("AccountSecurity", () => {
  const defaultSecurityData = { twoFactorEnabled: false };
  const defaultEmailField = {
    form: {},
    isEmailLocked: true,
    isEmailSaveEnabled: false,
    updateEmail: { isPending: false },
    handleEmailLockToggle: vi.fn(),
    handleEmailUpdate: vi.fn(),
  };
  const defaultPasswordChange = {
    form: {},
    isPasswordLocked: true,
    isPasswordSubmitEnabled: false,
    verifyPassword: { isPending: false },
    handlePasswordLockToggle: vi.fn(),
    handlePasswordVerification: vi.fn(),
    handleCurrentPasswordChange: vi.fn(),
    isPasswordVerified: false,
    isNewPasswordSaveEnabled: false,
    updatePassword: { isPending: false },
    handlePasswordUpdate: vi.fn(),
    currentPasswordFieldsError: null,
  };
  const defaultTwoFactorManagement = {
    isTwoFactorEnabled: false,
    isTwoFactorModalOpen: false,
    isRecoveryCodesModalOpen: false,
    isTwoFactorDisableModalOpen: false,
    handleTwoFactorToggle: vi.fn(),
    setIsTwoFactorModalOpen: vi.fn(),
    setIsRecoveryCodesModalOpen: vi.fn(),
    setIsTwoFactorDisableModalOpen: vi.fn(),
    handleTwoFactorSuccess: vi.fn(),
    handleTwoFactorDisableSuccess: vi.fn(),
    initialRecoveryCodes: undefined,
    setInitialRecoveryCodes: vi.fn(),
  };

  // Reset mocks and apply standard hook return values before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    (useAccountSecurity as Mock).mockReturnValue({
      data: defaultSecurityData,
      error: null,
      isLoading: false,
    });
    (useSocialProvider as Mock).mockReturnValue({
      isSocialUser: false,
      isLoading: false,
    });
    (useEmailField as Mock).mockReturnValue(defaultEmailField);
    (usePasswordChange as Mock).mockReturnValue(defaultPasswordChange);
    (useTwoFactorManagement as Mock).mockReturnValue(defaultTwoFactorManagement);
  });

  /**
   * Test case to verify that an empty state is rendered while security data is fetching.
   */
  it("renders nothing when data is loading", () => {
    // Arrange: Mock the main security hook to return a loading state.
    (useAccountSecurity as Mock).mockReturnValue({ isLoading: true });

    const { container } = render(<AccountSecurity />);

    // Assert: Verify the outer container exists but is empty.
    expect(container.firstChild).toHaveClass("w-full");
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify all major security sub-sections are present when data is ready.
   */
  it("renders security header and sections when data is ready", () => {
    // Arrange: Render the component.
    render(<AccountSecurity />);

    // Assert: Verify the presence of the header, email, password, and 2FA sections.
    expect(screen.getByTestId("tab-header")).toHaveTextContent("Security");
    expect(screen.getByTestId("email-section")).toBeInTheDocument();
    expect(screen.getByTestId("password-verification-section")).toBeInTheDocument();
    expect(screen.getByTestId("password-change-section")).toBeInTheDocument();
    expect(screen.getByTestId("two-factor-section")).toBeInTheDocument();
  });

  /**
   * Test case to verify that an error toast is triggered if the security data request fails.
   */
  it("displays error toast if security data load fails", () => {
    // Arrange: Mock the hook to return an error object.
    (useAccountSecurity as Mock).mockReturnValue({
      error: new Error("Failed"),
      isLoading: false,
    });

    render(<AccountSecurity />);

    // Assert: Verify the error toast was called with the specific message.
    expect(toast.error).toHaveBeenCalledWith("Failed to load security data.", expect.any(Object));
  });

  /**
   * Test case to verify that password-related sections are omitted for users logged in via social providers.
   */
  it("renders correctly for Social Users (No password sections)", () => {
    // Arrange: Mock the social provider hook to return true.
    (useSocialProvider as Mock).mockReturnValue({
      isSocialUser: true,
      isLoading: false,
    });

    render(<AccountSecurity />);

    // Assert: Confirm email section reflects social state and password sections are hidden.
    expect(screen.getByText("Email Section (Social)")).toBeInTheDocument();
    expect(screen.queryByTestId("password-verification-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("password-change-section")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that password verification errors are displayed in the UI.
   */
  it("renders error message for password verification if present", () => {
    // Arrange: Mock a specific password field error in the hook.
    (usePasswordChange as Mock).mockReturnValue({
      ...defaultPasswordChange,
      currentPasswordFieldsError: "Incorrect password",
    });

    render(<AccountSecurity />);

    // Assert: Check that the error message is visible to the user.
    expect(screen.getByText("Incorrect password")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking 'View Codes' triggers the modal visibility state.
   */
  it("opens recovery codes modal when 'View Codes' is clicked", () => {
    // Arrange: Mock the setter function for the recovery codes modal.
    const mockSetRecoveryOpen = vi.fn();
    (useTwoFactorManagement as Mock).mockReturnValue({
      ...defaultTwoFactorManagement,
      setIsRecoveryCodesModalOpen: mockSetRecoveryOpen,
    });

    render(<AccountSecurity />);

    // Act: Click the 'View Codes' button.
    fireEvent.click(screen.getByText("View Codes"));

    // Assert: Verify the state setter was called to open the modal.
    expect(mockSetRecoveryOpen).toHaveBeenCalledWith(true);
  });

  /**
   * Test case to verify the enable 2FA modal appears based on hook state.
   */
  it("renders Enable 2FA Modal when open", async () => {
    // Arrange: Mock the enable modal open state.
    (useTwoFactorManagement as Mock).mockReturnValue({
      ...defaultTwoFactorManagement,
      isTwoFactorModalOpen: true,
    });

    render(<AccountSecurity />);

    // Assert: Confirm the modal is present in the document.
    expect(await screen.findByTestId("enable-2fa-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify the disable 2FA modal appears based on hook state.
   */
  it("renders Disable 2FA Modal when open", async () => {
    // Arrange: Mock the disable modal open state.
    (useTwoFactorManagement as Mock).mockReturnValue({
      ...defaultTwoFactorManagement,
      isTwoFactorDisableModalOpen: true,
    });

    render(<AccountSecurity />);

    // Assert: Confirm the modal is present in the document.
    expect(await screen.findByTestId("disable-2fa-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify the recovery codes modal appears based on hook state.
   */
  it("renders Recovery Codes Modal when open", async () => {
    // Arrange: Mock the recovery codes modal open state.
    (useTwoFactorManagement as Mock).mockReturnValue({
      ...defaultTwoFactorManagement,
      isRecoveryCodesModalOpen: true,
    });

    render(<AccountSecurity />);

    // Assert: Confirm the modal is present in the document.
    expect(await screen.findByTestId("recovery-codes-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify the 2FA toggle button triggers the correct handler.
   */
  it("handles 2FA toggle button click", () => {
    // Arrange: Mock the toggle handler function.
    const mockToggle = vi.fn();
    (useTwoFactorManagement as Mock).mockReturnValue({
      ...defaultTwoFactorManagement,
      handleTwoFactorToggle: mockToggle,
    });

    render(<AccountSecurity />);

    // Act: Click the toggle button.
    fireEvent.click(screen.getByText("Toggle 2FA"));

    // Assert: Verify the handler was executed.
    expect(mockToggle).toHaveBeenCalled();
  });

  /**
   * Test case to verify the success callback is executed when the enable modal completes.
   */
  it("calls handleTwoFactorSuccess when enable modal succeeds", async () => {
    // Arrange: Mock an open enable modal and success handler.
    const mockSuccess = vi.fn();
    (useTwoFactorManagement as Mock).mockReturnValue({
      ...defaultTwoFactorManagement,
      isTwoFactorModalOpen: true,
      handleTwoFactorSuccess: mockSuccess,
    });

    render(<AccountSecurity />);

    // Act: Click the success trigger in the mocked modal.
    fireEvent.click(await screen.findByText("Success"));

    // Assert: Verify the success handler was called.
    expect(mockSuccess).toHaveBeenCalled();
  });

  /**
   * Test case to verify that closing the recovery codes modal also resets the temporary codes state.
   */
  it("handles Recovery Codes Modal close", async () => {
    // Arrange: Mock the recovery modal open state and relevant setters.
    const mockSetOpen = vi.fn();
    const mockSetCodes = vi.fn();
    (useTwoFactorManagement as Mock).mockReturnValue({
      ...defaultTwoFactorManagement,
      isRecoveryCodesModalOpen: true,
      setIsRecoveryCodesModalOpen: mockSetOpen,
      setInitialRecoveryCodes: mockSetCodes,
    });

    render(<AccountSecurity />);

    // Act: Click the close button in the mocked modal.
    const closeBtn = await screen.findByText("Close Recovery");
    fireEvent.click(closeBtn);

    // Assert: Verify the modal closed and initial codes were cleared.
    expect(mockSetOpen).toHaveBeenCalledWith(false);
    expect(mockSetCodes).toHaveBeenCalledWith(undefined);
  });

  /**
   * Test case to verify that internal state changes within the recovery modal do not prematurely clear the code data.
   */
  it("does not clear initial recovery codes when Recovery Codes Modal renders open state update", async () => {
    // Arrange: Mock the recovery modal open state.
    const mockSetOpen = vi.fn();
    const mockSetCodes = vi.fn();
    (useTwoFactorManagement as Mock).mockReturnValue({
      ...defaultTwoFactorManagement,
      isRecoveryCodesModalOpen: true,
      setIsRecoveryCodesModalOpen: mockSetOpen,
      setInitialRecoveryCodes: mockSetCodes,
    });

    render(<AccountSecurity />);

    // Act: Trigger a re-open or internal state update within the modal.
    const openBtn = await screen.findByText("Re-open Recovery");
    fireEvent.click(openBtn);

    // Assert: Verify the modal state remains open and codes are NOT cleared.
    expect(mockSetOpen).toHaveBeenCalledWith(true);
    expect(mockSetCodes).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the disable 2FA modal triggers the closure setter.
   */
  it("handles Two Factor Disable Modal close", async () => {
    // Arrange: Mock the disable modal open state.
    const mockSetOpen = vi.fn();
    (useTwoFactorManagement as Mock).mockReturnValue({
      ...defaultTwoFactorManagement,
      isTwoFactorDisableModalOpen: true,
      setIsTwoFactorDisableModalOpen: mockSetOpen,
    });

    render(<AccountSecurity />);

    // Act: Click the close button in the mocked modal.
    const closeBtn = await screen.findByText("Close Disable");
    fireEvent.click(closeBtn);

    // Assert: Verify the closure handler was called.
    expect(mockSetOpen).toHaveBeenCalledWith(false);
  });
});
