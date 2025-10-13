import { fireEvent, render, screen } from "@testing-library/react";
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { AccountContainer } from "@/features/account/components/account-container";

// Mock the content display component to isolate the container logic and verify tab propagation.
vi.mock("@/features/account/components/account-content", () => ({
  AccountContent: ({ activeTab }: { activeTab: string }) => (
    <div data-testid="mock-content">Content: {activeTab}</div>
  ),
}));

// Mock the navigation component to simulate tab switching via user interaction.
vi.mock("@/features/account/components/account-navigation", () => ({
  AccountNavigation: ({
    activeTab,
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => (
    <div data-testid="mock-nav">
      <span>Nav: {activeTab}</span>
      <button onClick={() => onTabChange("security")}>Security</button>
    </div>
  ),
}));

/**
 * Test suite for the `AccountContainer` component.
 */
describe("AccountContainer", () => {
  /**
   * Test case to verify that the component defaults to the profile state when the URL contains no parameters.
   */
  it("defaults to 'profile' tab when no query param is present", () => {
    // Arrange: Mock the search params hook to return an empty set of parameters.
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReadonlyURLSearchParams
    );

    render(<AccountContainer />);

    // Assert: Check that both navigation and content reflect the default `profile` state.
    expect(screen.getByText("Content: profile")).toBeInTheDocument();
    expect(screen.getByText("Nav: profile")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component correctly reads the initial state from the URL.
   */
  it("initializes with tab from URL if valid", () => {
    // Arrange: Mock the search params hook to include a valid `tab` parameter.
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("tab=sessions") as unknown as ReadonlyURLSearchParams
    );

    render(<AccountContainer />);

    // Assert: Check that the component state matches the `sessions` value provided in the URL.
    expect(screen.getByText("Content: sessions")).toBeInTheDocument();
    expect(screen.getByText("Nav: sessions")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component falls back to a safe default when provided an unrecognized tab string.
   */
  it("defaults to 'profile' if URL tab is invalid", () => {
    // Arrange: Mock the search params hook with an invalid `tab` value.
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("tab=invalid-tab") as unknown as ReadonlyURLSearchParams
    );

    render(<AccountContainer />);

    // Assert: Verify that the state falls back to the default `profile` value.
    expect(screen.getByText("Content: profile")).toBeInTheDocument();
  });

  /**
   * Test case to verify that user interaction with navigation correctly updates the internal container state.
   */
  it("updates active tab when navigation triggers change", () => {
    // Arrange: Mock initial empty search params and render the container.
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReadonlyURLSearchParams
    );

    render(<AccountContainer />);

    // Assert: Confirm the initial state is set to `profile`.
    expect(screen.getByText("Content: profile")).toBeInTheDocument();

    // Act: Simulate a user clicking a button in the navigation to switch tabs.
    fireEvent.click(screen.getByText("Security"));

    // Assert: Verify that the internal state has updated and propagated to the sub-components.
    expect(screen.getByText("Content: security")).toBeInTheDocument();
    expect(screen.getByText("Nav: security")).toBeInTheDocument();
  });
});
