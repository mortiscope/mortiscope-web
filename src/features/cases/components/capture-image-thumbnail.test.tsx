import React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { UploadableFile } from "@/features/analyze/store/analyze-store";
import { CaptureImageThumbnail } from "@/features/cases/components/capture-image-thumbnail";

// Mock the `framer-motion` components to simplify the DOM structure and animation.
vi.mock("framer-motion", () => ({
  motion: {
    // Arrange: Mock `motion.div` as a standard div, passing children and props.
    div: ({ children, className, ...props }: React.ComponentProps<"div">) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Arrange: Define a mock `File` object for testing image rendering.
const mockFile = new File(["dummy content"], "test-image.jpg", { type: "image/jpeg" });

// Arrange: Define a mock `UploadableFile` object that wraps the `File` object and includes metadata.
const mockUploadableFile = {
  id: "test-id",
  file: mockFile,
  key: "mock-key",
  url: "mock-url",
  name: "test-image.jpg",
  size: 1024,
  status: "pending",
  progress: 0,
} as unknown as UploadableFile;

// Arrange: Define a standard set of props used across all test cases.
const defaultProps = {
  uploadableFile: mockUploadableFile,
  onRemove: vi.fn(),
  isMobile: false,
  isDeleting: false,
};

/**
 * Test suite for the `CaptureImageThumbnail` component.
 */
describe("CaptureImageThumbnail", () => {
  // Arrange: Store the original global URL methods for restoration.
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;

  // Set up global mock behavior for URL methods before any test runs.
  beforeAll(() => {
    // Arrange: Mock `createObjectURL` to return a predictable string for testing the `src` attribute.
    global.URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
    // Arrange: Mock `revokeObjectURL` to track cleanup calls.
    global.URL.revokeObjectURL = vi.fn();
  });

  // Restore global mock behavior after all tests have completed.
  afterAll(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  /**
   * Test case to verify that the image is rendered using the dynamically generated object URL.
   */
  it("renders the image with the generated preview URL", async () => {
    // Arrange/Act: Render the component.
    render(<CaptureImageThumbnail {...defaultProps} />);

    // Assert: Find the image element by role and name, ensuring it is in the document.
    const image = await screen.findByRole("img", { name: "Captured: test-image.jpg" });

    expect(image).toBeInTheDocument();
    // Assert: Verify the image `src` attribute matches the mock URL.
    expect(image).toHaveAttribute("src", "blob:mock-preview-url");
    // Assert: Verify that `createObjectURL` was called with the raw mock `File` object.
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile);
  });

  /**
   * Test case to ensure the `onRemove` prop callback is executed when the delete button is clicked.
   */
  it("calls onRemove when the delete button is clicked", async () => {
    // Arrange: Initialize user event simulation.
    const user = userEvent.setup();
    // Arrange/Act: Render the component.
    render(<CaptureImageThumbnail {...defaultProps} />);

    // Arrange: Wait for the image to render before interacting with controls.
    await screen.findByRole("img");

    // Act: Find the delete button and click it.
    const deleteButton = screen.getByLabelText("Remove test-image.jpg");
    await user.click(deleteButton);

    // Assert: Verify the `onRemove` prop function was called once.
    expect(defaultProps.onRemove).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the UI provides visual feedback (spinner) and disables interaction during deletion.
   */
  it("shows a spinner and disables button when isDeleting is true", async () => {
    // Arrange/Act: Render the component with `isDeleting` set to true.
    const { container } = render(<CaptureImageThumbnail {...defaultProps} isDeleting={true} />);

    // Arrange: Wait for the image to render.
    await screen.findByRole("img");

    // Assert: Verify the delete button is disabled.
    const deleteButton = screen.getByLabelText("Remove test-image.jpg");
    expect(deleteButton).toBeDisabled();

    // Assert: Verify the presence of the loading spinner element.
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  /**
   * Test case to verify that mobile-specific styling is applied to the thumbnail wrapper.
   */
  it("applies mobile-specific styling ring when isMobile is true", async () => {
    // Arrange/Act: Render the component with `isMobile` set to true.
    const { container } = render(<CaptureImageThumbnail {...defaultProps} isMobile={true} />);

    // Arrange: Wait for the image to render.
    await screen.findByRole("img");

    // Assert: Check the root wrapper's class list for the mobile-specific ring styles.
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("ring-2", "ring-emerald-400/60");
  });

  /**
   * Test case to ensure the generated object URL is cleaned up when the component is unmounted.
   */
  it("revokes the object URL when the component unmounts", async () => {
    // Arrange/Act: Render the component and capture the unmount function.
    const { unmount } = render(<CaptureImageThumbnail {...defaultProps} />);

    // Arrange: Wait for the image to render (ensuring `createObjectURL` has been called).
    await screen.findByRole("img");

    // Act: Unmount the component.
    unmount();

    // Assert: Verify that `revokeObjectURL` was called with the generated mock URL.
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-preview-url");
  });
});
