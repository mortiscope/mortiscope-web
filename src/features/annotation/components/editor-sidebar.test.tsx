import { render, screen } from "@testing-library/react";
import { describe, expect, it, Mock, vi } from "vitest";

import { EditorSidebar } from "@/features/annotation/components/editor-sidebar";
import { useEditorSidebar } from "@/features/annotation/hooks/use-editor-sidebar";

// Mock the custom hook to control the sidebar state and handlers in tests.
vi.mock("@/features/annotation/hooks/use-editor-sidebar", () => ({
  useEditorSidebar: vi.fn(),
}));

// Mock the SidebarNavigation component to verify property injection and interaction.
vi.mock("@/features/annotation/components/sidebar-navigation", () => ({
  SidebarNavigation: ({
    selectedItem,
    isMobile,
    isMobileSidebarOpen,
    onButtonClick,
  }: {
    selectedItem: string | null;
    isMobile: boolean;
    isMobileSidebarOpen: boolean;
    onButtonClick: (item: string) => void;
  }) => (
    <div data-testid="sidebar-navigation">
      <span>Item: {selectedItem}</span>
      <span>Mobile: {String(isMobile)}</span>
      <span>Open: {String(isMobileSidebarOpen)}</span>
      <button onClick={() => onButtonClick("test")}>Click Me</button>
    </div>
  ),
}));

// Mock the SidebarPanel component to verify title rendering and close events.
vi.mock("@/features/annotation/components/sidebar-panel", () => ({
  SidebarPanel: ({
    selectedItem,
    panelTitle,
    onClose,
  }: {
    selectedItem: string | null;
    panelTitle: string;
    onClose: () => void;
  }) => (
    <div data-testid="sidebar-panel">
      <span>Panel: {selectedItem}</span>
      <span>Title: {panelTitle}</span>
      <button onClick={onClose}>Close Me</button>
    </div>
  ),
}));

/**
 * Test suite for the `EditorSidebar` component.
 */
describe("EditorSidebar", () => {
  // Define mock functions for tracking sidebar lifecycle and interactions.
  const mockOnPanelStateChange = vi.fn();
  const mockHandleButtonClick = vi.fn();
  const mockHandleClosePanel = vi.fn();
  const mockGetPanelTitle = vi.fn();

  // Define the default return values for the useEditorSidebar hook.
  const defaultHookValues = {
    selectedItem: null,
    isMobile: false,
    handleButtonClick: mockHandleButtonClick,
    handleClosePanel: mockHandleClosePanel,
    getPanelTitle: mockGetPanelTitle,
  };

  /**
   * Test case to verify that the sidebar renders both navigation and panel sub-components.
   */
  it("renders navigation and panel components", () => {
    // Arrange: Mock the hook to return the default state.
    (useEditorSidebar as Mock).mockReturnValue(defaultHookValues);

    render(
      <EditorSidebar isMobileSidebarOpen={false} onPanelStateChange={mockOnPanelStateChange} />
    );

    // Assert: Verify the presence of both mocked sub-components.
    expect(screen.getByTestId("sidebar-navigation")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-panel")).toBeInTheDocument();
  });

  /**
   * Test case to verify that navigation props are correctly passed down from the hook.
   */
  it("passes correct props to SidebarNavigation", () => {
    // Arrange: Mock the hook to simulate an active annotation item and mobile view.
    (useEditorSidebar as Mock).mockReturnValue({
      ...defaultHookValues,
      selectedItem: "annotation",
      isMobile: true,
    });

    render(
      <EditorSidebar isMobileSidebarOpen={true} onPanelStateChange={mockOnPanelStateChange} />
    );

    // Assert: Check the rendered text in the mocked navigation component.
    const nav = screen.getByTestId("sidebar-navigation");
    expect(nav).toHaveTextContent("Item: annotation");
    expect(nav).toHaveTextContent("Mobile: true");
    expect(nav).toHaveTextContent("Open: true");
  });

  /**
   * Test case to verify that panel props and titles are correctly passed down.
   */
  it("passes correct props to SidebarPanel", () => {
    // Arrange: Mock the title generator and selected item.
    mockGetPanelTitle.mockReturnValue("Test Title");
    (useEditorSidebar as Mock).mockReturnValue({
      ...defaultHookValues,
      selectedItem: "settings",
    });

    render(
      <EditorSidebar isMobileSidebarOpen={false} onPanelStateChange={mockOnPanelStateChange} />
    );

    // Assert: Verify the panel shows the correct item ID and title.
    const panel = screen.getByTestId("sidebar-panel");
    expect(panel).toHaveTextContent("Panel: settings");
    expect(panel).toHaveTextContent("Title: Test Title");
  });

  /**
   * Test case to verify that the onPanelStateChange callback is forwarded to the hook.
   */
  it("initializes hook with onPanelStateChange callback", () => {
    // Arrange: Setup hook return.
    (useEditorSidebar as Mock).mockReturnValue(defaultHookValues);

    render(
      <EditorSidebar isMobileSidebarOpen={false} onPanelStateChange={mockOnPanelStateChange} />
    );

    // Assert: Verify the hook was called with the correct configuration object.
    expect(useEditorSidebar).toHaveBeenCalledWith({
      onPanelStateChange: mockOnPanelStateChange,
    });
  });

  /**
   * Test case to verify that button clicks and close actions trigger the expected handlers.
   */
  it("wires up handlers correctly", () => {
    // Arrange: Setup hook return.
    (useEditorSidebar as Mock).mockReturnValue(defaultHookValues);

    render(
      <EditorSidebar isMobileSidebarOpen={false} onPanelStateChange={mockOnPanelStateChange} />
    );

    // Act: Simulate clicking a navigation button.
    const navButton = screen.getByText("Click Me");
    navButton.click();

    // Assert: Verify the hook interaction handler was called with the item ID.
    expect(mockHandleButtonClick).toHaveBeenCalledWith("test");

    // Act: Simulate clicking the panel close button.
    const closeButton = screen.getByText("Close Me");
    closeButton.click();

    // Assert: Verify the close panel handler was called.
    expect(mockHandleClosePanel).toHaveBeenCalled();
  });
});
