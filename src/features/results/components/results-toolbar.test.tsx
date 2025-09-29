import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ResultsToolbar } from "@/features/results/components/results-toolbar";

// Mock framer-motion to simplify the component tree and avoid animation timing issues in tests.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock sort configuration constants to provide a controlled list of options for filtering logic.
vi.mock("@/lib/constants", () => ({
  SORT_OPTIONS: [
    { value: "date-uploaded-desc", label: "Date Uploaded (Newest)" },
    { value: "date-modified-desc", label: "Date Modified (Newest)" },
    { value: "name-asc", label: "Name (A-Z)" },
    { value: "name-desc", label: "Name (Z-A)" },
    { value: "size-asc", label: "Size (Smallest)" },
    { value: "size-desc", label: "Size (Largest)" },
    { value: "test-unknown", label: "Test Unknown" },
  ],
}));

// Mock the UI Button component to capture click events and verify accessibility labels.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    "aria-label"?: string;
  }) => (
    <button onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

// Mock the `DropdownMenu` system to verify sort option rendering and selection behavior.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <div role="menuitem" onClick={onSelect}>
      {children}
    </div>
  ),
}));

// Mock the standard Input component for search functionality verification.
vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

// Mock the `ToggleGroup` to verify view mode switching between grid and list layouts.
vi.mock("@/components/ui/toggle-group", () => {
  let activeOnValueChange: ((val: string) => void) | undefined;

  return {
    ToggleGroup: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange: (val: string) => void;
    }) => {
      activeOnValueChange = onValueChange;
      return <div>{children}</div>;
    },
    ToggleGroupItem: ({
      children,
      value,
      "aria-label": ariaLabel,
    }: {
      children: React.ReactNode;
      value: string;
      "aria-label"?: string;
    }) => (
      <button onClick={() => activeOnValueChange?.(value)} aria-label={ariaLabel}>
        {children}
      </button>
    ),
  };
});

// Mock Tooltip components to ensure they do not interfere with element selection in tests.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock `Heroicons` for search visualization.
vi.mock("react-icons/hi", () => ({
  HiOutlineSearch: () => <span data-testid="icon-search" />,
}));

// Mock `Ionicons` for layout toggling visualization.
vi.mock("react-icons/io5", () => ({
  IoGridOutline: () => <span data-testid="icon-grid" />,
  IoListOutline: () => <span data-testid="icon-list" />,
}));

// Mock `Lucide` icons for various sorting directions and data types.
vi.mock("react-icons/lu", () => ({
  LuArrowDownAZ: () => <span data-testid="icon-az" />,
  LuArrowUpDown: () => <span data-testid="icon-sort" />,
  LuArrowUpZA: () => <span data-testid="icon-za" />,
  LuCalendarClock: () => <span data-testid="icon-calendar-clock" />,
  LuCalendarDays: () => <span data-testid="icon-calendar-days" />,
}));

/**
 * Test suite for the `ResultsToolbar` component.
 */
describe("ResultsToolbar", () => {
  const defaultProps = {
    searchTerm: "",
    onSearchTermChange: vi.fn(),
    sortOption: "date-uploaded-desc" as const,
    onSortOptionChange: vi.fn(),
    viewMode: "grid" as const,
    onViewModeChange: vi.fn(),
  };

  /**
   * Test case to verify that the search input renders with the provided search string.
   */
  it("renders the search input with correct value", () => {
    // Arrange: Render the toolbar with a specific `searchTerm`.
    render(<ResultsToolbar {...defaultProps} searchTerm="fly detection" />);

    // Assert: Verify the input placeholder, value, and search icon are correct.
    const input = screen.getByPlaceholderText("Search cases...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("fly detection");
    expect(screen.getByTestId("icon-search")).toBeInTheDocument();
  });

  /**
   * Test case to verify that typing in the search box triggers the `onSearchTermChange` callback.
   */
  it("calls onSearchTermChange when typing in search input", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<ResultsToolbar {...defaultProps} />);

    // Act: Simulate a keystroke in the search field.
    const input = screen.getByPlaceholderText("Search cases...");
    await user.type(input, "a");

    // Assert: Verify that the parent is notified of the search change.
    expect(defaultProps.onSearchTermChange).toHaveBeenCalledWith("a");
  });

  /**
   * Test case to verify that the label of the currently selected sort option is visible.
   */
  it("displays the current sort label", () => {
    // Arrange: Render with the `date-uploaded-desc` sort option.
    render(<ResultsToolbar {...defaultProps} sortOption="date-uploaded-desc" />);

    // Assert: Check that the human-readable label is displayed within the sort trigger.
    expect(
      within(screen.getByLabelText("Sort options")).getByText("Date Uploaded (Newest)")
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that specific sort options like file size are filtered out of the results toolbar.
   */
  it("renders filtered sort options (excluding size options)", () => {
    // Arrange: Render the toolbar.
    render(<ResultsToolbar {...defaultProps} />);

    // Act: Access the dropdown content area.
    const dropdownContent = screen.getByTestId("dropdown-content");

    // Assert: Verify date and name options exist while size-related options are omitted.
    expect(within(dropdownContent).getByText("Date Uploaded (Newest)")).toBeInTheDocument();
    expect(within(dropdownContent).getByText("Name (A-Z)")).toBeInTheDocument();
    expect(within(dropdownContent).queryByText("Size (Smallest)")).not.toBeInTheDocument();
    expect(within(dropdownContent).queryByText("Size (Largest)")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that selecting a different sort option triggers the `onSortOptionChange` callback.
   */
  it("calls onSortOptionChange when a sort option is selected", async () => {
    // Arrange: Setup user events and render.
    const user = userEvent.setup();
    render(<ResultsToolbar {...defaultProps} />);

    // Act: Click a specific sort item.
    const nameOption = screen.getByText("Name (A-Z)");
    await user.click(nameOption);

    // Assert: Verify the parent received the updated `sortOption` value.
    expect(defaultProps.onSortOptionChange).toHaveBeenCalledWith("name-asc");
  });

  /**
   * Test case to verify that the correct visual icon is used for each specific sort category.
   */
  it("renders the correct icon for specific sort options", () => {
    // Arrange: Render with the name ascending option.
    const { rerender } = render(<ResultsToolbar {...defaultProps} sortOption="name-asc" />);

    // Assert: Check for the A-Z icon.
    const dropdownContent = screen.getByTestId("dropdown-content");
    expect(within(dropdownContent).getByTestId("icon-az")).toBeInTheDocument();

    // Act: Rerender with upload date option.
    rerender(<ResultsToolbar {...defaultProps} sortOption="date-uploaded-desc" />);
    // Assert: Check for the upload calendar icon.
    expect(within(dropdownContent).getByTestId("icon-calendar-clock")).toBeInTheDocument();

    // Act: Rerender with modification date option.
    rerender(<ResultsToolbar {...defaultProps} sortOption="date-modified-desc" />);
    // Assert: Check for the modified calendar icon.
    expect(within(dropdownContent).getByTestId("icon-calendar-days")).toBeInTheDocument();

    // Act: Rerender with name descending option.
    rerender(<ResultsToolbar {...defaultProps} sortOption="name-desc" />);
    // Assert: Check for the Z-A icon.
    expect(within(dropdownContent).getByTestId("icon-za")).toBeInTheDocument();

    // Act: Provide an invalid option to ensure the logic handles it safely.
    rerender(
      <ResultsToolbar
        {...defaultProps}
        sortOption={"invalid-option" as unknown as "date-uploaded-desc"}
      />
    );
  });

  /**
   * Test case to verify that unknown or unsupported sort options are rendered without breaking and without icons.
   */
  it("handles unsupported sort options gracefully", () => {
    // Arrange: Render the toolbar.
    render(<ResultsToolbar {...defaultProps} />);

    // Act: Locate the test-only unknown sort option.
    const dropdownContent = screen.getByTestId("dropdown-content");
    const unknownOption = within(dropdownContent).getByText("Test Unknown");

    // Assert: Verify it renders as a menu item but lacks a leading icon.
    expect(unknownOption).toBeInTheDocument();
    const menuItem = unknownOption.closest('div[role="menuitem"]');
    expect(menuItem).not.toBeNull();
    if (menuItem) {
      expect(within(menuItem as HTMLElement).queryByTestId(/icon-/)).not.toBeInTheDocument();
    }
  });

  /**
   * Test case to verify that both layout view mode buttons are present in the toolbar.
   */
  it("renders view mode toggles", () => {
    // Arrange: Render the toolbar.
    render(<ResultsToolbar {...defaultProps} />);

    // Assert: Verify list and grid buttons exist with their respective icons and accessibility labels.
    expect(screen.getByLabelText("List view")).toBeInTheDocument();
    expect(screen.getByLabelText("Grid view")).toBeInTheDocument();
    expect(screen.getByTestId("icon-list")).toBeInTheDocument();
    expect(screen.getByTestId("icon-grid")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the list view toggle triggers the `onViewModeChange` callback.
   */
  it("calls onViewModeChange when list view is clicked", async () => {
    // Arrange: Setup user event and render.
    const user = userEvent.setup();
    render(<ResultsToolbar {...defaultProps} />);

    // Act: Click the list layout button.
    await user.click(screen.getByLabelText("List view"));

    // Assert: Verify the parent received the `list` view mode.
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith("list");
  });

  /**
   * Test case to verify that clicking the grid view toggle triggers the `onViewModeChange` callback.
   */
  it("calls onViewModeChange when grid view is clicked", async () => {
    // Arrange: Setup user event and render.
    const user = userEvent.setup();
    render(<ResultsToolbar {...defaultProps} />);

    // Act: Click the grid layout button.
    await user.click(screen.getByLabelText("Grid view"));

    // Assert: Verify the parent received the `grid` view mode.
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith("grid");
  });
});
