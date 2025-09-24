import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { act, fireEvent, render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { requestImageExport } from "@/features/export/actions/request-image-export";
import { ExportImageModal } from "@/features/export/components/export-image-modal";

// Mock framer-motion to avoid animation issues during testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the body component to isolate modal logic and simplify state verification.
vi.mock("@/features/export/components/export-image-body", () => ({
  ExportImageBody: ({
    step,
    exportOption,
    onExportOptionChange,
    resolution,
    onResolutionChange,
  }: {
    step: string;
    exportOption: string;
    onExportOptionChange: (option: string) => void;
    resolution: string;
    onResolutionChange: (resolution: string) => void;
  }) => (
    <div data-testid="export-image-body">
      <p>Current Step: {step}</p>
      <button onClick={() => onExportOptionChange("labelled_image")}>Select Labelled Image</button>
      <button onClick={() => onExportOptionChange("raw_data")}>Select Raw Data</button>
      <button onClick={() => onResolutionChange("3840x2160")}>Select 4K Resolution</button>
      <span data-testid="resolution-value">{resolution}</span>
      <span data-testid="export-option-value">{exportOption}</span>
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
      <input
        type="checkbox"
        checked={isEnabled}
        onChange={(e) => onToggleEnabled(e.target.checked)}
        aria-label="Toggle password"
      />
      <input
        type="text"
        value={password}
        onChange={onPasswordChange}
        placeholder="Enter password"
        aria-label="Password input"
      />
    </div>
  ),
}));

// Mock the footer component to control button interactions.
vi.mock("@/features/export/components/export-modal-footer", () => ({
  ExportModalFooter: ({
    onCancel,
    onExport,
    exportButtonText,
    cancelButtonText,
    disabled,
    isPending,
  }: {
    onCancel: () => void;
    onExport: () => void;
    exportButtonText: string;
    cancelButtonText: string;
    disabled: boolean;
    isPending: boolean;
  }) => (
    <div data-testid="export-modal-footer">
      <button onClick={onCancel}>{cancelButtonText}</button>
      <button onClick={onExport} disabled={disabled || isPending}>
        {exportButtonText}
      </button>
    </div>
  ),
}));

// Mock the server action for requesting image export.
vi.mock("@/features/export/actions/request-image-export", () => ({
  requestImageExport: vi.fn(),
}));

// Mock the hook for export status to control loading states.
vi.mock("@/features/export/hooks/use-export-status", () => ({
  useExportStatus: vi.fn(() => false),
}));

// Mock the toast notification library.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Groups related tests into a suite for the Export Image Modal component.
 */
describe("ExportImageModal", () => {
  const defaultProps = {
    image: { id: "img-123", name: "test-image.jpg" },
    isOpen: true,
    onOpenChange: vi.fn(),
  };

  /**
   * Test case to verify that the modal renders correctly in its initial state.
   */
  it("renders correctly in initial state", () => {
    // Arrange: Render the component with default props.
    render(<ExportImageModal {...defaultProps} />);

    // Assert: Check if key elements like heading, body, and footer are present.
    expect(screen.getByRole("heading", { name: "Download Image" })).toBeInTheDocument();
    expect(screen.getByTestId("export-image-body")).toBeInTheDocument();
    expect(screen.getByTestId("export-option-value")).toHaveTextContent("raw_data");
    expect(screen.getByTestId("export-password-protection")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  /**
   * Test case to verify navigation to the resolution step when "Labelled Image" is selected.
   */
  it("advances to resolution step when 'Labelled Image' is selected and Next is clicked", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportImageModal {...defaultProps} />);

    // Act: Select "Labelled Image" option.
    await user.click(screen.getByText("Select Labelled Image"));
    expect(screen.getByTestId("export-option-value")).toHaveTextContent("labelled_image");

    // Act: Click "Next" to advance to the resolution step.
    await user.click(screen.getByText("Next"));

    // Assert: Verify that the resolution step UI is displayed.
    expect(screen.getByRole("heading", { name: "Select Resolution" })).toBeInTheDocument();
    expect(screen.getByText("Current Step: resolution")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  /**
   * Test case to verify that raw data export is triggered immediately on "Download" click.
   */
  it("submits raw data export immediately on 'Download' click", async () => {
    // Arrange: Setup user event, mock successful API response, and render.
    const user = userEvent.setup();
    vi.mocked(requestImageExport).mockResolvedValue({ success: true, data: { exportId: "exp-1" } });

    render(<ExportImageModal {...defaultProps} />);

    // Act: Click the "Download" button.
    await user.click(screen.getByText("Download"));

    // Assert: Verify `requestImageExport` was called with correct parameters.
    expect(requestImageExport).toHaveBeenCalledWith({
      uploadId: "img-123",
      format: "raw_data",
      passwordProtection: { enabled: false },
    });
  });

  /**
   * Test case to verify that labelled image export is triggered after selecting resolution.
   */
  it("submits labelled image export after selecting resolution", async () => {
    // Arrange: Setup user event, mock successful API response, and render.
    const user = userEvent.setup();
    vi.mocked(requestImageExport).mockResolvedValue({ success: true, data: { exportId: "exp-1" } });

    render(<ExportImageModal {...defaultProps} />);

    // Act: Navigate to the resolution step.
    await user.click(screen.getByText("Select Labelled Image"));
    await user.click(screen.getByText("Next"));

    // Act: Select a resolution.
    await user.click(screen.getByText("Select 4K Resolution"));

    // Act: Click "Download".
    await user.click(screen.getByText("Download"));

    // Assert: Verify `requestImageExport` was called with correct format and resolution.
    expect(requestImageExport).toHaveBeenCalledWith({
      uploadId: "img-123",
      format: "labelled_images",
      resolution: "3840x2160",
      passwordProtection: { enabled: false },
    });
  });

  /**
   * Test case to verify backward navigation from resolution step to format step.
   */
  it("navigates back from resolution step to format step", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportImageModal {...defaultProps} />);

    // Act: Navigate to the resolution step.
    await user.click(screen.getByText("Select Labelled Image"));
    await user.click(screen.getByText("Next"));
    expect(screen.getByText("Current Step: resolution")).toBeInTheDocument();

    // Act: Click the "Back" button.
    await user.click(screen.getByText("Back"));

    // Assert: Verify that the view returned to the format step.
    expect(screen.getByText("Current Step: format")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal closes when "Cancel" is clicked.
   */
  it("closes modal on Cancel from first step", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportImageModal {...defaultProps} />);

    // Act: Click the "Cancel" button.
    await user.click(screen.getByText("Cancel"));

    // Assert: Verify that the `onOpenChange` callback was called with false.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that password protection parameters are included in the export request.
   */
  it("handles password protection correctly", async () => {
    // Arrange: Setup user event, mock success response, and render.
    const user = userEvent.setup();
    vi.mocked(requestImageExport).mockResolvedValue({ success: true, data: { exportId: "exp-1" } });

    render(<ExportImageModal {...defaultProps} />);

    // Act: Enable password protection and enter a password.
    const toggle = screen.getByLabelText("Toggle password");
    await user.click(toggle);

    const input = screen.getByLabelText("Password input");
    await user.type(input, "secret123");

    // Act: Click "Download".
    await user.click(screen.getByText("Download"));

    // Assert: Verify that password details are sent in the API request.
    expect(requestImageExport).toHaveBeenCalledWith({
      uploadId: "img-123",
      format: "raw_data",
      passwordProtection: { enabled: true, password: "secret123" },
    });
  });

  /**
   * Test case to verify that the download button is disabled when the password is invalid.
   */
  it("disables download button if password is invalid", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportImageModal {...defaultProps} />);

    // Act: Enable password protection.
    const toggle = screen.getByLabelText("Toggle password");
    await user.click(toggle);

    // Assert: Check that the download button is initially disabled (empty password).
    const downloadButton = screen.getByText("Download");
    expect(downloadButton).toBeDisabled();

    // Act: Type a valid password (assuming validation logic requires min length).
    const input = screen.getByLabelText("Password input");
    await user.type(input, "12345678");
    expect(downloadButton).toBeEnabled();
  });

  /**
   * Test case to verify that the password input is cleared when toggled off.
   */
  it("clears password when toggled off", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportImageModal {...defaultProps} />);

    // Act: Enable password protection and type a password.
    const toggle = screen.getByLabelText("Toggle password");
    await user.click(toggle);
    const input = screen.getByLabelText("Password input");
    await user.type(input, "secret");

    // Act: Toggle password protection off.
    await user.click(toggle);

    // Act: Toggle back on to verify the state was cleared.
    await user.click(toggle);
    expect(input).toHaveValue("");
  });

  /**
   * Test case to verify that an error toast is displayed when the API returns an error.
   */
  it("handles API error correctly", async () => {
    // Arrange: Setup user event, mock API error response, and render.
    const user = userEvent.setup();
    vi.mocked(requestImageExport).mockResolvedValue({ success: false, error: "Server error" });

    render(<ExportImageModal {...defaultProps} />);

    // Act: Click "Download".
    await user.click(screen.getByText("Download"));

    // Assert: Verify that an error toast appears and the modal closes.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Server error");
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that a success toast is displayed when export starts successfully.
   */
  it("renders toast success on successful export start", async () => {
    // Arrange: Setup user event, mock successful API response, and render.
    const user = userEvent.setup();
    vi.mocked(requestImageExport).mockResolvedValue({ success: true, data: { exportId: "123" } });

    render(<ExportImageModal {...defaultProps} />);

    // Act: Click "Download".
    await user.click(screen.getByText("Download"));

    // Assert: Verify that a success toast is displayed.
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Export started successfully.");
    });
  });

  /**
   * Test case to verify that a generic error toast is shown when the mutation promise rejects.
   */
  it("receives mutation error", async () => {
    // Arrange: Setup user event, mock API rejection, and render.
    const user = userEvent.setup();
    const error = new Error("Network error");
    vi.mocked(requestImageExport).mockRejectedValue(error);

    render(<ExportImageModal {...defaultProps} />);

    // Act: Click "Download".
    await user.click(screen.getByText("Download"));

    // Assert: Verify that a generic error toast appears and the modal closes.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.");
    });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the password protection component is hidden on the resolution step.
   */
  it("hides password protection component on resolution step", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<ExportImageModal {...defaultProps} />);

    // Act: Navigate to the resolution step.
    await user.click(screen.getByText("Select Labelled Image"));
    await user.click(screen.getByText("Next"));

    // Assert: Verify that the password protection component is not rendered.
    await waitFor(() => {
      expect(screen.queryByTestId("export-password-protection")).not.toBeInTheDocument();
    });
  });

  // Reset all mocks and timers after each test to ensure isolation.
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the internal state resets when the modal is closed.
   */
  it("resets state on close", () => {
    // Arrange: Use fake timers and render the component.
    vi.useFakeTimers();
    render(<ExportImageModal {...defaultProps} />);

    // Act: Change the internal state to "labelled_image".
    fireEvent.click(screen.getByText("Select Labelled Image"));
    expect(screen.getByTestId("export-option-value")).toHaveTextContent("labelled_image");

    // Act: Close the modal by clicking "Cancel".
    fireEvent.click(screen.getByText("Cancel"));

    // Act: Advance timers to allow for state reset logic to execute.
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Assert: Verify that the state reverted to the default "raw_data".
    expect(screen.getByTestId("export-option-value")).toHaveTextContent("raw_data");
  });

  /**
   * Test case to verify that no export action occurs if the image prop is missing.
   */
  it("does not export if image is missing", async () => {
    // Arrange: Setup user event and render the component with null image.
    const user = userEvent.setup();
    render(<ExportImageModal {...defaultProps} image={null} />);

    // Act: Click "Download".
    await user.click(screen.getByText("Download"));

    // Assert: Verify that the API function was not called.
    expect(requestImageExport).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a fallback error message is shown when the API fails without a specific error.
   */
  it("handles API error with fallback message", async () => {
    // Arrange: Setup user event, mock failure response without message, and render.
    const user = userEvent.setup();
    vi.mocked(requestImageExport).mockResolvedValue({ success: false } as unknown as Awaited<
      ReturnType<typeof requestImageExport>
    >);

    render(<ExportImageModal {...defaultProps} />);

    // Act: Click "Download".
    await user.click(screen.getByText("Download"));

    // Assert: Verify that the fallback error toast is displayed.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to start export.");
    });
  });

  /**
   * Test case to verify that no action is taken if the API returns success but export data is missing.
   */
  it("does nothing if success is true but exportId is missing", async () => {
    // Arrange: Setup user event, mock incomplete success response, and render.
    const user = userEvent.setup();
    // Use type assertion to cover edge case not allowed by types
    vi.mocked(requestImageExport).mockResolvedValue({
      success: true,
      data: {},
    } as unknown as Awaited<ReturnType<typeof requestImageExport>>);

    render(<ExportImageModal {...defaultProps} />);

    // Act: Click "Download".
    await user.click(screen.getByText("Download"));

    // Assert: Verify that no toasts or state changes occurred.
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
  });
});
