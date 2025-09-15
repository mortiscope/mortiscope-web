import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { UploadStatusIcon } from "@/features/upload/components/upload-status-icon";

// Mock framer-motion components as they are related to animation and not core functionality.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the `Tooltip` components to simplify the test output and capture tooltip content.
vi.mock("@/components/ui/tooltip", () => ({
  // `Tooltip` is mocked to pass children through.
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  // `TooltipTrigger` is mocked to pass children through.
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  // `TooltipContent` is mocked to render its children inside a test ID.
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock icons from `lucide-react` used for loading and retrying.
vi.mock("react-icons/lu", () => ({
  LuLoaderCircle: () => <svg data-testid="loader-icon" />,
  LuRotateCw: () => <svg data-testid="retry-icon" />,
}));

// Mock the success icon from `react-icons/go`.
vi.mock("react-icons/go", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-icons/go")>();
  return {
    ...actual,
    GoCheckCircle: () => <svg data-testid="success-icon" />,
  };
});

/**
 * Test suite for the `UploadStatusIcon` component.
 */
describe("UploadStatusIcon", () => {
  // Arrange: Define a mock `UploadableFile` object with a default status of uploading.
  const mockFile = {
    id: "file-123",
    status: "uploading",
  } as UploadableFile;

  // Arrange: Define default props for the component, including a mock retry handler.
  const defaultProps = {
    file: mockFile,
    onRetry: vi.fn(),
  };

  /**
   * Test case to verify the correct icon and tooltip content are rendered when the file status is uploading.
   */
  it("renders loader icon when status is uploading", () => {
    // Arrange: Render the component with the default "uploading" status.
    render(<UploadStatusIcon {...defaultProps} />);

    // Assert: Check that the loading icon is displayed.
    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    // Assert: Check that the corresponding tooltip text is displayed.
    expect(screen.getByText("Uploading")).toBeInTheDocument();
  });

  /**
   * Test case to verify the correct icon and tooltip content are rendered when the file status is success.
   */
  it("renders success icon when status is success", () => {
    // Arrange: Render the component, overriding the file status to success.
    render(<UploadStatusIcon {...defaultProps} file={{ ...mockFile, status: "success" }} />);

    // Assert: Check that the success icon is displayed.
    expect(screen.getByTestId("success-icon")).toBeInTheDocument();
    // Assert: Check that the corresponding tooltip text is displayed.
    expect(screen.getByText("Upload successful")).toBeInTheDocument();
  });

  /**
   * Test case to verify the correct icon and tooltip content are rendered when the file status is error.
   */
  it("renders retry icon when status is error", () => {
    // Arrange: Render the component, overriding the file status to "error".
    render(<UploadStatusIcon {...defaultProps} file={{ ...mockFile, status: "error" }} />);

    // Assert: Check that the retry icon is displayed.
    expect(screen.getByTestId("retry-icon")).toBeInTheDocument();
    // Assert: Check that the corresponding tooltip text is displayed.
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `onRetry` handler is called with the correct file ID when the retry button is clicked in the error state.
   */
  it("calls onRetry when clicking retry icon (error state)", () => {
    // Arrange: Render the component in the "error" state, which renders a clickable button.
    render(<UploadStatusIcon {...defaultProps} file={{ ...mockFile, status: "error" }} />);

    // Act: Find the button element by its accessible name "Retry" and simulate a click event.
    const button = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(button);

    // Assert: Check that the `onRetry` function was called with the file ID.
    expect(defaultProps.onRetry).toHaveBeenCalledWith("file-123");
  });

  /**
   * Test case to verify that the `onRetry` handler is not called when interacting with icons that are not intended for retrying.
   */
  it("does not call onRetry when clicking non-error icons", () => {
    // Arrange: Render the component in the default "uploading" state.
    render(<UploadStatusIcon {...defaultProps} />);

    // Act: Find the button element by its accessible name "Uploading" and simulate a click event.
    const button = screen.getByRole("button", { name: "Uploading" });
    fireEvent.click(button);

    // Assert: Check that the `onRetry` function was never called.
    expect(defaultProps.onRetry).not.toHaveBeenCalled();
  });
});
