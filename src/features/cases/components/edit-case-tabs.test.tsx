import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { EditCaseTabs } from "@/features/cases/components/edit-case-tabs";

// Mock the `framer-motion` component used for the animated tab indicator.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ className, ...props }: React.ComponentProps<"div">) => (
      <div className={className} data-testid="active-tab-indicator" {...props} />
    ),
  },
}));

// Mock the Tabs primitives to isolate interaction logic.
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (val: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="tabs-root" data-value={value}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              activeValue: value,
              onValueChange,
            } as unknown as React.Attributes)
          : child
      )}
    </div>
  ),
  TabsList: ({
    children,
    activeValue,
    onValueChange,
  }: {
    children: React.ReactNode;
    activeValue?: string;
    onValueChange?: (val: string) => void;
  }) => (
    <div role="tablist">
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              activeValue,
              onValueChange,
            } as unknown as React.Attributes)
          : child
      )}
    </div>
  ),
  TabsTrigger: ({
    value,
    children,
    onClick,
    onValueChange,
    className,
  }: {
    value: string;
    children: React.ReactNode;
    onClick?: React.MouseEventHandler;
    onValueChange?: (val: string) => void;
    className?: string;
  }) => (
    <button
      role="tab"
      className={className}
      onClick={(e) => {
        onClick?.(e);
        onValueChange?.(value);
      }}
    >
      {children}
    </button>
  ),
}));

// Mock the icons used for visual representation of each tab.
vi.mock("react-icons/hi2", () => ({
  HiMiniListBullet: () => <svg data-testid="icon-history" />,
  HiOutlineClipboardDocument: () => <svg data-testid="icon-notes" />,
  HiOutlineClipboardDocumentList: () => <svg data-testid="icon-details" />,
}));

/**
 * Test suite for the `EditCaseTabs` component.
 */
describe("EditCaseTabs", () => {
  /**
   * Test case to verify that all tab triggers and their corresponding icons are rendered correctly.
   */
  it("renders all tabs correctly", () => {
    // Arrange: Render the component.
    render(<EditCaseTabs activeTab="details" onTabChange={vi.fn()} />);

    // Assert: Check for the presence of tab buttons with correct text labels.
    expect(screen.getByRole("tab", { name: /Details/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Notes/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /History/i })).toBeInTheDocument();

    // Assert: Check for the presence of the corresponding mock icons for each tab.
    expect(screen.getByTestId("icon-details")).toBeInTheDocument();
    expect(screen.getByTestId("icon-notes")).toBeInTheDocument();
    expect(screen.getByTestId("icon-history")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the active tab indicator is rendered as a child of the currently active tab trigger.
   */
  it("renders the active tab indicator on the correct tab", () => {
    // Arrange: Render the component with "notes" as the active tab.
    const { rerender } = render(<EditCaseTabs activeTab="notes" onTabChange={vi.fn()} />);

    // Assert: Check that the "notes" tab contains the active indicator.
    const notesTab = screen.getByRole("tab", { name: /Notes/i });
    expect(notesTab).toContainElement(screen.getByTestId("active-tab-indicator"));

    // Act: Rerender the component with "history" as the active tab.
    rerender(<EditCaseTabs activeTab="history" onTabChange={vi.fn()} />);
    // Assert: Check that the "history" tab now contains the active indicator.
    const historyTab = screen.getByRole("tab", { name: /History/i });
    expect(historyTab).toContainElement(screen.getByTestId("active-tab-indicator"));
  });

  /**
   * Test case to verify that clicking a tab trigger correctly calls the `onTabChange` callback with the new tab's value.
   */
  it("calls onTabChange when a tab is clicked", async () => {
    // Arrange: Define a mock function for the tab change callback and set up user events.
    const onTabChangeMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component.
    render(<EditCaseTabs activeTab="details" onTabChange={onTabChangeMock} />);

    // Act: Click the "Notes" tab.
    const notesTab = screen.getByRole("tab", { name: /Notes/i });
    await user.click(notesTab);

    // Assert: Check that the mock callback was called with the value "notes".
    expect(onTabChangeMock).toHaveBeenCalledWith("notes");
  });
});
