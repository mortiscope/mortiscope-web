import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyzeProgress } from "@/features/analyze/components/analyze-progress";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useMediaQuery } from "@/hooks/use-media-query";

// Mock the store to isolate state management logic.
vi.mock("@/features/analyze/store/analyze-store");
// Mock the media query hook to control responsive behavior in tests.
vi.mock("@/hooks/use-media-query");
// Mock constants to ensure predictable animation timing in tests.
vi.mock("@/lib/constants", () => ({
  CIRCLE_ANIMATION_DURATION: 0.3,
  LINE_ANIMATION_DURATION: 0.3,
}));

interface MotionProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  animate?: Record<string, unknown> | string;
  transition?: Record<string, unknown>;
  onClick?: () => void;
}

// Mock Framer Motion to render standard HTML elements with data attributes for testing animation states.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, style, animate, transition }: MotionProps) => (
      <div
        className={className}
        style={style}
        data-testid="motion-div"
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
      >
        {children}
      </div>
    ),
    span: ({ children, className, onClick, animate, transition }: MotionProps) => (
      <span
        className={className}
        onClick={onClick}
        data-testid="motion-span"
        data-animate={typeof animate === "string" ? animate : JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
      >
        {children}
      </span>
    ),
  },
}));

// Mock Tooltip components to avoid rendering complex overlay structures.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

interface MockStoreState {
  status: string;
  setStatus: (status: string) => void;
}

type StoreSelector = (state: MockStoreState) => unknown;

/**
 * Groups related tests for the Analyze Progress component which visualizes the analysis steps.
 */
describe("AnalyzeProgress", () => {
  // Mock function to track status updates.
  const mockSetStatus = vi.fn();

  // Reset mocks and set default store/media query state before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAnalyzeStore).mockImplementation((selector: unknown) => {
      const state: MockStoreState = {
        status: "details",
        setStatus: mockSetStatus,
      };
      if (typeof selector === "function") {
        return (selector as StoreSelector)(state);
      }
      return state;
    });

    // Default to large screen (desktop) view.
    vi.mocked(useMediaQuery).mockReturnValue(true);
  });

  /**
   * Test case to verify that all analysis step names are rendered on large screens.
   */
  it("renders all analysis steps with correct names on large screens", () => {
    // Arrange: Render the component with the first step active.
    render(<AnalyzeProgress currentStep={1} />);

    // Assert: Check that all step labels are present in the document.
    expect(screen.getByText("Analysis Details")).toBeInTheDocument();
    expect(screen.getByText("Provide an Image")).toBeInTheDocument();
    expect(screen.getByText("Review and Submit")).toBeInTheDocument();
  });

  /**
   * Test case to verify that step names are hidden and tooltips are used on small screens.
   */
  it("hides step names and uses tooltips on small screens", () => {
    // Arrange: Mock the media query to simulate a mobile screen.
    vi.mocked(useMediaQuery).mockReturnValue(false);

    render(<AnalyzeProgress currentStep={1} />);

    // Assert: Verify text labels are present but visually hidden.
    const textElements = screen.getAllByText("Analysis Details");

    const labelSpan = textElements.find((el) => el.tagName === "SPAN");

    expect(labelSpan).toBeInTheDocument();
    expect(labelSpan).toHaveClass("hidden");

    // Assert: Verify tooltip triggers are rendered for accessibility.
    const triggers = screen.getAllByTestId("tooltip-trigger");
    expect(triggers).toHaveLength(3);
  });

  /**
   * Test case to verify that the component correctly visualizes step states (completed, current, inactive).
   */
  it("visualizes the current step correctly", () => {
    // Arrange: Render the component with the second step active.
    render(<AnalyzeProgress currentStep={2} />);

    // Assert: Check the animation states of the step indicators.
    const steps = screen.getAllByTestId("motion-span");

    expect(steps[0]).toHaveAttribute("data-animate", "completed");
    expect(steps[1]).toHaveAttribute("data-animate", "current");
    expect(steps[2]).toHaveAttribute("data-animate", "inactive");
  });

  /**
   * Test case to verify that clicking a completed step triggers navigation.
   */
  it("allows navigation to completed steps", async () => {
    // Arrange: Setup user event and render with the second step active.
    const user = userEvent.setup();
    render(<AnalyzeProgress currentStep={2} />);

    // Act: Click on the first (completed) step.
    const steps = screen.getAllByTestId("motion-span");

    await user.click(steps[0]);

    // Assert: Verify that the status update function was called.
    expect(mockSetStatus).toHaveBeenCalledWith("details");
  });

  /**
   * Test case to verify that navigation is prevented for current or future steps.
   */
  it("prevents navigation to current or future steps", async () => {
    // Arrange: Setup user event and render with the second step active.
    const user = userEvent.setup();
    render(<AnalyzeProgress currentStep={2} />);

    // Act: Click on the current and future steps.
    const steps = screen.getAllByTestId("motion-span");

    await user.click(steps[1]);
    await user.click(steps[2]);

    // Assert: Verify that the status update function was not called.
    expect(mockSetStatus).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that navigation is disabled entirely when the status is 'processing'.
   */
  it("prevents navigation when form is submitting (processing)", async () => {
    // Arrange: Mock the store status to 'processing'.
    vi.mocked(useAnalyzeStore).mockImplementation((selector: unknown) => {
      const state: MockStoreState = {
        status: "processing",
        setStatus: mockSetStatus,
      };
      if (typeof selector === "function") {
        return (selector as StoreSelector)(state);
      }
      return state;
    });

    const user = userEvent.setup();
    render(<AnalyzeProgress currentStep={2} />);

    // Act: Attempt to click on a completed step.
    const steps = screen.getAllByTestId("motion-span");

    await user.click(steps[0]);

    // Assert: Verify no navigation occurred and the cursor indicates a disabled state.
    expect(mockSetStatus).not.toHaveBeenCalled();
    expect(steps[0]).toHaveClass("cursor-not-allowed");
  });

  /**
   * Test case to verify that progress lines animate to the correct width based on step completion.
   */
  it("animates progress lines correctly based on completion", () => {
    // Arrange: Render the component with the second step active.
    render(<AnalyzeProgress currentStep={2} />);

    // Assert: Check the width animation props of the progress lines.
    const lines = screen
      .getAllByTestId("motion-div")
      .filter((el) => el.className.includes("bg-emerald-600"));

    expect(lines[0]).toHaveAttribute("data-animate", JSON.stringify({ width: "100%" }));
    expect(lines[1]).toHaveAttribute("data-animate", JSON.stringify({ width: "0%" }));
  });

  /**
   * Test case to verify that reverse animation delays are calculated correctly for backward navigation.
   */
  it("calculates correct animation delays when navigating backward", () => {
    // Arrange: Render the component at a later step, then rerender at an earlier step.
    const { rerender } = render(<AnalyzeProgress currentStep={3} />);

    rerender(<AnalyzeProgress currentStep={1} />);

    // Act: Retrieve steps and lines to inspect transition props.
    const steps = screen.getAllByTestId("motion-span");
    const lines = screen
      .getAllByTestId("motion-div")
      .filter((el) => el.className.includes("bg-emerald-600"));

    const getDelay = (element: HTMLElement) => {
      const transitionAttribute = element.getAttribute("data-transition");
      const transition = JSON.parse(transitionAttribute || "{}");
      return transition.delay;
    };

    // Assert: Verify that transition delays follow a cascading pattern.
    expect(getDelay(steps[0])).toBeCloseTo(0.9);

    expect(getDelay(steps[1])).toBeCloseTo(0.6);

    expect(getDelay(lines[0])).toBeCloseTo(0.6);

    expect(getDelay(lines[1])).toBeCloseTo(0.3);
  });
});
