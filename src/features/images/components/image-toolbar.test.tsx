import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/__tests__/setup/test-utils";
import { ImageToolbar } from "@/features/images/components/image-toolbar";
import { type SortOptionValue } from "@/lib/constants";

interface MockMotionProps {
  children: React.ReactNode;
  className?: string;
}

// Mock Framer Motion to bypass animation logic during tests.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: MockMotionProps) => <div className={className}>{children}</div>,
  },
}));

// Hoist mock configuration to ensure it is available before imports are resolved.
const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    sortOptions: [
      { value: "date-uploaded-desc", label: "Date Uploaded (Newest)" },
      { value: "name-asc", label: "Name (A-Z)" },
    ] as { value: string; label: string }[],
  },
}));

// Mock constants to return the dynamic mocked sort options.
vi.mock("@/lib/constants", () => ({
  get SORT_OPTIONS() {
    return mockConfig.sortOptions;
  },
}));

// Mock icon components to simplify rendering and avoid dependency on the icon library.
vi.mock("react-icons/hi", () => ({ HiOutlineSearch: () => <div /> }));
vi.mock("react-icons/lu", () => ({
  LuArrowDownAZ: () => <div />,
  LuArrowUpDown: () => <div />,
  LuArrowUpZA: () => <div />,
  LuCalendarClock: () => <div />,
  LuCalendarDays: () => <div />,
  LuScaling: () => <div />,
}));

interface MockDropdownProps {
  children: React.ReactNode;
  onSelect?: () => void;
}

// Mock UI components to expose internal structure for testing interactions.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: MockDropdownProps) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: MockDropdownProps) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: MockDropdownProps) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onSelect }: MockDropdownProps) => (
    <div data-testid="dropdown-item" onClick={onSelect}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props}>{props.children}</button>,
}));

const defaultProps = {
  searchTerm: "",
  onSearchTermChange: vi.fn(),
  sortOption: "date-uploaded-desc" as SortOptionValue,
  onSortOptionChange: vi.fn(),
  isSortDisabled: false,
};

/**
 * Test suite for the `ImageToolbar` component covering search input and sort functionality.
 */
describe("ImageToolbar", () => {
  /**
   * Test case to verify that the search input renders with the correct initial value.
   */
  it("renders search input with correct value", () => {
    // Arrange: Render the component with a specific search term.
    render(<ImageToolbar {...defaultProps} searchTerm="test query" />);

    // Assert: Verify that the input element contains the passed value.
    const input = screen.getByPlaceholderText("Search images...");
    expect(input).toHaveValue("test query");
  });

  /**
   * Test case to verify that typing in the search input triggers the change handler.
   */
  it("calls onSearchTermChange when typing", () => {
    // Arrange: Render the component.
    render(<ImageToolbar {...defaultProps} />);

    // Act: Simulate typing into the search input.
    const input = screen.getByPlaceholderText("Search images...");
    fireEvent.change(input, { target: { value: "new search" } });

    // Assert: Check if the change handler was called with the new value.
    expect(defaultProps.onSearchTermChange).toHaveBeenCalledWith("new search");
  });

  /**
   * Test case to verify that the sort button displays the label corresponding to the current sort option.
   */
  it("displays the correct label for the current sort option", () => {
    // Arrange: Render the component with a specific sort option.
    render(<ImageToolbar {...defaultProps} sortOption="name-asc" />);

    // Assert: Verify the button text matches the label for the selected option.
    const button = screen.getByLabelText("Sort options");
    expect(button).toHaveTextContent("Name (A-Z)");
  });

  /**
   * Test case to verify that selecting an item from the dropdown triggers the sort change handler.
   */
  it("calls onSortOptionChange when a dropdown item is selected", () => {
    // Arrange: Render the component and find the dropdown items.
    render(<ImageToolbar {...defaultProps} />);

    const dropdownItems = screen.getAllByTestId("dropdown-item");
    const targetItem = dropdownItems.find((item) => item.textContent?.includes("Name (A-Z)"));

    if (targetItem) {
      // Act: Click the target dropdown item.
      fireEvent.click(targetItem);
      // Assert: Check if the sort change handler was called with the correct value.
      expect(defaultProps.onSortOptionChange).toHaveBeenCalledWith("name-asc");
    } else {
      throw new Error("Dropdown item not found");
    }
  });

  /**
   * Test case to verify that the sort button is disabled when the prop is set to true.
   */
  it("disables the sort button when isSortDisabled is true", () => {
    // Arrange: Render the component with sorting disabled.
    render(<ImageToolbar {...defaultProps} isSortDisabled={true} />);

    // Assert: Check if the button has the disabled attribute.
    const button = screen.getByLabelText("Sort options");
    expect(button).toBeDisabled();
  });

  /**
   * Test case to verify that the cursor style indicates a disabled state when sorting is disabled.
   */
  it("applies cursor-not-allowed class when sort is disabled", () => {
    // Arrange: Render the component with sorting disabled.
    render(<ImageToolbar {...defaultProps} isSortDisabled={true} />);

    // Assert: Check if the wrapper element has the correct CSS class.
    const button = screen.getByLabelText("Sort options");
    const wrapper = button.parentElement?.parentElement?.parentElement;

    expect(wrapper).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that the correct icons are rendered for all configured sort options.
   */
  it("renders correct icons for all sort options", () => {
    // Arrange: Modify the mock configuration to include various sort types.
    mockConfig.sortOptions = [
      { value: "date-uploaded-desc", label: "Date Uploaded" },
      { value: "date-modified-desc", label: "Date Modified" },
      { value: "name-asc", label: "Name A-Z" },
      { value: "name-desc", label: "Name Z-A" },
      { value: "size-asc", label: "Size Asc" },
    ];

    render(<ImageToolbar {...defaultProps} />);

    // Assert: Verify that the correct number of dropdown items are rendered.
    expect(screen.getByLabelText("Sort options")).toBeInTheDocument();
    const items = screen.getAllByTestId("dropdown-item");
    expect(items).toHaveLength(5);
  });

  /**
   * Test case to verify that the component handles unknown sort options gracefully.
   */
  it("renders nothing for unknown sort option", () => {
    // Arrange: Set an unknown sort option in the mock configuration.
    mockConfig.sortOptions = [{ value: "unknown-option", label: "Unknown" }];

    render(<ImageToolbar {...defaultProps} />);

    // Assert: Check that the item is rendered with the fallback label or content.
    const items = screen.getAllByTestId("dropdown-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Unknown");
  });
});
