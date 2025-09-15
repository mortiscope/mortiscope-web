import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { UploadToolbar } from "@/features/upload/components/upload-toolbar";

// Mock tooltip components to simplify rendering and testing of the toolbar elements.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div hidden>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the search icon from `react-icons/hi`.
vi.mock("react-icons/hi", () => ({
  HiOutlineSearch: () => <svg data-testid="search-icon" />,
}));

// Mock view mode icons from `react-icons/io5`.
vi.mock("react-icons/io5", () => ({
  IoGridOutline: () => <svg data-testid="grid-icon" />,
  IoListOutline: () => <svg data-testid="list-icon" />,
}));

// Mock sort-related icons from `lucide-react`.
vi.mock("react-icons/lu", () => ({
  LuArrowDownAZ: () => <svg data-testid="icon-az" />,
  LuArrowUpDown: () => <svg data-testid="sort-icon" />,
  LuCalendarClock: () => <svg data-testid="icon-date" />,
  LuCalendarDays: () => <svg data-testid="icon-date-mod" />,
  LuArrowUpZA: () => <svg data-testid="icon-za" />,
  LuScaling: () => <svg data-testid="icon-size" />,
}));

// Mock the input component to provide a test ID for easy retrieval.
vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="search-input" {...props} />
  ),
}));

// Mock the button component to allow simulation of clicks.
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

// Mock the dropdown menu components to expose triggers and content for interaction testing.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // Expose the trigger for verifying the displayed sort label.
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  // Expose the content for interaction with sort options.
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  // Mock `DropdownMenuItem` to capture `onSelect` and simulate option clicking.
  DropdownMenuItem: ({
    children,
    onSelect,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { onSelect?: () => void }) => (
    <div role="menuitem" onClick={onSelect} {...props}>
      {children}
    </div>
  ),
}));

// Mock the `ToggleGroup` components to allow testing `onValueChange` upon button click.
vi.mock("@/components/ui/toggle-group", async () => {
  const React = await import("react");
  // Create a context to simulate the internal state of the ToggleGroup.
  const ToggleContext = React.createContext<{
    onValueChange: (val: string) => void;
    value: string;
  } | null>(null);

  return {
    // Mock `ToggleGroup` to provide the context value and track changes.
    ToggleGroup: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange: (val: string) => void;
      value: string;
    }) => (
      <ToggleContext.Provider value={{ onValueChange, value }}>
        <div data-testid="toggle-group">{children}</div>
      </ToggleContext.Provider>
    ),
    // Mock `ToggleGroupItem` as a clickable button that calls `onValueChange`.
    ToggleGroupItem: ({
      value,
      children,
      "aria-label": ariaLabel,
    }: {
      value: string;
      children: React.ReactNode;
      "aria-label": string;
    }) => {
      const context = React.useContext(ToggleContext);
      return (
        <button
          onClick={() => context?.onValueChange(value)}
          aria-label={ariaLabel}
          data-state={context?.value === value ? "on" : "off"}
        >
          {children}
        </button>
      );
    },
  };
});

// Mock the available sort options for the dropdown menu.
vi.mock("@/lib/constants", () => ({
  SORT_OPTIONS: [
    { value: "name-asc", label: "Name (A-Z)" },
    { value: "name-desc", label: "Name (Z-A)" },
    { value: "date-uploaded-desc", label: "Newest First" },
    { value: "date-modified-desc", label: "Date Modified" },
    { value: "size-asc", label: "Size (Smallest)" },
    { value: "invalid-option", label: "Invalid" },
  ],
}));

// Mock the utility function for class name concatenation.
vi.mock("@/lib/utils", () => ({
  cn: (...inputs: (string | undefined | null | false)[]) => inputs.filter(Boolean).join(" "),
}));

/**
 * Test suite for the UploadToolbar component, verifying search, sorting, and view mode controls.
 */
describe("UploadToolbar", () => {
  // Arrange: Define default props for the `UploadToolbar` component.
  const defaultProps = {
    searchTerm: "",
    onSearchTermChange: vi.fn(),
    currentSortLabel: "Newest First",
    sortOption: "date-uploaded-desc" as const,
    onSortOptionChange: vi.fn(),
    viewMode: "grid" as const,
    onViewModeChange: vi.fn(),
  };

  /**
   * Test case to verify that the search input renders with the current search term and includes the search icon.
   */
  it("renders the search input with correct value", () => {
    // Arrange: Render the component with a specific `searchTerm` value.
    render(<UploadToolbar {...defaultProps} searchTerm="test search" />);

    // Assert: Check that the input element exists and displays the provided value.
    const input = screen.getByTestId("search-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("test search");
    // Assert: Check for the presence of the search icon.
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });

  /**
   * Test case to verify that typing in the search input correctly calls the `onSearchTermChange` handler.
   */
  it("calls onSearchTermChange when typing in search input", () => {
    // Arrange: Render the component.
    render(<UploadToolbar {...defaultProps} />);

    // Act: Simulate typing "new term" into the search input.
    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "new term" } });

    // Assert: Check that the search handler was called with the new value.
    expect(defaultProps.onSearchTermChange).toHaveBeenCalledWith("new term");
  });

  /**
   * Test case to verify that the sort dropdown trigger displays the current sort label and the general sort icon.
   */
  it("renders the sort trigger with current label", () => {
    // Arrange: Render the component.
    render(<UploadToolbar {...defaultProps} />);

    // Act: Locate the dropdown trigger element.
    const trigger = screen.getByTestId("dropdown-trigger");
    const button = within(trigger).getByRole("button");

    // Assert: Check that the current sort label is visible within the trigger button.
    expect(within(button).getByText("Newest First")).toBeInTheDocument();
    // Assert: Check for the presence of the general sort icon.
    expect(screen.getByTestId("sort-icon")).toBeInTheDocument();
  });

  /**
   * Test case to verify that selecting a sort option from the dropdown calls the `onSortOptionChange` handler with the correct value.
   */
  it("calls onSortOptionChange when selecting a sort option", () => {
    // Arrange: Render the component.
    render(<UploadToolbar {...defaultProps} />);

    // Act: Find the "Name (A-Z)" menu item text and simulate a click on the option.
    const option = screen.getByText("Name (A-Z)");
    fireEvent.click(option);

    // Assert: Check that the sort handler was called with the corresponding value "name-asc".
    expect(defaultProps.onSortOptionChange).toHaveBeenCalledWith("name-asc");
  });

  /**
   * Test case to verify that the active sort option receives a highlighted class name.
   */
  it("highlights the active sort option", () => {
    // Arrange: Render the component with `sortOption` set to "name-asc".
    render(<UploadToolbar {...defaultProps} sortOption="name-asc" />);

    // Act: Find the parent container of the "Name (A-Z)" text, which represents the dropdown item.
    const option = screen.getByText("Name (A-Z)").closest("div");

    // Assert: Check that the active dropdown item element contains the expected highlight class.
    expect(option?.className).toContain("bg-emerald-50");
  });

  /**
   * Test case to verify that the correct icons associated with each sort option are rendered within the dropdown.
   */
  it("renders correct icon for sort options", () => {
    // Arrange: Render the component.
    render(<UploadToolbar {...defaultProps} />);

    // Assert: Check for the presence of the date icon ("Newest First" option).
    expect(screen.getByTestId("icon-date")).toBeInTheDocument();
    // Assert: Check for the presence of the A-Z icon ("Name (A-Z)" option).
    expect(screen.getByTestId("icon-az")).toBeInTheDocument();

    // Assert: Check for missing coverage icons
    expect(screen.getByTestId("icon-za")).toBeInTheDocument();
    expect(screen.getByTestId("icon-date-mod")).toBeInTheDocument();

    // Assert: Check for size icons (used by both asc and desc)
    const sizeIcons = screen.getAllByTestId("icon-size");
    expect(sizeIcons).toHaveLength(1);

    // Assert: Verify invalid option does not render a known icon
    const invalidOption = screen.getByText("Invalid");
    expect(invalidOption.querySelector("svg")).toBeNull();
  });

  /**
   * Test case to verify that the view mode toggle buttons, represented by their icons, are rendered.
   */
  it("renders view mode toggles correctly", () => {
    // Arrange: Render the component.
    render(<UploadToolbar {...defaultProps} />);

    // Assert: Check for the presence of the grid view icon.
    expect(screen.getByTestId("grid-icon")).toBeInTheDocument();
    // Assert: Check for the presence of the list view icon.
    expect(screen.getByTestId("list-icon")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the list view button calls `onViewModeChange` with the 'list' value.
   */
  it("calls onViewModeChange with 'list' when list button is clicked", () => {
    // Arrange: Render the component with default view mode "grid".
    render(<UploadToolbar {...defaultProps} viewMode="grid" />);

    // Act: Find the list view button by its accessible label and click it.
    const listButton = screen.getByLabelText("List view");
    fireEvent.click(listButton);

    // Assert: Check that the view mode handler was called with "list".
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith("list");
  });

  /**
   * Test case to verify that clicking the grid view button calls `onViewModeChange` with the 'grid' value.
   */
  it("calls onViewModeChange with 'grid' when grid button is clicked", () => {
    // Arrange: Render the component with default view mode "list".
    render(<UploadToolbar {...defaultProps} viewMode="list" />);

    // Act: Find the grid view button by its accessible label and click it.
    const gridButton = screen.getByLabelText("Grid view");
    fireEvent.click(gridButton);

    // Assert: Check that the view mode handler was called with "grid".
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith("grid");
  });

  /**
   * Test case to verify that the `data-state` attribute correctly reflects the active view mode.
   */
  it("reflects active state on view mode buttons", () => {
    // Arrange: Render the component with `viewMode` set to "list".
    render(<UploadToolbar {...defaultProps} viewMode="list" />);

    // Act: Retrieve both view mode buttons.
    const listButton = screen.getByLabelText("List view");
    const gridButton = screen.getByLabelText("Grid view");

    // Assert: Check that the "list" button has the active state and "grid" button has the off state.
    expect(listButton).toHaveAttribute("data-state", "on");
    expect(gridButton).toHaveAttribute("data-state", "off");
  });
});
