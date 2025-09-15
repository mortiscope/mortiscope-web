import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { UploadMethodTabs } from "@/features/upload/components/upload-method-tabs";

// Mock the 'framer-motion' library's `motion.div` to isolate the active tab indicator logic.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ layoutId, className }: { layoutId?: string; className?: string }) => (
      <div data-testid={`motion-${layoutId}`} className={className} />
    ),
  },
}));

// Mock the icon components from `lucide-react` for simple presence testing.
vi.mock("lucide-react", () => ({
  Camera: () => <svg data-testid="icon-camera" />,
  Upload: () => <svg data-testid="icon-upload" />,
}));

// Mock the entire shadcn tabs module to control tab state and behavior directly within the tests.
vi.mock("@/components/ui/tabs", async () => {
  const React = await import("react");

  type TabsContextType = {
    value: string;
    onValueChange: (val: string) => void;
  };

  const MockTabsContext = React.createContext<TabsContextType | null>(null);

  return {
    Tabs: ({
      value,
      onValueChange,
      children,
      className,
    }: {
      value: string;
      onValueChange: (val: string) => void;
      children: React.ReactNode;
      className?: string;
    }) => (
      <MockTabsContext.Provider value={{ value, onValueChange }}>
        <div className={className} data-testid="tabs-root">
          {children}
        </div>
      </MockTabsContext.Provider>
    ),
    TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className} role="tablist">
        {children}
      </div>
    ),
    TabsTrigger: ({
      value,
      children,
      disabled,
      className,
    }: {
      value: string;
      children: React.ReactNode;
      disabled?: boolean;
      className?: string;
    }) => {
      const context = React.useContext(MockTabsContext);
      const isActive = context?.value === value;
      return (
        <button
          role="tab"
          aria-selected={isActive}
          data-state={isActive ? "active" : "inactive"}
          disabled={disabled}
          onClick={() => context?.onValueChange(value)}
          className={className}
        >
          {children}
        </button>
      );
    },
  };
});

/**
 * Test suite for the `UploadMethodTabs` component, which allows selection between image upload and camera use.
 */
describe("UploadMethodTabs", () => {
  // Arrange: Define a default set of props for the component under test.
  const defaultProps = {
    activeTab: "upload",
    onTabChange: vi.fn(),
    isMaxFilesReached: false,
  };

  /**
   * Test case to verify that both the "Upload Image" and "Use Camera" tabs are rendered with their corresponding labels and icons.
   */
  it("renders both tabs with correct labels and icons", () => {
    // Arrange: Render the component.
    render(<UploadMethodTabs {...defaultProps} />);

    // Assert: Check for the presence of the "Upload Image" text and its mock icon.
    expect(screen.getByText("Upload Image")).toBeInTheDocument();
    expect(screen.getByTestId("icon-upload")).toBeInTheDocument();

    // Assert: Check for the presence of the "Use Camera" text and its mock icon.
    expect(screen.getByText("Use Camera")).toBeInTheDocument();
    expect(screen.getByTestId("icon-camera")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `onTabChange` callback is triggered with the value "camera" when the camera tab is clicked.
   */
  it("calls onTabChange with 'camera' when camera tab is clicked", () => {
    // Arrange: Render the component.
    render(<UploadMethodTabs {...defaultProps} />);

    // Act: Find the "Use Camera" tab by its role and name, then simulate a click event.
    const cameraTab = screen.getByRole("tab", { name: /Use Camera/i });
    fireEvent.click(cameraTab);

    // Assert: Verify that the `onTabChange` function was called with the value "camera".
    expect(defaultProps.onTabChange).toHaveBeenCalledWith("camera");
  });

  /**
   * Test case to verify that the `onTabChange` callback is triggered with the value "upload" when the upload tab is clicked.
   */
  it("calls onTabChange with 'upload' when upload tab is clicked", () => {
    // Arrange: Render the component, initially setting the active tab to "camera".
    render(<UploadMethodTabs {...defaultProps} activeTab="camera" />);

    // Act: Find the "Upload Image" tab by its role and name, then simulate a click event.
    const uploadTab = screen.getByRole("tab", { name: /Upload Image/i });
    fireEvent.click(uploadTab);

    // Assert: Verify that the `onTabChange` function was called with the value "upload".
    expect(defaultProps.onTabChange).toHaveBeenCalledWith("upload");
  });

  /**
   * Test case to verify that the visual active tab indicator is correctly rendered only on the currently active tab.
   */
  it("displays the active tab indicator only on the active tab", () => {
    // Arrange: Render the component initially set to the "upload" tab.
    const { rerender } = render(<UploadMethodTabs {...defaultProps} activeTab="upload" />);

    // Assert: Check that the mock motion indicator is present, indicating the active tab pill is rendered.
    expect(screen.getByTestId("motion-active-tab-pill")).toBeInTheDocument();

    // Assert: Verify the "Upload Image" tab has the `data-state` attribute set to "active".
    const uploadTab = screen.getByRole("tab", { name: /Upload Image/i });
    expect(uploadTab).toHaveAttribute("data-state", "active");

    // Act: Rerender the component, switching the active tab to "camera".
    rerender(<UploadMethodTabs {...defaultProps} activeTab="camera" />);

    // Assert: Verify the "Use Camera" tab now has the `data-state` attribute set to "active".
    const cameraTab = screen.getByRole("tab", { name: /Use Camera/i });
    expect(cameraTab).toHaveAttribute("data-state", "active");
    // Assert: Ensure the active tab indicator is still rendered after the tab change.
    expect(screen.getByTestId("motion-active-tab-pill")).toBeInTheDocument();
  });

  /**
   * Test case to verify that both tab buttons are disabled when the maximum file limit has been reached.
   */
  it("disables tabs when isMaxFilesReached is true", () => {
    // Arrange: Render the component with `isMaxFilesReached` set to `true`.
    render(<UploadMethodTabs {...defaultProps} isMaxFilesReached={true} />);

    // Assert: Check that both the "Upload Image" and "Use Camera" tabs are disabled.
    const uploadTab = screen.getByRole("tab", { name: /Upload Image/i });
    const cameraTab = screen.getByRole("tab", { name: /Use Camera/i });

    expect(uploadTab).toBeDisabled();
    expect(cameraTab).toBeDisabled();
    // Assert: Also check for the specific styling class that visually indicates the disabled state.
    expect(uploadTab).toHaveClass("disabled:cursor-not-allowed");
  });

  /**
   * Test case to verify that clicking a disabled tab does not trigger the `onTabChange` handler.
   */
  it("does not trigger onTabChange when disabled tab is clicked", () => {
    // Arrange: Render the component with disabled tabs.
    render(<UploadMethodTabs {...defaultProps} isMaxFilesReached={true} />);

    // Act: Find and click the disabled "Use Camera" tab.
    const cameraTab = screen.getByRole("tab", { name: /Use Camera/i });
    fireEvent.click(cameraTab);

    // Assert: Verify that the `onTabChange` function was never called.
    expect(defaultProps.onTabChange).not.toHaveBeenCalled();
  });
});
