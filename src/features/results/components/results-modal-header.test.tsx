import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ResultsModalHeader } from "@/features/results/components/results-modal-header";

type ResultsModalHeaderProps = React.ComponentProps<typeof ResultsModalHeader>;
type ActiveImageType = ResultsModalHeaderProps["activeImage"];

interface LocalDetection {
  status: "model_generated" | "user_confirmed" | "user_edited_confirmed" | "user_created";
}

interface LocalImageFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  dateUploaded: string | Date;
  detections: LocalDetection[];
  version: number;
}

// Mock framer-motion to simplify the component tree and focus on functional output rather than animations.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock utility functions to provide stable, predictable formatting for file metadata.
vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return {
    ...actual,
    formatBytes: vi.fn((bytes) => `${bytes} B`),
  };
});

// Mock the Dialog components from the UI library to inspect how titles and descriptions are structured.
vi.mock("@/components/ui/dialog", () => ({
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-header" className={className}>
      {children}
    </div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  DialogDescription: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

// Mock the Button component to capture user click events and verify accessibility labels.
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

// Mock Lucide icons used for closing actions.
vi.mock("react-icons/lu", () => ({
  LuX: () => <span data-testid="icon-close" />,
}));

// Mock Go icons used for displaying verification statuses.
vi.mock("react-icons/go", () => ({
  GoVerified: ({ className }: { className?: string }) => (
    <span data-testid="status-icon-verified" className={className} />
  ),
  GoUnverified: ({ className }: { className?: string }) => (
    <span data-testid="status-icon-unverified" className={className} />
  ),
}));

// Mock Phosphor icons used for showing progress and warning indicators.
vi.mock("react-icons/pi", () => ({
  PiSealPercent: ({ className }: { className?: string }) => (
    <span data-testid="status-icon-progress" className={className} />
  ),
  PiSealWarning: ({ className }: { className?: string }) => (
    <span data-testid="status-icon-warning" className={className} />
  ),
}));

const mockImage: LocalImageFile = {
  id: "img-1",
  name: "Test Image.jpg",
  url: "http://example.com/image.jpg",
  size: 1024,
  type: "image/jpeg",
  dateUploaded: new Date("2025-01-01").toISOString(),
  detections: [],
  version: 1,
};

/**
 * Test suite for the `ResultsModalHeader` component.
 */
describe("ResultsModalHeader", () => {
  const defaultProps = {
    activeImage: mockImage as unknown as ActiveImageType,
    imageDimensions: { width: 800, height: 600 },
    isMobile: false,
    onClose: vi.fn(),
    variants: {},
  };

  /**
   * Test case to verify the default desktop header contains image name, date, dimensions, and size.
   */
  it("renders the standard desktop header correctly", () => {
    // Arrange: Render the header with standard props.
    render(<ResultsModalHeader {...defaultProps} />);

    // Assert: Verify that all expected metadata fields are present in the document.
    expect(screen.getByText("Test Image.jpg")).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument();
    expect(screen.getByText("800 x 600")).toBeInTheDocument();
    expect(screen.getByText("1024 B")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the mobile layout displays the title and provides a accessible close button.
   */
  it("renders the mobile floating header correctly", () => {
    // Arrange: Render the header in mobile mode.
    render(<ResultsModalHeader {...defaultProps} isMobile={true} />);

    // Assert: Verify that the image title is rendered.
    const titles = screen.getAllByText("Test Image.jpg");
    expect(titles.length).toBeGreaterThan(0);

    // Assert: Verify that the close button and icon are accessible.
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
    expect(screen.getByTestId("icon-close")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `onClose` callback is executed when clicking the mobile close button.
   */
  it("calls onClose when the close button is clicked (mobile)", async () => {
    // Arrange: Setup user interaction and render the mobile header.
    const user = userEvent.setup();
    render(<ResultsModalHeader {...defaultProps} isMobile={true} />);

    // Act: Simulate a click on the close button.
    const closeBtn = screen.getByLabelText("Close");
    await user.click(closeBtn);

    // Assert: Verify the callback was called once.
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Sub-suite for testing the logic that determines header styling and icons based on detection statuses.
   */
  describe("Verification Status Logic", () => {
    /**
     * Test case to verify the warning state when no detections have been found.
     */
    it("displays 'No Detections' icon/style when detections array is empty", () => {
      // Arrange: Modify mock data to have zero detections.
      const imageNoDetections: LocalImageFile = { ...mockImage, detections: [] };
      render(
        <ResultsModalHeader
          {...defaultProps}
          activeImage={imageNoDetections as unknown as ActiveImageType}
        />
      );

      // Assert: Verify the warning icon and specific CSS class for empty states.
      expect(screen.getByTestId("status-icon-warning")).toBeInTheDocument();
      const title = screen.getByRole("heading", { level: 2 });
      expect(title).toHaveClass("text-rose-500");
    });

    /**
     * Test case to verify the emerald styling when all detections are user-verified.
     */
    it("displays 'Verified' icon/style when all detections are verified", () => {
      // Arrange: Setup detections with confirmed statuses.
      const imageVerified: LocalImageFile = {
        ...mockImage,
        detections: [{ status: "user_confirmed" }, { status: "user_edited_confirmed" }],
      };
      render(
        <ResultsModalHeader
          {...defaultProps}
          activeImage={imageVerified as unknown as ActiveImageType}
        />
      );

      // Assert: Verify the verification icon and green theme.
      expect(screen.getByTestId("status-icon-verified")).toBeInTheDocument();
      const title = screen.getByRole("heading", { level: 2 });
      expect(title).toHaveClass("text-emerald-600");
    });

    /**
     * Test case to verify the amber styling when detections remain in model-generated state.
     */
    it("displays 'Unverified' icon/style when all detections are model_generated", () => {
      // Arrange: Setup detections with model-only statuses.
      const imageUnverified: LocalImageFile = {
        ...mockImage,
        detections: [{ status: "model_generated" }, { status: "model_generated" }],
      };
      render(
        <ResultsModalHeader
          {...defaultProps}
          activeImage={imageUnverified as unknown as ActiveImageType}
        />
      );

      // Assert: Verify the unverified icon and amber theme.
      expect(screen.getByTestId("status-icon-unverified")).toBeInTheDocument();
      const title = screen.getByRole("heading", { level: 2 });
      expect(title).toHaveClass("text-amber-500");
    });

    /**
     * Test case to verify the sky-blue styling when some detections are verified and some are not.
     */
    it("displays 'In Progress' icon/style when mixed status", () => {
      // Arrange: Setup a mix of model-generated and verified detections.
      const imageInProgress: LocalImageFile = {
        ...mockImage,
        detections: [{ status: "model_generated" }, { status: "user_confirmed" }],
      };
      render(
        <ResultsModalHeader
          {...defaultProps}
          activeImage={imageInProgress as unknown as ActiveImageType}
        />
      );

      // Assert: Verify the progress icon and sky-blue theme.
      expect(screen.getByTestId("status-icon-progress")).toBeInTheDocument();
      const title = screen.getByRole("heading", { level: 2 });
      expect(title).toHaveClass("text-sky-600");
    });
  });

  /**
   * Test case to verify component stability when image resolution metadata is unavailable.
   */
  it("handles missing image dimensions gracefully", () => {
    // Arrange: Provide null for the `imageDimensions` prop.
    render(<ResultsModalHeader {...defaultProps} imageDimensions={null} />);

    // Assert: Verify other metadata is rendered but the dimension string is absent.
    expect(screen.getByText("1024 B")).toBeInTheDocument();
    expect(screen.queryByText(/x/)).not.toBeInTheDocument();
  });
});
