import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { requestResultsExport } from "@/features/export/actions/request-results-export";
import { ExportLabelledImagesModal } from "@/features/export/components/export-labelled-images-modal";
import { useExportStatus } from "@/features/export/hooks/use-export-status";

// Mock framer-motion to bypass animation delays and rendering issues during testing.
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
    open: boolean;
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
vi.mock("@/features/export/components/export-labelled-images-body", () => ({
  ExportLabelledImagesBody: ({
    onResolutionChange,
    selectedResolution,
  }: {
    onResolutionChange: (resolution: string) => void;
    selectedResolution: string;
  }) => (
    <div data-testid="export-body">
      <p>Current: {selectedResolution}</p>
      <button onClick={() => onResolutionChange("3840x2160")}>Select 4K</button>
    </div>
  ),
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

// Mock the server action for requesting exports.
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
 * Groups related tests into a suite for the Export Labelled Images Modal component.
 */
describe("ExportLabelledImagesModal", () => {
  const defaultProps = {
    caseId: "case-123",
    isOpen: true,
    onOpenChange: vi.fn(),
  };

  /**
   * Test case to verify that the modal renders all required sub-components correctly.
   */
  it("renders correctly", () => {
    // Arrange: Render the component with default props.
    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Assert: Check for the title, body, password section, and footer.
    expect(screen.getByText("Export as Labelled Images")).toBeInTheDocument();
    expect(screen.getByTestId("export-body")).toBeInTheDocument();
    expect(screen.getByTestId("export-password-protection")).toBeInTheDocument();
    expect(screen.getByTestId("export-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the resolution state updates when the body component triggers a change.
   */
  it("updates resolution state when changed in body", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Assert: Check the default resolution.
    expect(screen.getByText("Current: 1920x1080")).toBeInTheDocument();

    // Act: Click the button to change resolution.
    await user.click(screen.getByText("Select 4K"));

    // Assert: Verify the resolution text has updated.
    expect(screen.getByText("Current: 3840x2160")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the export request is submitted with the correct default data.
   */
  it("submits export request with correct data", async () => {
    // Arrange: Mock a successful export response and render the component.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: true,
      data: { exportId: "exp-1" },
    });

    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Click the export confirmation button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify the API was called with the correct `caseId` and format.
    expect(requestResultsExport).toHaveBeenCalledWith({
      caseId: "case-123",
      format: "labelled_images",
      resolution: "1920x1080",
      passwordProtection: { enabled: false },
    });
  });

  /**
   * Test case to verify that enabling password protection sends the password data in the request.
   */
  it("handles password protection flow", async () => {
    // Arrange: Mock a successful export response and render the component.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: true,
      data: { exportId: "exp-1" },
    });

    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Enable password protection and type a password.
    await user.click(screen.getByLabelText("Enable Password"));

    const input = screen.getByTestId("password-input");
    await user.type(input, "strongPassword123");

    // Act: Submit the export request.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify the API request includes the password data.
    expect(requestResultsExport).toHaveBeenCalledWith({
      caseId: "case-123",
      format: "labelled_images",
      resolution: "1920x1080",
      passwordProtection: { enabled: true, password: "strongPassword123" },
    });
  });

  /**
   * Test case to verify that the export button is disabled when password validation fails.
   */
  it("disables export button when password is invalid", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Enable password protection (defaults to empty password).
    await user.click(screen.getByLabelText("Enable Password"));

    // Assert: Check that the export button is disabled.
    const exportBtn = screen.getByTestId("export-confirm-btn");
    expect(exportBtn).toBeDisabled();

    // Act: Type a valid password.
    const input = screen.getByTestId("password-input");
    await user.type(input, "12345678");

    // Assert: Check that the export button is now enabled.
    expect(exportBtn).toBeEnabled();
  });

  /**
   * Test case to verify that the password field is cleared when protection is disabled.
   */
  it("clears password when protection is disabled", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Enable protection and type a password.
    await user.click(screen.getByLabelText("Enable Password"));
    await user.type(screen.getByTestId("password-input"), "secret");

    // Act: Disable protection.
    await user.click(screen.getByLabelText("Enable Password"));

    // Act: Re-enable protection to check the input state.
    await user.click(screen.getByLabelText("Enable Password"));

    // Assert: Verify the password input is empty.
    expect(screen.getByTestId("password-input")).toHaveValue("");
  });

  /**
   * Test case to verify that a success toast is displayed when the export starts successfully.
   */
  it("displays success toast on successful export start", async () => {
    // Arrange: Mock success response and render the component.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: true,
      data: { exportId: "exp-1" },
    });

    render(<ExportLabelledImagesModal {...defaultProps} />);

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
  it("displays error toast on export failure", async () => {
    // Arrange: Mock error response and render the component.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: false,
      error: "Server error",
    });

    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Wait for the error toast and verify modal closure.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Server error");
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that a fallback error message is used when the server returns no specific error text.
   */
  it("uses fallback error message when server returns failure without error info", async () => {
    // Arrange: Mock failure response without error message.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: false,
    } as unknown as Awaited<ReturnType<typeof requestResultsExport>>);

    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify the fallback error message is displayed.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to start export.");
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that no export request is made if `caseId` is missing.
   */
  it("does not start export if caseId is missing", async () => {
    // Arrange: Render the component with a null `caseId`.
    const user = userEvent.setup();
    render(<ExportLabelledImagesModal {...defaultProps} caseId={null} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify that the API function was not called.
    expect(requestResultsExport).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that no action is taken if the API returns success but missing data.
   */
  it("does nothing if success is true but exportId is missing", async () => {
    // Arrange: Mock response with success true but empty data.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockResolvedValue({
      success: true,
      data: {},
    } as unknown as Awaited<ReturnType<typeof requestResultsExport>>);

    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify API was called but no UI feedback (toasts/close) occurred.
    await waitFor(() => {
      expect(requestResultsExport).toHaveBeenCalled();
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that network or unexpected errors are handled gracefully.
   */
  it("handles unexpected mutation errors", async () => {
    // Arrange: Mock a rejected promise from the API.
    const user = userEvent.setup();
    vi.mocked(requestResultsExport).mockRejectedValue(new Error("Network error"));

    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Click the export button.
    await user.click(screen.getByTestId("export-confirm-btn"));

    // Assert: Verify unexpected error toast is displayed and modal closes.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.");
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the modal closes when the cancel button is clicked.
   */
  it("closes modal when cancel button is clicked", async () => {
    // Arrange: Render the component.
    const user = userEvent.setup();
    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Click the cancel button.
    await user.click(screen.getByText("Cancel"));

    // Assert: Verify the close callback was triggered.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that state resets only when the modal is closed (not when opened).
   */
  it("resets state when modal is closed, but not when opened", async () => {
    // Arrange: Setup user event and render.
    const user = userEvent.setup();
    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Change the resolution state.
    await user.click(screen.getByText("Select 4K"));
    expect(screen.getByText("Current: 3840x2160")).toBeInTheDocument();

    // Act: Trigger an "open" event (should preserve state).
    await user.click(screen.getByTestId("trigger-open-true"));

    // Assert: State remains unchanged.
    expect(screen.getByText("Current: 3840x2160")).toBeInTheDocument();

    // Act: Trigger a "close" event (should reset state).
    await user.click(screen.getByTestId("trigger-open-false"));

    // Assert: Verify the close callback was called.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);

    // Assert: Note: In a real DOM, the component might unmount. Here we check logic flow
    // assuming the component re-renders or updates. The test verifies logic responding to prop change.
    expect(screen.getByText("Current: 1920x1080")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal closes when triggered by the export status hook.
   */
  it("closes modal when useExportStatus triggers close", () => {
    // Arrange: Render the component.
    render(<ExportLabelledImagesModal {...defaultProps} />);

    // Act: Manually trigger the onClose callback passed to the hook.
    const hookCall = vi.mocked(useExportStatus).mock.calls[0][0];

    hookCall.onClose();

    // Assert: Verify the modal close callback was triggered.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
