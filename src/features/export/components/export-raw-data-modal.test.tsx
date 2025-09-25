import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { requestResultsExport } from "@/features/export/actions/request-results-export";
import { ExportRawDataModal } from "@/features/export/components/export-raw-data-modal";
import { useExportStatus } from "@/features/export/hooks/use-export-status";

// Mock framer-motion to avoid animation issues during testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the UI Dialog component to control open states and simplify DOM structure.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    onOpenChange,
    children,
  }: {
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="dialog-mock">
      <button data-testid="trigger-open-true" onClick={() => onOpenChange(true)} />
      <button data-testid="trigger-open-false" onClick={() => onOpenChange(false)} />
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: () => null,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

// Mock the body content to isolate modal logic from body rendering logic.
vi.mock("@/features/export/components/export-results-body", () => ({
  ExportResultsBody: () => <div data-testid="export-results-body">Results Body</div>,
}));

// Mock the password protection component to simplify interaction testing.
vi.mock("@/features/export/components/export-password-protection", () => ({
  ExportPasswordProtection: ({
    password,
    onPasswordChange,
    isEnabled,
    onToggleEnabled,
  }: {
    password: string;
    onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isEnabled: boolean;
    onToggleEnabled: (enabled: boolean) => void;
  }) => (
    <div data-testid="export-password-protection">
      <label>
        Enable Password
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => onToggleEnabled(e.target.checked)}
        />
      </label>
      <input data-testid="password-input" value={password} onChange={onPasswordChange} />
    </div>
  ),
}));

// Mock the modal footer to intercept action clicks.
vi.mock("@/features/export/components/export-modal-footer", () => ({
  ExportModalFooter: ({
    onExport,
    onCancel,
    disabled,
    isPending,
  }: {
    onExport: () => void;
    onCancel: () => void;
    disabled: boolean;
    isPending: boolean;
  }) => (
    <div data-testid="export-footer">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onExport} disabled={disabled || isPending} data-testid="export-confirm-btn">
        Export
      </button>
    </div>
  ),
}));

// Mock the header component to simplify rendering.
vi.mock("@/features/export/components/export-modal-header", () => ({
  ExportModalHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

// Mock the server action for requesting results export.
vi.mock("@/features/export/actions/request-results-export", () => ({
  requestResultsExport: vi.fn(),
}));

// Mock the export status hook to simulate pending states.
vi.mock("@/features/export/hooks/use-export-status", () => ({
  useExportStatus: vi.fn(() => false),
}));

// Mock sonner to verify toast notifications.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Groups related tests into a suite for the Export Raw Data Modal component.
 */
describe("ExportRawDataModal", () => {
  const defaultProps = {
    caseId: "case-123",
    isOpen: true,
    onOpenChange: vi.fn(),
  };

  /**
   * Test case to verify that the modal renders correctly with all its sub-components.
   */
  it("renders correctly with all sub-components", () => {
    // Arrange: Render the component with default props.
    render(<ExportRawDataModal {...defaultProps} />);

    // Assert: Check for the presence of the header, body, password protection, and footer.
    expect(screen.getByText("Export as Raw Data")).toBeInTheDocument();
    expect(screen.getByTestId("export-results-body")).toBeInTheDocument();
    expect(screen.getByTestId("export-password-protection")).toBeInTheDocument();
    expect(screen.getByTestId("export-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the export request is submitted with the correct default payload.
   */
  it("submits export request with correct default payload", async () => {
    // Arrange: Setup user event, mock success response, and render.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: true,
      data: { exportId: "exp-1" },
    });

    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Click the export confirmation button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify that `requestResultsExport` was called with the correct parameters.
    expect(requestResultsExport).toHaveBeenCalledWith({
      caseId: "case-123",
      format: "raw_data",
      passwordProtection: { enabled: false },
    });
  });

  /**
   * Test case to verify that password protection data is included in the export request.
   */
  it("handles password protection flow correctly", async () => {
    // Arrange: Setup user event, mock success response, and render.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: true,
      data: { exportId: "exp-1" },
    });

    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Enable password protection and type a password.
    await user.click(screen.getByLabelText("Enable Password"));

    const input = screen.getByTestId("password-input");
    await user.type(input, "securePassword123");

    // Act: Click the export confirmation button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify that the API call includes the password data.
    expect(requestResultsExport).toHaveBeenCalledWith({
      caseId: "case-123",
      format: "raw_data",
      passwordProtection: { enabled: true, password: "securePassword123" },
    });
  });

  /**
   * Test case to verify that the export button is disabled when the password is invalid.
   */
  it("disables export button when password is invalid", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Enable password protection.
    await user.click(screen.getByLabelText("Enable Password"));

    // Assert: Check that the export button is disabled (empty password).
    const exportBtn = screen.getByTestId("export-confirm-btn");
    expect(exportBtn).toBeDisabled();

    // Act: Type a password that is too short (assuming validation requires min length).
    const input = screen.getByTestId("password-input");
    await user.type(input, "1234567");
    expect(exportBtn).toBeDisabled();

    // Act: Complete the password to meet length requirements.
    await user.type(input, "8");
    expect(exportBtn).toBeEnabled();
  });

  /**
   * Test case to verify that the password input is cleared when protection is toggled off.
   */
  it("clears password when protection is toggled off", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Enable protection and type a password.
    await user.click(screen.getByLabelText("Enable Password"));
    await user.type(screen.getByTestId("password-input"), "secret");

    // Act: Disable protection.
    await user.click(screen.getByLabelText("Enable Password"));

    // Act: Re-enable protection to check the input state.
    await user.click(screen.getByLabelText("Enable Password"));

    // Assert: Verify that the input value is empty.
    expect(screen.getByTestId("password-input")).toHaveValue("");
  });

  /**
   * Test case to verify that a success toast is displayed when export starts successfully.
   */
  it("displays success toast on successful export start", async () => {
    // Arrange: Setup user event, mock success response, and render.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: true,
      data: { exportId: "exp-1" },
    });

    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Wait for the success toast to appear.
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Export started successfully.");
    });
  });

  /**
   * Test case to verify that an error toast is displayed and the modal closes on failure.
   */
  it("displays error toast and closes modal on export failure", async () => {
    // Arrange: Setup user event, mock error response, and render.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: false,
      error: "Database error",
    });

    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Wait for the error toast and verify the modal close callback.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Database error");
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that a generic error toast is displayed on unexpected failures.
   */
  it("displays generic error toast on unexpected failure", async () => {
    // Arrange: Setup user event, mock a rejected promise, and render.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockRejectedValue(new Error("Network error"));

    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Wait for the generic error toast and verify modal close.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.");
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the modal closes when the Cancel button is clicked.
   */
  it("resets state and calls onOpenChange when modal is closed via Cancel", async () => {
    // Arrange: Setup user event and render.
    const user = userEvent.setup();
    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Click the Cancel button.
    await user.click(screen.getByText("Cancel"));

    // Assert: Verify the close callback was triggered.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that no action is taken if the API returns success but missing data.
   */
  it("does nothing if success is true but exportId is missing", async () => {
    // Arrange: Setup user event, mock success with empty data, and render.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: true,
      data: {},
    } as unknown as Awaited<ReturnType<typeof requestResultsExport>>);

    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify API was called but no UI side effects occurred.
    await waitFor(() => {
      expect(requestResultsExport).toHaveBeenCalled();
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that export is not started if the `caseId` prop is missing.
   */
  it("does not start export if caseId is missing", async () => {
    // Arrange: Setup user event and render with null `caseId`.
    const user = userEvent.setup();
    render(<ExportRawDataModal {...defaultProps} caseId={null} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify that the API function was not called.
    expect(requestResultsExport).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a fallback error message is displayed when the server returns failure without details.
   */
  it("displays fallback error message when server returns success: false without error", async () => {
    // Arrange: Setup user event, mock failure without error message, and render.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: false,
    } as unknown as Awaited<ReturnType<typeof requestResultsExport>>);

    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Wait for the fallback error toast.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to start export.");
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that internal state resets when the modal is closed, but persists when opened.
   */
  it("resets state when modal is closed, but not when opened", async () => {
    // Arrange: Setup user event and render.
    const user = userEvent.setup();
    render(<ExportRawDataModal {...defaultProps} />);

    // Act: modify internal state (type password).
    await user.click(screen.getByLabelText("Enable Password"));
    const input = screen.getByTestId("password-input");
    await user.type(input, "somePass");
    expect(input).toHaveValue("somePass");

    // Act: Trigger an "open" event (should preserve state).
    await user.click(screen.getByTestId("trigger-open-true"));

    // Assert: Verify state persists.
    expect(screen.getByTestId("password-input")).toHaveValue("somePass");

    // Act: Trigger a "close" event (should reset state).
    await user.click(screen.getByTestId("trigger-open-false"));

    // Assert: Verify close callback was called.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);

    // Assert: Verify state was reset.
    expect(screen.getByTestId("password-input")).toHaveValue("");
  });

  /**
   * Test case to verify that the modal closes when triggered by the export status hook.
   */
  it("closes modal when useExportStatus triggers close", () => {
    // Arrange: Render the component.
    render(<ExportRawDataModal {...defaultProps} />);

    // Act: Manually trigger the onClose callback from the hook.
    const hookCall = vi.mocked(useExportStatus).mock.calls[0][0];

    hookCall.onClose();

    // Assert: Verify the modal close callback was triggered.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
