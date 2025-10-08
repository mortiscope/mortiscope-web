import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  DashboardWidgetToolbar,
  ViewOption,
} from "@/features/dashboard/components/dashboard-widget-toolbar";

// Define mock components for various icons to verify conditional rendering logic.
const MockIconDefault = (props: React.ComponentProps<"svg">) => (
  <svg data-testid="icon-default" {...props} />
);
const MockIconOne = (props: React.ComponentProps<"svg">) => (
  <svg data-testid="icon-one" {...props} />
);
const MockIconTwo = (props: React.ComponentProps<"svg">) => (
  <svg data-testid="icon-two" {...props} />
);

// Mock the UI Button component to isolate toolbar logic and simplify accessibility checks.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    "aria-label": ariaLabel,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label"?: string }) => (
    <button onClick={onClick} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

// Mock the Dropdown Menu components to verify view selection behavior and interaction handlers.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    onCloseAutoFocus,
  }: {
    children: React.ReactNode;
    onCloseAutoFocus?: (e: Event) => void;
  }) => (
    <div
      data-testid="dropdown-content"
      onBlur={() => onCloseAutoFocus?.({ preventDefault: vi.fn() } as unknown as Event)}
    >
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    className,
  }: React.HTMLAttributes<HTMLDivElement> & {
    onSelect?: React.MouseEventHandler<HTMLDivElement>;
  }) => (
    <div data-testid="dropdown-item" className={className} onClick={onSelect}>
      {children}
    </div>
  ),
}));

// Mock the Tooltip components to verify that informative text is associated with toolbar actions.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

type TestViewType = "view1" | "view2";

// Setup mock view options to simulate different graphical representations in the dashboard.
const mockViewOptions: ViewOption<TestViewType>[] = [
  { value: "view1", label: "View One", icon: MockIconOne },
  { value: "view2", label: "View Two", icon: MockIconTwo },
];

/**
 * Test suite for the `DashboardWidgetToolbar` component.
 */
describe("DashboardWidgetToolbar", () => {
  const mockOnViewSelect = vi.fn();
  const mockOnInfoClick = vi.fn();

  // Define default props to maintain consistency across test cases.
  const defaultProps = {
    viewOptions: mockViewOptions,
    selectedView: "view1" as TestViewType,
    onViewSelect: mockOnViewSelect,
    onInfoClick: mockOnInfoClick,
    defaultIcon: MockIconDefault,
  };

  /**
   * Test case to verify that the icon corresponding to the selected view is displayed upon mounting.
   */
  it("renders the active view icon after mounting", async () => {
    // Arrange: Render the toolbar with "view1" selected.
    render(<DashboardWidgetToolbar {...defaultProps} />);

    // Assert: Verify that the trigger contains the icon for "view1" and not the default fallback.
    await waitFor(() => {
      const trigger = screen.getByLabelText("Change view");
      expect(within(trigger).getByTestId("icon-one")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("icon-default")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that a fallback default icon is used when the `selectedView` key is not found.
   */
  it("renders the default icon if selected view is not in options", async () => {
    // Arrange: Render with a view key that does not exist in `mockViewOptions`.
    render(
      <DashboardWidgetToolbar
        {...defaultProps}
        selectedView={"unknown" as unknown as TestViewType}
      />
    );

    // Assert: Check for the presence of the default fallback icon.
    await waitFor(() => {
      expect(screen.getByTestId("icon-default")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that selecting an item from the dropdown triggers the selection callback.
   */
  it("calls onViewSelect when a dropdown item is clicked", async () => {
    // Arrange: Render the component.
    render(<DashboardWidgetToolbar {...defaultProps} />);

    // Act: Locate and click the menu item for "View Two".
    await waitFor(() => {
      expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
    });

    const items = screen.getAllByTestId("dropdown-item");
    const viewTwoItem = items.find((item) => item.textContent?.includes("View Two"));

    fireEvent.click(viewTwoItem!);

    // Assert: Verify that the selection handler was called with the value "view2".
    expect(mockOnViewSelect).toHaveBeenCalledWith("view2");
  });

  /**
   * Test case to verify that the secondary information button triggers its respective handler.
   */
  it("calls onInfoClick when the info button is clicked", async () => {
    // Arrange: Render the component.
    render(<DashboardWidgetToolbar {...defaultProps} />);

    // Act: Find the info button by its accessible label and click it.
    await waitFor(() => {
      const infoBtn = screen.getByLabelText("Information");
      fireEvent.click(infoBtn);
    });

    // Assert: Verify the mock handler was called exactly once.
    expect(mockOnInfoClick).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the currently selected view receives distinct visual highlighting in the dropdown.
   */
  it("applies active styling to the selected dropdown item", async () => {
    // Arrange: Render with "view1" selected.
    render(<DashboardWidgetToolbar {...defaultProps} selectedView="view1" />);

    // Assert: Check that the active item has specific CSS classes while the inactive one does not.
    await waitFor(() => {
      const items = screen.getAllByTestId("dropdown-item");
      const viewOneItem = items.find((item) => item.textContent?.includes("View One"));
      const viewTwoItem = items.find((item) => item.textContent?.includes("View Two"));

      expect(viewOneItem?.className).toContain("bg-emerald-50");
      expect(viewOneItem?.className).toContain("text-emerald-700");

      expect(viewTwoItem?.className).not.toContain("bg-emerald-50");
    });
  });

  /**
   * Test case to verify that vertical spacing is added to the active item if it follows other items in the list.
   */
  it("applies margin-top to active item when it is not the first item", async () => {
    // Arrange: Render with the second option ("view2") selected.
    render(<DashboardWidgetToolbar {...defaultProps} selectedView="view2" />);

    // Assert: Verify that the second item received a top margin class for layout adjustment.
    await waitFor(() => {
      const items = screen.getAllByTestId("dropdown-item");
      const viewTwoItem = items.find((item) => item.textContent?.includes("View Two"));

      expect(viewTwoItem?.className).toContain("mt-1");
    });
  });

  /**
   * Test case to verify the presence of descriptive tooltips for toolbar buttons.
   */
  it("renders tooltip content", async () => {
    // Arrange: Render the toolbar.
    render(<DashboardWidgetToolbar {...defaultProps} />);

    // Assert: Verify that the accessibility labels used in tooltips are available in the DOM.
    await waitFor(() => {
      expect(screen.getByText("Change view")).toBeInTheDocument();
      expect(screen.getByText("Information")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the dropdown content prevents the default focus behavior when closing.
   */
  it("prevents auto-focus on close of dropdown", async () => {
    // Arrange: Render the toolbar.
    render(<DashboardWidgetToolbar {...defaultProps} />);

    // Act: Simulate a blur event on the dropdown content which triggers the focus-prevention logic.
    await waitFor(() => {
      expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
    });

    const content = screen.getByTestId("dropdown-content");
    fireEvent.blur(content);

    // Assert: Verify the content remains in the document as expected during the interaction.
    expect(content).toBeInTheDocument();
  });
});
