import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecoveryCodeActions } from "@/features/account/components/recovery-code-actions";

// Mock tooltip components to ensure child buttons are rendered without internal library logic.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
}));

// Mock the ArrowPath icon to verify the visual state of the regenerate action.
vi.mock("react-icons/hi2", () => ({
  HiArrowPath: () => <span data-testid="icon-regenerate" />,
}));

// Mock the spinner icon to verify visual feedback during asynchronous generation processes.
vi.mock("react-icons/im", () => ({
  ImSpinner2: () => <span data-testid="icon-spinner" />,
}));

// Mock the copy icon to verify the presence of the clipboard action trigger.
vi.mock("react-icons/io5", () => ({
  IoCopyOutline: () => <span data-testid="icon-copy" />,
}));

// Mock the download icon to verify the presence of the file export action trigger.
vi.mock("react-icons/lu", () => ({
  LuDownload: () => <span data-testid="icon-download" />,
}));

/**
 * Test suite for the `RecoveryCodeActions` component.
 */
describe("RecoveryCodeActions", () => {
  // Define default properties to maintain consistency across test cases.
  const defaultProps = {
    canCopy: true,
    canDownload: true,
    isLoading: false,
    onCopy: vi.fn(),
    onDownload: vi.fn(),
    onRegenerate: vi.fn(),
  };

  /**
   * Test case to verify that all functional buttons and their respective icons are rendered.
   */
  it("renders all action buttons in default state", () => {
    // Arrange: Render the component with all actions enabled.
    render(<RecoveryCodeActions {...defaultProps} />);

    // Assert: Check for the presence of Copy, Download, and Regenerate labels and icons.
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByTestId("icon-copy")).toBeInTheDocument();

    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByTestId("icon-download")).toBeInTheDocument();

    expect(screen.getByText("Regenerate")).toBeInTheDocument();
    expect(screen.getByTestId("icon-regenerate")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the copy callback is executed when the copy button is clicked.
   */
  it("handles copy action click", () => {
    // Arrange: Render the component.
    render(<RecoveryCodeActions {...defaultProps} />);

    // Act: Simulate a click on the Copy button.
    const copyBtn = screen.getByText("Copy").closest("button");
    fireEvent.click(copyBtn!);

    // Assert: Confirm the `onCopy` handler prop was called once.
    expect(defaultProps.onCopy).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the download callback is executed when the download button is clicked.
   */
  it("handles download action click", () => {
    // Arrange: Render the component.
    render(<RecoveryCodeActions {...defaultProps} />);

    // Act: Simulate a click on the Download button.
    const downloadBtn = screen.getByText("Download").closest("button");
    fireEvent.click(downloadBtn!);

    // Assert: Confirm the `onDownload` handler prop was called once.
    expect(defaultProps.onDownload).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the regeneration callback is executed when the regenerate button is clicked.
   */
  it("handles regenerate action click", () => {
    // Arrange: Render the component.
    render(<RecoveryCodeActions {...defaultProps} />);

    // Act: Simulate a click on the Regenerate button.
    const regenerateBtn = screen.getByText("Regenerate").closest("button");
    fireEvent.click(regenerateBtn!);

    // Assert: Confirm the `onRegenerate` handler prop was called once.
    expect(defaultProps.onRegenerate).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the copy button is disabled and visually restricted when the `canCopy` prop is false.
   */
  it("disables copy button when canCopy is false", () => {
    // Arrange: Set the `canCopy` prop to false.
    render(<RecoveryCodeActions {...defaultProps} canCopy={false} />);

    // Assert: Verify the button is non-interactive and has specific CSS classes applied.
    const copyBtn = screen.getByText("Copy").closest("button");
    expect(copyBtn).toBeDisabled();
    expect(copyBtn).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that the download button is disabled and visually restricted when the `canDownload` prop is false.
   */
  it("disables download button when canDownload is false", () => {
    // Arrange: Set the `canDownload` prop to false.
    render(<RecoveryCodeActions {...defaultProps} canDownload={false} />);

    // Assert: Verify the button is non-interactive and has specific CSS classes applied.
    const downloadBtn = screen.getByText("Download").closest("button");
    expect(downloadBtn).toBeDisabled();
    expect(downloadBtn).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that the regenerate button enters a loading state when the `isLoading` prop is true.
   */
  it("shows loading state for regenerate button", () => {
    // Arrange: Set the `isLoading` prop to true.
    render(<RecoveryCodeActions {...defaultProps} isLoading={true} />);

    // Assert: Verify the button displays processing text, is disabled, and shows the spinner icon.
    const regenerateBtn = screen.getByRole("button", { name: /generating/i });

    expect(regenerateBtn).toBeDisabled();
    expect(regenerateBtn).toHaveTextContent("Generating...");
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-regenerate")).not.toBeInTheDocument();
  });
});
