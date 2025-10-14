import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { SessionDetailsList } from "@/features/account/components/session-details-list";
import { formatDate, formatRelativeTime } from "@/features/account/utils/format-date";

// Mock the date formatting utilities to verify they are called with the correct session timestamps.
vi.mock("@/features/account/utils/format-date", () => ({
  formatDate: vi.fn(() => "Formatted Date"),
  formatRelativeTime: vi.fn(() => "Formatted Relative Time"),
}));

/**
 * Test suite for the `SessionDetailsList` component.
 */
describe("SessionDetailsList", () => {
  const mockSession = {
    browser: "Chrome 120",
    operatingSystem: "Windows 11",
    device: "Desktop",
    location: "Manila, Philippines",
    ipAddress: "192.168.1.1",
    dateAdded: new Date("2023-01-01"),
    lastActive: new Date("2023-01-02"),
  } as unknown as UserSessionInfo;

  /**
   * Test case to verify that every session property is rendered with its corresponding label and value.
   */
  it("renders all session details correctly", () => {
    // Arrange: Render the component with a complete mock session object.
    render(<SessionDetailsList session={mockSession} />);

    // Assert: Check for the presence of software-related labels and values.
    expect(screen.getByText("Browser:")).toBeInTheDocument();
    expect(screen.getByText("Chrome 120")).toBeInTheDocument();

    expect(screen.getByText("Operating System:")).toBeInTheDocument();
    expect(screen.getByText("Windows 11")).toBeInTheDocument();

    // Assert: Check for the presence of hardware and network labels and values.
    expect(screen.getByText("Device:")).toBeInTheDocument();
    expect(screen.getByText("Desktop")).toBeInTheDocument();

    expect(screen.getByText("Location:")).toBeInTheDocument();
    expect(screen.getByText("Manila, Philippines")).toBeInTheDocument();

    expect(screen.getByText("IP Address:")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.1")).toBeInTheDocument();

    // Assert: Check for the presence of temporal labels and formatted date strings.
    expect(screen.getByText("Date Added:")).toBeInTheDocument();
    expect(screen.getByText("Formatted Date")).toBeInTheDocument();

    expect(screen.getByText("Last Active:")).toBeInTheDocument();
    expect(screen.getByText("Formatted Relative Time")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component correctly utilizes the date formatting utilities.
   */
  it("calls formatting utilities with correct dates", () => {
    // Arrange: Render the component.
    render(<SessionDetailsList session={mockSession} />);

    // Assert: Verify that `formatDate` and `formatRelativeTime` were called with the correct `Date` objects.
    expect(formatDate).toHaveBeenCalledWith(mockSession.dateAdded);
    expect(formatRelativeTime).toHaveBeenCalledWith(mockSession.lastActive);
  });
});
