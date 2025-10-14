import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { SessionInformation } from "@/features/account/components/session-information";
import { getBrowserName, getCityProvince } from "@/features/account/utils/display-session";

// Mock the session display utilities to verify that raw session data is correctly processed for the UI.
vi.mock("@/features/account/utils/display-session", () => ({
  getBrowserName: vi.fn((val) => `Formatted ${val}`),
  getCityProvince: vi.fn((val) => `Formatted ${val}`),
}));

/**
 * Test suite for the `SessionInformation` component.
 */
describe("SessionInformation", () => {
  const activeSession = {
    browser: "Chrome",
    device: "Desktop PC",
    operatingSystem: "Windows 11",
    location: "Laguna, Philippines",
    isActiveNow: true,
  } as unknown as UserSessionInfo;

  const inactiveSession = {
    ...activeSession,
    isActiveNow: false,
  } as unknown as UserSessionInfo;

  /**
   * Test case to verify that the browser name is passed through the formatting utility before rendering.
   */
  it("renders browser information using utility function", () => {
    // Arrange: Render the component with an active session.
    render(<SessionInformation sessionItem={activeSession} />);

    // Assert: Verify the utility was called and the returned formatted string is visible.
    expect(getBrowserName).toHaveBeenCalledWith("Chrome");
    expect(screen.getByText("Formatted Chrome")).toBeInTheDocument();
  });

  /**
   * Test case to verify that device information is displayed as provided in the session item.
   */
  it("renders device information", () => {
    // Arrange: Render the component.
    render(<SessionInformation sessionItem={activeSession} />);

    // Assert: Check for the presence of the device string in the document.
    expect(screen.getByText("Desktop PC")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the operating system information is displayed as provided in the session item.
   */
  it("renders operating system information", () => {
    // Arrange: Render the component.
    render(<SessionInformation sessionItem={activeSession} />);

    // Assert: Check for the presence of the operating system string in the document.
    expect(screen.getByText("Windows 11")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the location information is processed by the geographic formatting utility.
   */
  it("renders location information using utility function", () => {
    // Arrange: Render the component.
    render(<SessionInformation sessionItem={activeSession} />);

    // Assert: Verify the utility was called with the raw location and the formatted result is displayed.
    expect(getCityProvince).toHaveBeenCalledWith("Laguna, Philippines");
    expect(screen.getByText("Formatted Laguna, Philippines")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the 'Active now' status badge is displayed when the session is currently active.
   */
  it("displays 'Active now' when session is active", () => {
    // Arrange: Render the component with a session where `isActiveNow` is true.
    render(<SessionInformation sessionItem={activeSession} />);

    // Assert: Confirm the active status text is present in the document.
    expect(screen.getByText("Active now")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the 'Inactive' status badge is displayed when the session is not currently active.
   */
  it("displays 'Inactive' when session is not active", () => {
    // Arrange: Render the component with a session where `isActiveNow` is false.
    render(<SessionInformation sessionItem={inactiveSession} />);

    // Assert: Confirm the inactive status text is present in the document.
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});
