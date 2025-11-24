import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/__tests__/setup/test-utils";
import { ImageCard } from "@/features/images/components/image-card";
import { type ImageFile } from "@/features/images/components/results-images";

interface MockImageProps {
  src: string;
  alt: string;
  className?: string;
}

// Mock Next.js Image component to render a standard img element for testing attributes.
vi.mock("next/image", () => ({
  default: ({ src, alt, className }: MockImageProps) =>
    React.createElement("img", {
      src,
      alt,
      className,
      "data-testid": "next-image",
    }),
}));

interface MockMotionProps {
  children: React.ReactNode;
  className?: string;
}

// Mock Framer Motion to avoid animation complexity during tests.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: MockMotionProps) => <div className={className}>{children}</div>,
  },
}));

// Mock icon components to provide stable test IDs for status verification.
vi.mock("react-icons/go", () => ({
  GoVerified: () => <div data-testid="icon-verified" />,
  GoUnverified: () => <div data-testid="icon-unverified" />,
}));
vi.mock("react-icons/pi", () => ({
  PiSealPercent: () => <div data-testid="icon-in-progress" />,
  PiSealWarning: () => <div data-testid="icon-no-detections" />,
}));
vi.mock("react-icons/md", () => ({ MdOutlineRemoveRedEye: () => <div /> }));
vi.mock("react-icons/hi2", () => ({ HiOutlinePencilSquare: () => <div /> }));
vi.mock("react-icons/lu", () => ({ LuDownload: () => <div />, LuTrash2: () => <div /> }));

const mockImageFile = {
  id: "image-1",
  name: "test-image.jpg",
  url: "https://example.com/image.jpg",
  version: 123,
  detections: [],
  dateUploaded: new Date(),
  type: "image/jpeg",
  size: 1000,
  userId: "user-1",
  key: "key-1",
} as unknown as ImageFile;

const defaultProps = {
  imageFile: mockImageFile,
  sortOption: "date-desc",
  onView: vi.fn(),
  onEdit: vi.fn(),
  onExport: vi.fn(),
  onDelete: vi.fn(),
};

/**
 * Test suite for the `ImageCard` component covering rendering, interactions, and status indicators.
 */
describe("ImageCard", () => {
  /**
   * Test case to verify that the image renders with the URL directly from presigned URL.
   */
  it("renders the image with the URL directly", () => {
    // Arrange: Render the component with default props.
    render(<ImageCard {...defaultProps} />);

    // Assert: Check that the image source is the URL directly and the alt text is correct.
    const img = screen.getByTestId("next-image");
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    expect(img).toHaveAttribute("alt", "Preview of test-image.jpg");
  });

  /**
   * Test case to verify that the image component is not rendered when the URL is missing.
   */
  it("renders skeleton loader when URL is missing", () => {
    // Arrange: Create an image object with an empty URL and render the component.
    const noUrlImage = { ...mockImageFile, url: "" };
    render(<ImageCard {...defaultProps} imageFile={noUrlImage} />);

    // Assert: Verify that the image element is not present in the DOM.
    expect(screen.queryByTestId("next-image")).toBeNull();
  });

  /**
   * Test case to verify that the onView callback is triggered when the card body is clicked.
   */
  it("triggers onView when main image area is clicked", () => {
    // Arrange: Render the component with default props.
    render(<ImageCard {...defaultProps} />);

    // Act: Locate the clickable parent container of the image and simulate a click.
    const img = screen.getByTestId("next-image");
    const clickableArea = img.parentElement?.parentElement;

    if (clickableArea) {
      fireEvent.click(clickableArea);
      // Assert: Verify that the onView prop was called with the correct image ID.
      expect(defaultProps.onView).toHaveBeenCalledWith("image-1");
    } else {
      throw new Error("Clickable area not found");
    }
  });

  /**
   * Test case to verify that action buttons trigger the correct callbacks.
   */
  it("triggers action callbacks correctly", () => {
    // Arrange: Render the component with default props.
    render(<ImageCard {...defaultProps} />);

    // Act: Click the View button.
    const viewButton = screen.getByLabelText("View test-image.jpg");
    fireEvent.click(viewButton);
    // Assert: Verify onView was called.
    expect(defaultProps.onView).toHaveBeenCalledWith("image-1");

    // Act: Click the Edit button.
    const editButton = screen.getByLabelText("Edit test-image.jpg");
    fireEvent.click(editButton);
    // Assert: Verify onEdit was called with the full image object.
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockImageFile);

    // Act: Click the Export/Download button.
    const exportButton = screen.getByLabelText("Download test-image.jpg");
    fireEvent.click(exportButton);
    // Assert: Verify onExport was called with the full image object.
    expect(defaultProps.onExport).toHaveBeenCalledWith(mockImageFile);

    // Act: Click the Delete button.
    const deleteButton = screen.getByLabelText("Delete test-image.jpg");
    fireEvent.click(deleteButton);
    // Assert: Verify onDelete was called with the full image object.
    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockImageFile);
  });

  /**
   * Nested suite for testing the visual status indicators based on detection properties.
   */
  describe("Verification Status", () => {
    /**
     * Test case to verify the 'no detections' icon renders when the detections list is empty.
     */
    it("shows 'no detections' icon when detections array is empty", () => {
      // Arrange: Render with an image that has an empty detections array.
      render(<ImageCard {...defaultProps} imageFile={{ ...mockImageFile, detections: [] }} />);
      // Assert: Check for the specific icon test ID.
      expect(screen.getByTestId("icon-no-detections")).toBeInTheDocument();
    });

    /**
     * Test case to verify the 'verified' icon renders when all detections are confirmed by the user.
     */
    it("shows 'verified' icon when all detections are user confirmed", () => {
      // Arrange: Render with detections that have confirmed statuses.
      const verifiedImage = {
        ...mockImageFile,
        detections: [{ status: "user_confirmed" }, { status: "user_edited_confirmed" }],
      } as unknown as ImageFile;

      render(<ImageCard {...defaultProps} imageFile={verifiedImage} />);
      // Assert: Check for the verified icon test ID.
      expect(screen.getByTestId("icon-verified")).toBeInTheDocument();
    });

    /**
     * Test case to verify the 'unverified' icon renders when all detections are purely model-generated.
     */
    it("shows 'unverified' icon when no detections are confirmed", () => {
      // Arrange: Render with detections that are only model generated.
      const unverifiedImage = {
        ...mockImageFile,
        detections: [{ status: "model_generated" }, { status: "model_generated" }],
      } as unknown as ImageFile;

      render(<ImageCard {...defaultProps} imageFile={unverifiedImage} />);
      // Assert: Check for the unverified icon test ID.
      expect(screen.getByTestId("icon-unverified")).toBeInTheDocument();
    });

    /**
     * Test case to verify the 'in progress' icon renders when there is a mix of confirmed and unconfirmed detections.
     */
    it("shows 'in progress' icon when mixed status", () => {
      // Arrange: Render with a mix of confirmed and model generated detections.
      const mixedImage = {
        ...mockImageFile,
        detections: [{ status: "user_confirmed" }, { status: "model_generated" }],
      } as unknown as ImageFile;

      render(<ImageCard {...defaultProps} imageFile={mixedImage} />);
      // Assert: Check for the in-progress icon test ID.
      expect(screen.getByTestId("icon-in-progress")).toBeInTheDocument();
    });

    /**
     * Test case to verify that undefined detections are handled safely by showing 'no detections'.
     */
    it("handles undefined detections gracefully", () => {
      // Arrange: Render with an image object where detections is undefined.
      const undefinedDetectionsImage = {
        ...mockImageFile,
        detections: undefined,
      } as unknown as ImageFile;

      render(<ImageCard {...defaultProps} imageFile={undefinedDetectionsImage} />);
      // Assert: Fallback to the no-detections icon.
      expect(screen.getByTestId("icon-no-detections")).toBeInTheDocument();
    });
  });
});
