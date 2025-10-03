import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { SidebarPanel } from "@/features/annotation/components/sidebar-panel";
import { type SidebarItem } from "@/features/annotation/hooks/use-editor-sidebar";

// Mock framer-motion to simplify component hierarchy and bypass animation delays during testing.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

// Mock the wrapper panel to verify property forwarding and close button interactions.
vi.mock("@/features/annotation/components/editor-details-panel", () => ({
  EditorDetailsPanel: ({
    children,
    title,
    onClose,
    isOpen,
  }: {
    children: React.ReactNode;
    title: string;
    onClose: () => void;
    isOpen: boolean;
  }) => (
    <div data-testid="editor-details-panel" data-title={title} data-is-open={isOpen}>
      <button onClick={onClose} aria-label="Close panel">
        Close
      </button>
      {children}
    </div>
  ),
}));

// Mock the specific annotation data panel.
vi.mock("@/features/annotation/components/details-annotation-panel", () => ({
  DetailsAnnotationPanel: () => <div data-testid="real-details-annotation-panel" />,
}));

// Mock the specific image attributes panel.
vi.mock("@/features/annotation/components/details-attributes-panel", () => ({
  DetailsAttributesPanel: () => <div data-testid="real-details-attributes-panel" />,
}));

// Mock the specific editor settings panel.
vi.mock("@/features/annotation/components/details-settings-panel", () => ({
  DetailsSettingsPanel: () => <div data-testid="real-details-settings-panel" />,
}));

// Mock the specific keyboard shortcuts documentation panel.
vi.mock("@/features/annotation/components/details-shortcuts-panel", () => ({
  DetailsShortcutsPanel: () => <div data-testid="real-details-shortcuts-panel" />,
}));

// Mock Next.js dynamic imports to identify and render the correct mock component based on the loader string.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<Record<string, unknown>>) => {
    // Act: Execute loader to ensure module resolution code paths are covered.
    loader();

    const loaderStr = loader.toString();
    let testId = "unknown-panel";

    if (loaderStr.includes("details-annotation-panel")) {
      testId = "details-annotation-panel";
    } else if (loaderStr.includes("details-attributes-panel")) {
      testId = "details-attributes-panel";
    } else if (loaderStr.includes("details-settings-panel")) {
      testId = "details-settings-panel";
    } else if (loaderStr.includes("details-shortcuts-panel")) {
      testId = "details-shortcuts-panel";
    }

    const MockDynamicComponent = () => <div data-testid={testId} />;
    MockDynamicComponent.displayName = `Dynamic(${testId})`;
    return MockDynamicComponent;
  },
}));

/**
 * Test suite for the `SidebarPanel` component.
 */
describe("SidebarPanel", () => {
  // Define default properties for the sidebar panel tests.
  const defaultProps = {
    selectedItem: null,
    panelTitle: "Test Panel",
    onClose: vi.fn(),
  };

  /**
   * Test case to verify that the panel remains unrendered when no sidebar item is selected.
   */
  it("renders nothing when selectedItem is null", () => {
    // Arrange: Render the component with a null selection.
    render(<SidebarPanel {...defaultProps} selectedItem={null} />);

    // Assert: Check that the main panel container is absent from the DOM.
    expect(screen.queryByTestId("editor-details-panel")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that selecting 'annotation' renders the correct content panel.
   */
  it("renders the annotation panel when selectedItem is 'annotation'", () => {
    // Arrange: Set 'annotation' as the active item.
    render(<SidebarPanel {...defaultProps} selectedItem="annotation" />);

    // Assert: Verify the presence of the container and the specific annotation child.
    expect(screen.getByTestId("editor-details-panel")).toBeInTheDocument();
    expect(screen.getByTestId("details-annotation-panel")).toBeInTheDocument();
  });

  /**
   * Test case to verify that selecting 'shortcuts' renders the correct content panel.
   */
  it("renders the shortcuts panel when selectedItem is 'shortcuts'", () => {
    // Arrange: Set 'shortcuts' as the active item.
    render(<SidebarPanel {...defaultProps} selectedItem="shortcuts" />);

    // Assert: Verify the presence of the container and the specific shortcuts child.
    expect(screen.getByTestId("editor-details-panel")).toBeInTheDocument();
    expect(screen.getByTestId("details-shortcuts-panel")).toBeInTheDocument();
  });

  /**
   * Test case to verify that selecting 'attributes' renders the correct content panel.
   */
  it("renders the attributes panel when selectedItem is 'attributes'", () => {
    // Arrange: Set 'attributes' as the active item.
    render(<SidebarPanel {...defaultProps} selectedItem="attributes" />);

    // Assert: Verify the presence of the container and the specific attributes child.
    expect(screen.getByTestId("editor-details-panel")).toBeInTheDocument();
    expect(screen.getByTestId("details-attributes-panel")).toBeInTheDocument();
  });

  /**
   * Test case to verify that selecting 'settings' renders the correct content panel.
   */
  it("renders the settings panel when selectedItem is 'settings'", () => {
    // Arrange: Set 'settings' as the active item.
    render(<SidebarPanel {...defaultProps} selectedItem="settings" />);

    // Assert: Verify the presence of the container and the specific settings child.
    expect(screen.getByTestId("editor-details-panel")).toBeInTheDocument();
    expect(screen.getByTestId("details-settings-panel")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the header title is correctly propagated to the child component.
   */
  it("passes the correct title to EditorDetailsPanel", () => {
    // Arrange: Provide a specific title and selection.
    render(<SidebarPanel {...defaultProps} selectedItem="annotation" panelTitle="Annotations" />);

    // Assert: Verify that the `panelTitle` prop is reflected in the container's data attribute.
    const panel = screen.getByTestId("editor-details-panel");
    expect(panel).toHaveAttribute("data-title", "Annotations");
  });

  /**
   * Test case to verify that the close callback is executed when requested by the UI.
   */
  it("calls onClose when the close button is clicked", () => {
    // Arrange: Render an open panel.
    render(<SidebarPanel {...defaultProps} selectedItem="annotation" />);

    // Act: Simulate a click on the close button.
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

    // Assert: Verify that the `onClose` handler was called exactly once.
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify graceful handling and exclusion of known panels for unexpected selection keys.
   */
  it("renders unknown panel for invalid selectedItem", () => {
    // Arrange: Provide an invalid string cast as a SidebarItem.
    render(
      <SidebarPanel {...defaultProps} selectedItem={"invalid-item" as unknown as SidebarItem} />
    );

    // Assert: Verify the container renders but contains no recognized content panels.
    expect(screen.getByTestId("editor-details-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("details-annotation-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("details-shortcuts-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("details-attributes-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("details-settings-panel")).not.toBeInTheDocument();
  });
});
