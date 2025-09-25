import * as ReactQuery from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { requestResultsExport } from "@/features/export/actions/request-results-export";
import { ExportPdfModal } from "@/features/export/components/export-pdf-modal";
import { useExportStatus } from "@/features/export/hooks/use-export-status";
import { usePdfExportWizard } from "@/features/export/hooks/use-pdf-export-wizard";
import { validatePasswordProtection } from "@/features/export/schemas/export";

// Mock configuration to prevent import errors during testing.
vi.mock("@/lib/config", () => ({
  config: {
    mailDomain: "example.com",
    baseUrl: "http://localhost:3000",
  },
}));

// Mock authentication handlers to prevent session errors.
vi.mock("@/auth", () => ({
  handlers: { GET: vi.fn(), POST: vi.fn() },
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock database operations to isolate UI tests from data layer.
vi.mock("@/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      accounts: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn() })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    delete: vi.fn(() => ({ where: vi.fn() })),
    transaction: vi.fn((cb) =>
      cb({
        query: {
          users: { findFirst: vi.fn() },
          accounts: { findFirst: vi.fn() },
        },
        insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn() })) })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
        delete: vi.fn(() => ({ where: vi.fn() })),
      })
    ),
  },
}));

// Mock hooks and actions to control business logic.
vi.mock("@/features/export/hooks/use-pdf-export-wizard");
vi.mock("@/features/export/hooks/use-export-status");
vi.mock("@/features/export/actions/request-results-export");
vi.mock("@/features/export/schemas/export", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/export/schemas/export")>();
  return {
    ...actual,
    validatePasswordProtection: vi.fn(),
  };
});

// Mock the header component to simplify rendering.
vi.mock("@/features/export/components/export-modal-header", () => ({
  ExportModalHeader: ({ title }: { title: string }) => (
    <div data-testid="modal-header">{title}</div>
  ),
}));

// Mock the footer component to intercept button clicks.
vi.mock("@/features/export/components/export-modal-footer", () => ({
  ExportModalFooter: ({
    onExport,
    onCancel,
    exportButtonText,
    disabled,
    isPending,
  }: {
    onExport: () => void;
    onCancel: () => void;
    exportButtonText: string;
    disabled: boolean;
    isPending: boolean;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onCancel}>Cancel/Back</button>
      <button onClick={onExport} disabled={disabled || isPending}>
        {exportButtonText}
      </button>
    </div>
  ),
}));

// Mock the introduction step component.
vi.mock("@/features/export/components/pdf-export-introduction-step", () => ({
  PdfExportIntroductionStep: () => <div data-testid="step-intro">Intro Step</div>,
}));

// Mock the security step component, including interaction handlers.
vi.mock("@/features/export/components/pdf-export-security-step", () => ({
  PdfExportSecurityStep: ({
    onSecurityLevelChange,
  }: {
    onSecurityLevelChange: (level: string) => void;
  }) => (
    <div data-testid="step-security">
      Security Step
      <button onClick={() => onSecurityLevelChange("standard")}>Set Standard</button>
    </div>
  ),
}));

// Mock the permissions step component.
vi.mock("@/features/export/components/pdf-export-permissions-step", () => ({
  PdfExportPermissionsStep: () => <div data-testid="step-permissions">Permissions Step</div>,
}));

// Mock the toast library to verify notifications.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock React Query to control mutation states.
vi.mock("@tanstack/react-query", async () => {
  const original = await vi.importActual("@tanstack/react-query");
  return {
    ...original,
    useMutation: vi.fn(),
  };
});

/**
 * Groups related tests into a suite for the PDF Export Modal component.
 */
describe("ExportPdfModal", () => {
  const defaultWizardState = {
    step: "introduction",
    securityLevel: null,
    pageSize: "a4",
    password: "",
    permissions: {},
    setSecurityLevel: vi.fn(),
    setPageSize: vi.fn(),
    setPassword: vi.fn(),
    setPermissions: vi.fn(),
    handleNext: vi.fn(),
    handleBack: vi.fn(),
    resetState: vi.fn(),
  };

  const defaultProps = {
    caseId: "case-123",
    isOpen: true,
    onOpenChange: vi.fn(),
  };

  const mockMutate = vi.fn();

  // Reset mocks and establish default behaviors before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePdfExportWizard).mockReturnValue(
      defaultWizardState as unknown as ReturnType<typeof usePdfExportWizard>
    );
    vi.mocked(useExportStatus).mockReturnValue(false);
    vi.mocked(validatePasswordProtection).mockReturnValue(true);

    vi.mocked(ReactQuery.useMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof ReactQuery.useMutation>);
  });

  /**
   * Test case to verify that the introduction step is rendered initially.
   */
  it("renders introduction step initially", () => {
    // Arrange: Render the component with default props.
    render(<ExportPdfModal {...defaultProps} />);

    // Assert: Check for header title, introduction step content, and the "Next" button.
    expect(screen.getByTestId("modal-header")).toHaveTextContent("Export as PDF");
    expect(screen.getAllByTestId("step-intro")).toHaveLength(2);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking Next triggers the wizard's navigation handler.
   */
  it("calls handleNext when Next is clicked on introduction step", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportPdfModal {...defaultProps} />);

    // Act: Click the "Next" button.
    await user.click(screen.getByText("Next"));

    // Assert: Verify `handleNext` was called.
    expect(defaultWizardState.handleNext).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the security step renders with the correct "Export" button for Standard security.
   */
  it("renders security step and shows 'Export' for Standard security", () => {
    // Arrange: Mock the wizard state to be on the security step with "standard" level.
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "standard",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    render(<ExportPdfModal {...defaultProps} />);

    // Assert: Verify security step content and "Export" button presence.
    expect(screen.getAllByTestId("step-security")).toHaveLength(2);
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the "Export" button is shown for View Protected security.
   */
  it("renders security step and shows 'Export' for View Protected security", () => {
    // Arrange: Mock the wizard state to "view_protected" with a password.
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "view_protected",
      password: "password123",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    render(<ExportPdfModal {...defaultProps} />);

    // Assert: Verify "Export" button is present.
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the "Next" button is shown for Permissions Protected security.
   */
  it("renders security step and shows 'Next' for Permissions Protected security", () => {
    // Arrange: Mock the wizard state to "permissions_protected".
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "permissions_protected",
      password: "password123",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    render(<ExportPdfModal {...defaultProps} />);

    // Assert: Verify "Next" button is present to proceed to permissions step.
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the action button is disabled if password validation fails.
   */
  it("disables Next/Export button on security step if password validation fails", () => {
    // Arrange: Mock wizard state with invalid password and mock validation failure.
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "view_protected",
      password: "short",
    } as unknown as ReturnType<typeof usePdfExportWizard>);
    vi.mocked(validatePasswordProtection).mockReturnValue(false);

    render(<ExportPdfModal {...defaultProps} />);

    // Assert: Verify the export button is disabled.
    expect(screen.getByText("Export")).toBeDisabled();
  });

  /**
   * Test case to verify that the permissions step is rendered correctly.
   */
  it("renders permissions step", () => {
    // Arrange: Mock the wizard state to the permissions step.
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "permissions",
      securityLevel: "permissions_protected",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    render(<ExportPdfModal {...defaultProps} />);

    // Assert: Verify permissions step content and export button.
    expect(screen.getAllByTestId("step-permissions")).toHaveLength(2);
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  /**
   * Test case to verify that export is triggered with correct arguments for Standard security.
   */
  it("submits export request for Standard security", async () => {
    // Arrange: Setup user, mock wizard state, and mock mutation execution.
    const user = userEvent.setup();
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "standard",
      pageSize: "a4",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    vi.mocked(ReactQuery.useMutation).mockImplementation(
      ({ mutationFn }: { mutationFn?: (vars: unknown) => Promise<unknown> }) =>
        ({
          mutate: (variables: unknown) => mutationFn?.(variables),
          isPending: false,
        }) as unknown as ReturnType<typeof ReactQuery.useMutation>
    );
    vi.mocked(requestResultsExport).mockResolvedValue({ success: true, data: { exportId: "123" } });

    render(<ExportPdfModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByText("Export"));

    // Assert: Verify `requestResultsExport` called with correct standard security params.
    expect(requestResultsExport).toHaveBeenCalledWith({
      caseId: "case-123",
      format: "pdf",
      pageSize: "a4",
      securityLevel: "standard",
    });
  });

  /**
   * Test case to verify that export is triggered with password for View Protected security.
   */
  it("submits export request including password for View Protected security", async () => {
    // Arrange: Setup user, mock wizard state with password, and mock mutation.
    const user = userEvent.setup();
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "view_protected",
      pageSize: "letter",
      password: "securePassword",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    vi.mocked(ReactQuery.useMutation).mockImplementation(
      ({ mutationFn }: { mutationFn?: (vars: unknown) => Promise<unknown> }) =>
        ({
          mutate: (variables: unknown) => mutationFn?.(variables),
          isPending: false,
        }) as unknown as ReturnType<typeof ReactQuery.useMutation>
    );
    vi.mocked(requestResultsExport).mockResolvedValue({ success: true, data: { exportId: "123" } });

    render(<ExportPdfModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByText("Export"));

    // Assert: Verify `requestResultsExport` called with password.
    expect(requestResultsExport).toHaveBeenCalledWith({
      caseId: "case-123",
      format: "pdf",
      pageSize: "letter",
      securityLevel: "view_protected",
      password: "securePassword",
    });
  });

  /**
   * Test case to verify that export is triggered with permissions for Permissions Protected security.
   */
  it("submits export request including permissions for Permissions Protected security", async () => {
    // Arrange: Setup user, mock wizard state with permissions, and mock mutation.
    const user = userEvent.setup();
    const permissions = { printing: false, copying: false };
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "permissions",
      securityLevel: "permissions_protected",
      pageSize: "a4",
      password: "securePassword",
      permissions,
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    vi.mocked(ReactQuery.useMutation).mockImplementation(
      ({ mutationFn }: { mutationFn?: (vars: unknown) => Promise<unknown> }) =>
        ({
          mutate: (variables: unknown) => mutationFn?.(variables),
          isPending: false,
        }) as unknown as ReturnType<typeof ReactQuery.useMutation>
    );
    vi.mocked(requestResultsExport).mockResolvedValue({ success: true, data: { exportId: "123" } });

    render(<ExportPdfModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByText("Export"));

    // Assert: Verify `requestResultsExport` called with permissions object.
    expect(requestResultsExport).toHaveBeenCalledWith({
      caseId: "case-123",
      format: "pdf",
      pageSize: "a4",
      securityLevel: "permissions_protected",
      password: "securePassword",
      permissions,
    });
  });

  /**
   * Test case to verify that buttons are disabled while the mutation is pending.
   */
  it("disables buttons when export is pending", () => {
    // Arrange: Mock pending state in mutation.
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "standard",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    vi.mocked(ReactQuery.useMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof ReactQuery.useMutation>);

    render(<ExportPdfModal {...defaultProps} />);

    // Assert: Verify export button is disabled.
    expect(screen.getByText("Export")).toBeDisabled();
  });

  /**
   * Test case to verify that state is reset when the modal is closed.
   */
  it("resets state when modal is closed", async () => {
    // Arrange: Setup user and render.
    const user = userEvent.setup();
    render(<ExportPdfModal {...defaultProps} />);

    // Act: Click the cancel/back button.
    await user.click(screen.getByText("Cancel/Back"));

    // Assert: Verify close callback and state reset are triggered.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    expect(defaultWizardState.resetState).toHaveBeenCalled();
  });

  /**
   * Test case to verify that a success toast is displayed when export starts successfully.
   */
  it("shows success toast when export starts", async () => {
    // Arrange: Mock success callback in mutation.
    const user = userEvent.setup();
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "standard",
      pageSize: "a4",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    vi.mocked(ReactQuery.useMutation).mockImplementation(
      ({
        onSuccess,
      }: {
        onSuccess?: (data: unknown, variables: unknown, context: unknown) => void;
      }) =>
        ({
          mutate: () =>
            onSuccess?.({ success: true, data: { exportId: "123" } }, undefined, undefined),
          isPending: false,
        }) as unknown as ReturnType<typeof ReactQuery.useMutation>
    );

    render(<ExportPdfModal {...defaultProps} />);

    // Act: Trigger export.
    await user.click(screen.getByText("Export"));

    // Assert: Verify success toast.
    expect(toast.success).toHaveBeenCalledWith("Export started successfully.");
  });

  /**
   * Test case to verify that an error toast is displayed when export fails.
   */
  it("shows error toast when export fails", async () => {
    // Arrange: Mock success callback returning an error object.
    const user = userEvent.setup();
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "standard",
      pageSize: "a4",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    vi.mocked(ReactQuery.useMutation).mockImplementation(
      ({
        onSuccess,
      }: {
        onSuccess?: (data: unknown, variables: unknown, context: unknown) => void;
      }) =>
        ({
          mutate: () =>
            onSuccess?.({ success: false, error: "Server error" }, undefined, undefined),
          isPending: false,
        }) as unknown as ReturnType<typeof ReactQuery.useMutation>
    );

    render(<ExportPdfModal {...defaultProps} />);

    // Act: Trigger export.
    await user.click(screen.getByText("Export"));

    // Assert: Verify error toast and modal close.
    expect(toast.error).toHaveBeenCalledWith("Server error");
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that unexpected errors during mutation are handled gracefully.
   */
  it("handles unexpected mutation errors", async () => {
    // Arrange: Mock onError callback in mutation.
    const user = userEvent.setup();
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "standard",
      pageSize: "a4",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    vi.mocked(ReactQuery.useMutation).mockImplementation(
      ({ onError }: { onError?: (error: unknown, variables: unknown, context: unknown) => void }) =>
        ({
          mutate: () => onError?.(new Error("Unexpected error"), undefined, undefined),
          isPending: false,
        }) as unknown as ReturnType<typeof ReactQuery.useMutation>
    );

    render(<ExportPdfModal {...defaultProps} />);

    // Act: Trigger export.
    await user.click(screen.getByText("Export"));

    // Assert: Verify generic error toast and modal close.
    expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.");
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that nothing renders if the wizard is in an invalid step.
   */
  it("renders nothing for invalid step", () => {
    // Arrange: Mock an invalid step name.
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "invalid-step" as unknown as "introduction",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    render(<ExportPdfModal {...defaultProps} />);

    // Assert: Verify no step content is rendered.
    expect(screen.queryByTestId("step-intro")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-security")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-permissions")).not.toBeInTheDocument();
    expect(screen.queryByTestId("modal-footer")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the password field is cleared when switching to standard security.
   */
  it("clears password when switching to standard security", async () => {
    // Arrange: Mock security step and user interaction.
    const user = userEvent.setup();
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "view_protected",
      password: "secret-password",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    render(<ExportPdfModal {...defaultProps} />);

    // Act: Click the "Set Standard" button (mocked in PdfExportSecurityStep).
    const setStandardButtons = screen.getAllByText("Set Standard");
    await user.click(setStandardButtons[0]);

    // Assert: Verify `setPassword` is called with an empty string.
    expect(defaultWizardState.setPassword).toHaveBeenCalledWith("");
    expect(defaultWizardState.setSecurityLevel).toHaveBeenCalledWith("standard");
  });

  /**
   * Test case to verify that export is not started if the `caseId` prop is missing.
   */
  it("handleExport does not start export if validation fails (e.g. missing caseId)", async () => {
    // Arrange: Render with null `caseId`.
    const user = userEvent.setup();
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "standard",
      pageSize: "a4",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    render(<ExportPdfModal {...defaultProps} caseId={null} />);

    // Act: Trigger export.
    await user.click(screen.getByText("Export"));

    // Assert: Verify API was not called.
    expect(requestResultsExport).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that state is not reset when the modal is opened (only on close).
   */
  it("handleOpenChange(true) does not reset state", () => {
    // Arrange: Render the component.
    render(<ExportPdfModal {...defaultProps} isOpen={false} />);

    // Assert: Verify `resetState` was not called.
    expect(defaultWizardState.resetState).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that no success toast is shown if the response data is incomplete.
   */
  it("handles successful export response with missing exportId", async () => {
    // Arrange: Mock success response with empty data object.
    const user = userEvent.setup();
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "standard",
      pageSize: "a4",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    vi.mocked(ReactQuery.useMutation).mockImplementation(
      ({
        onSuccess,
      }: {
        onSuccess?: (data: unknown, variables: unknown, context: unknown) => void;
      }) =>
        ({
          mutate: () => onSuccess?.({ success: true, data: {} }, undefined, undefined),
          isPending: false,
        }) as unknown as ReturnType<typeof ReactQuery.useMutation>
    );

    render(<ExportPdfModal {...defaultProps} />);
    await user.click(screen.getByText("Export"));

    // Assert: Verify no success toast is displayed.
    expect(toast.success).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a fallback error message is shown if the API returns failure without details.
   */
  it("shows default error message when export fails without error detail", async () => {
    // Arrange: Mock failure response with no error message.
    const user = userEvent.setup();
    vi.mocked(usePdfExportWizard).mockReturnValue({
      ...defaultWizardState,
      step: "security",
      securityLevel: "standard",
      pageSize: "a4",
    } as unknown as ReturnType<typeof usePdfExportWizard>);

    vi.mocked(ReactQuery.useMutation).mockImplementation(
      ({
        onSuccess,
      }: {
        onSuccess?: (data: unknown, variables: unknown, context: unknown) => void;
      }) =>
        ({
          mutate: () => onSuccess?.({ success: false }, undefined, undefined),
          isPending: false,
        }) as unknown as ReturnType<typeof ReactQuery.useMutation>
    );

    render(<ExportPdfModal {...defaultProps} />);
    await user.click(screen.getByText("Export"));

    // Assert: Verify fallback error toast.
    expect(toast.error).toHaveBeenCalledWith("Failed to start export.");
  });
});
