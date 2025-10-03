import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { SidebarNavigation } from "@/features/annotation/components/sidebar-navigation";

// Mock framer-motion to inspect animation states and ensure proper rendering of the aside container.
vi.mock("framer-motion", () => ({
  motion: {
    aside: ({ children, animate }: { children: React.ReactNode; animate: unknown }) => (
      <aside data-testid="sidebar-aside" data-animate={JSON.stringify(animate)}>
        {children}
      </aside>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock UI tooltips to verify conditional visibility based on whether a sidebar panel is currently open.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="tooltip" data-open={open !== undefined ? open.toString() : "undefined"}>
      {children}
    </div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content" hidden>
      {children}
    </div>
  ),
}));

/**
 * Test suite for the `SidebarNavigation` component.
 */
describe("SidebarNavigation", () => {
  // Define default properties for initializing the sidebar navigation in a desktop state.
  const defaultProps = {
    selectedItem: null,
    isMobileSidebarOpen: true,
    isMobile: false,
    onButtonClick: vi.fn(),
  };

  /**
   * Test case to verify that all functional navigation buttons are rendered with accessible labels.
   */
  it("renders all sidebar buttons", () => {
    // Arrange: Render the navigation component.
    render(<SidebarNavigation {...defaultProps} />);

    // Assert: Verify that buttons for annotations, attributes, shortcuts, and settings are present.
    expect(screen.getByLabelText("Annotation")).toBeInTheDocument();
    expect(screen.getByLabelText("Attributes")).toBeInTheDocument();
    expect(screen.getByLabelText("Shortcuts")).toBeInTheDocument();
    expect(screen.getByLabelText("Settings")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking a navigation button triggers the selection handler with the specific ID.
   */
  it("calls onButtonClick with correct ID when clicked", () => {
    // Arrange: Render the navigation component.
    render(<SidebarNavigation {...defaultProps} />);

    // Act: Click the 'Annotation' and 'Shortcuts' buttons.
    fireEvent.click(screen.getByLabelText("Annotation"));
    expect(defaultProps.onButtonClick).toHaveBeenCalledWith("annotation");

    fireEvent.click(screen.getByLabelText("Shortcuts"));
    expect(defaultProps.onButtonClick).toHaveBeenCalledWith("shortcuts");
  });

  /**
   * Test case to verify that the active button receives the correct ARIA attributes and background styling.
   */
  it("applies active styling to the selected item", () => {
    // Arrange: Render the component with the 'Attributes' item pre-selected.
    render(<SidebarNavigation {...defaultProps} selectedItem="attributes" />);

    const activeBtn = screen.getByLabelText("Attributes");
    const inactiveBtn = screen.getByLabelText("Annotation");

    // Assert: Verify ARIA pressed states and the presence of the active gradient class.
    expect(activeBtn).toHaveAttribute("aria-pressed", "true");
    expect(inactiveBtn).toHaveAttribute("aria-pressed", "false");

    expect(activeBtn.className).toContain("bg-gradient-to-b");
    expect(inactiveBtn.className).not.toContain("bg-gradient-to-b");
  });

  /**
   * Test case to verify that the keyboard shortcuts button is hidden on small viewports.
   */
  it("applies hidden class to shortcuts button for mobile responsiveness", () => {
    // Arrange: Render the navigation component.
    render(<SidebarNavigation {...defaultProps} />);

    // Assert: Check that the shortcuts button is hidden by default and only flexes on medium screens.
    const shortcutsBtn = screen.getByLabelText("Shortcuts");
    expect(shortcutsBtn).toHaveClass("hidden");
    expect(shortcutsBtn).toHaveClass("md:flex");
  });

  /**
   * Test case to verify that tooltips are suppressed when a navigation item is actively selected.
   */
  it("manages tooltip visibility based on selection state", () => {
    // Arrange: Render without selection and verify tooltips are in default state.
    const { rerender } = render(<SidebarNavigation {...defaultProps} selectedItem={null} />);
    const tooltips = screen.getAllByTestId("tooltip");
    expect(tooltips[0]).toHaveAttribute("data-open", "undefined");

    // Act: Update props to select an item.
    rerender(<SidebarNavigation {...defaultProps} selectedItem="annotation" />);

    // Assert: Verify tooltips are explicitly forced to close when a panel is open.
    const tooltipsAfter = screen.getAllByTestId("tooltip");
    expect(tooltipsAfter[0]).toHaveAttribute("data-open", "false");
  });

  /**
   * Test case to verify that the sidebar translates off-screen when closed in mobile view.
   */
  it("passes correct animation props for mobile view when closed", () => {
    // Arrange: Mock a mobile viewport with the sidebar closed.
    render(<SidebarNavigation {...defaultProps} isMobile={true} isMobileSidebarOpen={false} />);

    // Assert: Verify the horizontal translation animation moves the component to the left.
    const aside = screen.getByTestId("sidebar-aside");
    expect(aside).toHaveAttribute("data-animate", JSON.stringify({ x: -64 }));
  });

  /**
   * Test case to verify that the sidebar translates to the zero position when opened in mobile view.
   */
  it("passes correct animation props for mobile view when open", () => {
    // Arrange: Mock a mobile viewport with the sidebar open.
    render(<SidebarNavigation {...defaultProps} isMobile={true} isMobileSidebarOpen={true} />);

    // Assert: Verify the horizontal translation animation is at the origin.
    const aside = screen.getByTestId("sidebar-aside");
    expect(aside).toHaveAttribute("data-animate", JSON.stringify({ x: 0 }));
  });

  /**
   * Test case to verify that desktop view ignores mobile transition logic and remains at the origin.
   */
  it("passes correct animation props for desktop view", () => {
    // Arrange: Mock a desktop viewport.
    render(<SidebarNavigation {...defaultProps} isMobile={false} isMobileSidebarOpen={false} />);

    // Assert: Verify the horizontal translation is static at the origin regardless of mobile flags.
    const aside = screen.getByTestId("sidebar-aside");
    expect(aside).toHaveAttribute("data-animate", JSON.stringify({ x: 0 }));
  });
});
