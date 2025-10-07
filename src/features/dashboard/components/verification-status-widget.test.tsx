import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { VerificationStatusWidget } from "@/features/dashboard/components/verification-status-widget";
import { useVerificationStatusPoller } from "@/features/dashboard/hooks/use-verification-status-poller";

// Mock the verification poller hook to control metrics data and fetching states.
vi.mock("@/features/dashboard/hooks/use-verification-status-poller", () => ({
  useVerificationStatusPoller: vi.fn(),
}));

// Mock the toolbar component to simulate view switching and information modal triggers.
vi.mock("@/features/dashboard/components/verification-status-toolbar", () => ({
  VerificationStatusToolbar: ({
    selectedView,
    onViewSelect,
    onInfoClick,
  }: {
    selectedView: string;
    onViewSelect: (view: string) => void;
    onInfoClick: () => void;
  }) => (
    <div data-testid="mock-toolbar">
      <span data-testid="selected-view">{selectedView}</span>
      <button onClick={() => onViewSelect("image")} data-testid="btn-select-image">
        Case Verification Status
      </button>
      <button onClick={() => onViewSelect("detection")} data-testid="btn-select-detection">
        Image Verification Status
      </button>
      <button onClick={() => onViewSelect("unknown")} data-testid="btn-select-unknown">
        Detection Verification Status
      </button>
      <button onClick={onInfoClick} data-testid="btn-info">
        Information Modal
      </button>
    </div>
  ),
}));

// Mock the pie chart component to verify data mapping without rendering complex graphics.
vi.mock("@/features/dashboard/components/dashboard-pie-chart", () => ({
  DashboardPieChart: () => null,
}));

// Mock the information modal to verify visibility state control.
vi.mock("@/features/dashboard/components/verification-status-modal", () => ({
  VerificationStatusModal: () => null,
}));

// Mock Next.js dynamic imports to ensure asynchronous components render immediately during the test execution.
vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<unknown>,
    options: { loading?: () => React.JSX.Element; ssr?: boolean }
  ) => {
    const DynamicComponent = (props: { data?: unknown[]; isOpen?: boolean }) => {
      React.useEffect(() => {
        try {
          loader()
            .then(() => {})
            .catch(() => {});
        } catch {}
      }, []);

      return (
        <>
          {options?.loading && <div hidden>{options.loading()}</div>}
          {props.data ? (
            <div data-testid="mock-pie-chart" data-chart-data={JSON.stringify(props.data)} />
          ) : null}
          {props.isOpen !== undefined ? (
            props.isOpen ? (
              <div data-testid="mock-modal" />
            ) : null
          ) : null}
        </>
      );
    };
    DynamicComponent.displayName = "LoadableComponent";
    return DynamicComponent;
  },
}));

// Mock the UI Skeleton used for indicating initial loading states.
vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="mock-skeleton" />,
}));

// Mock Framer Motion to bypass animation logic for faster and more reliable assertions.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

/**
 * Test suite for the `VerificationStatusWidget` component.
 */
describe("VerificationStatusWidget", () => {
  const mockMetrics = {
    caseVerification: { verified: 10, inProgress: 5, unverified: 2 },
    imageVerification: { verified: 50, inProgress: 10, unverified: 5 },
    detectionVerification: { verified: 100, unverified: 20 },
  };

  /**
   * Test case to verify that a skeleton placeholder is shown while data is being fetched.
   */
  it("renders the skeleton when initially loading", () => {
    // Arrange: Mock the poller to indicate an active fetching state with no metrics.
    vi.mocked(useVerificationStatusPoller).mockReturnValue({
      metrics: null,
      isFetching: true,
    } as unknown as ReturnType<typeof useVerificationStatusPoller>);

    render(<VerificationStatusWidget dateRange={undefined} />);

    // Assert: Verify that the skeleton UI is visible in the document.
    expect(screen.getByTestId("mock-skeleton")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the widget renders the toolbar and chart once data is successfully loaded.
   */
  it("renders the chart and toolbar when data is loaded", async () => {
    // Arrange: Mock the poller to return valid metrics data.
    vi.mocked(useVerificationStatusPoller).mockReturnValue({
      metrics: mockMetrics,
      isFetching: false,
    } as unknown as ReturnType<typeof useVerificationStatusPoller>);

    render(<VerificationStatusWidget dateRange={undefined} />);

    // Assert: Check for the presence of the toolbar and the metrics chart.
    expect(screen.getByTestId("mock-toolbar")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("mock-pie-chart")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the chart correctly maps and displays the initial case verification data.
   */
  it("renders correct initial case verification data", async () => {
    // Arrange: Mock the poller with complete verification metrics.
    vi.mocked(useVerificationStatusPoller).mockReturnValue({
      metrics: mockMetrics,
      isFetching: false,
    } as unknown as ReturnType<typeof useVerificationStatusPoller>);

    render(<VerificationStatusWidget dateRange={undefined} />);

    // Assert: Confirm the chart data matches the `caseVerification` object structure.
    await waitFor(() => {
      const chart = screen.getByTestId("mock-pie-chart");
      const data = JSON.parse(chart.getAttribute("data-chart-data") || "[]");

      expect(data).toHaveLength(3);
      expect(data).toEqual([
        { name: "verified", quantity: 10 },
        { name: "in_progress", quantity: 5 },
        { name: "unverified", quantity: 2 },
      ]);
    });
  });

  /**
   * Test case to verify that the chart updates accurately when switching to the image verification view.
   */
  it("updates chart data when switching views", async () => {
    // Arrange: Render the widget with loaded metrics.
    vi.mocked(useVerificationStatusPoller).mockReturnValue({
      metrics: mockMetrics,
      isFetching: false,
    } as unknown as ReturnType<typeof useVerificationStatusPoller>);

    render(<VerificationStatusWidget dateRange={undefined} />);

    // Act: Simulate a user selecting the image verification view via the toolbar.
    fireEvent.click(screen.getByTestId("btn-select-image"));

    // Assert: Verify that the chart data and the card title update to reflect image metrics.
    await waitFor(() => {
      const chart = screen.getByTestId("mock-pie-chart");
      const data = JSON.parse(chart.getAttribute("data-chart-data") || "[]");

      expect(data).toEqual([
        { name: "verified", quantity: 50 },
        { name: "in_progress", quantity: 10 },
        { name: "unverified", quantity: 5 },
      ]);
    });

    expect(
      screen.getByText("Image Verification Status", { selector: '[data-slot="card-title"]' })
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the chart updates accurately when switching to the detection verification view.
   */
  it("updates chart data when switching to detection view", async () => {
    // Arrange: Render the widget with loaded metrics.
    vi.mocked(useVerificationStatusPoller).mockReturnValue({
      metrics: mockMetrics,
      isFetching: false,
    } as unknown as ReturnType<typeof useVerificationStatusPoller>);

    render(<VerificationStatusWidget dateRange={undefined} />);

    // Act: Simulate a user selecting the detection verification view via the toolbar.
    fireEvent.click(screen.getByTestId("btn-select-detection"));

    // Assert: Verify that the chart data and the card title update to reflect detection metrics.
    await waitFor(() => {
      const chart = screen.getByTestId("mock-pie-chart");
      const data = JSON.parse(chart.getAttribute("data-chart-data") || "[]");

      expect(data).toEqual([
        { name: "verified", quantity: 100 },
        { name: "unverified", quantity: 20 },
      ]);
    });

    expect(
      screen.getByText("Detection Verification Status", { selector: '[data-slot="card-title"]' })
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the widget handles unrecognized view states by showing a loader.
   */
  it("handles unknown view correctly (defaults to empty data)", async () => {
    // Arrange: Render the widget with standard metrics data.
    vi.mocked(useVerificationStatusPoller).mockReturnValue({
      metrics: mockMetrics,
      isFetching: false,
    } as unknown as ReturnType<typeof useVerificationStatusPoller>);

    render(<VerificationStatusWidget dateRange={undefined} />);

    // Act: Simulate an unknown view state selection.
    fireEvent.click(screen.getByTestId("btn-select-unknown"));

    // Assert: Confirm the chart is hidden and the chart loader is displayed.
    await waitFor(() => {
      expect(screen.queryByTestId("mock-pie-chart")).not.toBeInTheDocument();
      expect(screen.getByTestId("chart-loader")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the information modal opens upon user interaction.
   */
  it("opens the modal when info button is clicked", async () => {
    // Arrange: Render the widget in a ready state.
    vi.mocked(useVerificationStatusPoller).mockReturnValue({
      metrics: mockMetrics,
      isFetching: false,
    } as unknown as ReturnType<typeof useVerificationStatusPoller>);

    render(<VerificationStatusWidget dateRange={undefined} />);

    // Act: Click the information button in the toolbar.
    fireEvent.click(screen.getByTestId("btn-info"));

    // Assert: Verify that the mock modal component is rendered in the document.
    await waitFor(() => {
      expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
    });
  });
});
