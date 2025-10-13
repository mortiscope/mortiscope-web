import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountBreadcrumb } from "@/features/account/components/account-breadcrumb";

/**
 * Test suite for the `AccountBreadcrumb` component.
 */
describe("AccountBreadcrumb", () => {
  /**
   * Test case to verify that the root and parent breadcrumb items are always rendered.
   */
  it("renders static breadcrumb items correctly", () => {
    // Arrange: Render the component with a standard active tab.
    render(<AccountBreadcrumb activeTab="profile" />);

    // Assert: Check that the static organizational labels are present in the document.
    expect(screen.getByText("Mortiscope")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the Profile tab label is displayed when active.
   */
  it("renders Profile tab name correctly", () => {
    // Arrange: Render the component with the `activeTab` prop set to `profile`.
    render(<AccountBreadcrumb activeTab="profile" />);

    // Assert: Check that the specific tab label is rendered.
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the Security tab label is displayed when active.
   */
  it("renders Security tab name correctly", () => {
    // Arrange: Render the component with the `activeTab` prop set to `security`.
    render(<AccountBreadcrumb activeTab="security" />);

    // Assert: Check that the specific tab label is rendered.
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the Sessions tab label is displayed when active.
   */
  it("renders Sessions tab name correctly", () => {
    // Arrange: Render the component with the `activeTab` prop set to `sessions`.
    render(<AccountBreadcrumb activeTab="sessions" />);

    // Assert: Check that the specific tab label is rendered.
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the Deletion tab label is displayed when active.
   */
  it("renders Deletion tab name correctly", () => {
    // Arrange: Render the component with the `activeTab` prop set to `deletion`.
    render(<AccountBreadcrumb activeTab="deletion" />);

    // Assert: Check that the specific tab label is rendered.
    expect(screen.getByText("Deletion")).toBeInTheDocument();
  });

  /**
   * Test case to verify the component fallback behavior for unrecognized tab strings.
   */
  it("renders default Profile for unknown tab", () => {
    // Arrange: Render the component with an invalid or unknown `activeTab` string.
    render(<AccountBreadcrumb activeTab="unknown-tab" />);

    // Assert: Verify that the component defaults to displaying the `Profile` label.
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component correctly maps tab names regardless of string casing.
   */
  it("handles case insensitivity for known tabs", () => {
    // Arrange: Render the component with an uppercase version of a known tab identifier.
    render(<AccountBreadcrumb activeTab="SECURITY" />);

    // Assert: Check that the component correctly normalizes the input to display the expected label.
    expect(screen.getByText("Security")).toBeInTheDocument();
  });
});
