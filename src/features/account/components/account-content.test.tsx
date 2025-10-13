import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountContent } from "@/features/account/components/account-content";

// Mock the Profile sub-component to verify conditional rendering logic.
vi.mock("@/features/account/components/account-profile", () => ({
  AccountProfile: () => <div data-testid="account-profile">Profile Component</div>,
}));

// Mock the Security sub-component to verify conditional rendering logic.
vi.mock("@/features/account/components/account-security", () => ({
  AccountSecurity: () => <div data-testid="account-security">Security Component</div>,
}));

// Mock the Sessions sub-component to verify conditional rendering logic.
vi.mock("@/features/account/components/account-sessions", () => ({
  AccountSessions: () => <div data-testid="account-sessions">Sessions Component</div>,
}));

// Mock the Deletion sub-component to verify conditional rendering logic.
vi.mock("@/features/account/components/account-deletion", () => ({
  AccountDeletion: () => <div data-testid="account-deletion">Deletion Component</div>,
}));

/**
 * Test suite for the `AccountContent` component.
 */
describe("AccountContent", () => {
  /**
   * Test case to verify that the Profile component is displayed when the profile tab is active.
   */
  it("renders AccountProfile when activeTab is 'profile'", async () => {
    // Arrange: Render the component with the `activeTab` set to `profile`.
    render(<AccountContent activeTab="profile" />);

    // Assert: Confirm the profile component appears and the security component is hidden.
    await waitFor(() => {
      expect(screen.getByTestId("account-profile")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("account-security")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the Security component is displayed when the security tab is active.
   */
  it("renders AccountSecurity when activeTab is 'security'", async () => {
    // Arrange: Render the component with the `activeTab` set to `security`.
    render(<AccountContent activeTab="security" />);

    // Assert: Confirm the security component appears and the profile component is hidden.
    await waitFor(() => {
      expect(screen.getByTestId("account-security")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("profile")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the Sessions component is displayed when the sessions tab is active.
   */
  it("renders AccountSessions when activeTab is 'sessions'", async () => {
    // Arrange: Render the component with the `activeTab` set to `sessions`.
    render(<AccountContent activeTab="sessions" />);

    // Assert: Confirm the sessions component appears in the document.
    await waitFor(() => {
      expect(screen.getByTestId("account-sessions")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the Deletion component is displayed when the deletion tab is active.
   */
  it("renders AccountDeletion when activeTab is 'deletion'", async () => {
    // Arrange: Render the component with the `activeTab` set to `deletion`.
    render(<AccountContent activeTab="deletion" />);

    // Assert: Confirm the deletion component appears in the document.
    await waitFor(() => {
      expect(screen.getByTestId("account-deletion")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that an unrecognized tab value results in an empty render.
   */
  it("renders nothing when activeTab is invalid", () => {
    // Arrange: Render the component with a non-existent tab identifier.
    const { container } = render(<AccountContent activeTab="invalid-tab" />);

    // Assert: Verify that the DOM output is completely empty.
    expect(container).toBeEmptyDOMElement();
  });
});
