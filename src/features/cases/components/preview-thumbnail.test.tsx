import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { PreviewThumbnail } from "@/features/cases/components/preview-thumbnail";

// Mock the framer-motion library to replace the motion.div component with a static div for testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: React.ComponentProps<"div">) => (
      <div data-testid="motion-div" className={className}>
        {children}
      </div>
    ),
  },
}));

// Mock the Next.js Image component to use a standard <img> tag for testing purposes.
vi.mock("next/image", () => ({
  default: ({ src, alt }: React.ComponentProps<"img">) =>
    React.createElement("img", { src, alt, "data-testid": "next-image" }),
}));

// Defines a mock File object representing a local image file.
const mockFileObject = new File(["dummy content"], "test.png", { type: "image/png" });

// Defines a mock object for a remote file, which has a static URL and version for cache busting.
const remoteFile = {
  id: "1",
  url: "https://example.com/image.jpg",
  version: 5,
  name: "image.jpg",
  file: null,
  status: "success",
} as unknown as UploadableFile;

// Defines a mock object for a local file, which has a File object and no URL yet.
const localFile = {
  id: "2",
  url: undefined,
  version: 0,
  name: "local.png",
  file: mockFileObject,
  status: "pending",
} as unknown as UploadableFile;

/**
 * Test suite for the `PreviewThumbnail` component.
 */
describe("PreviewThumbnail", () => {
  // Stores the original global URL object for restoration after tests.
  const originalURL = global.URL;
  // Mock function for creating a local object URL from a File object.
  const createObjectURLMock = vi.fn();
  // Mock function for revoking a local object URL.
  const revokeObjectURLMock = vi.fn();

  // Setup for mocking global URL functions before each test.
  beforeEach(() => {
    // Arrange: Clear all previous mock calls.
    vi.clearAllMocks();

    // Arrange: Replace the global URL implementation with mocks.
    global.URL = {
      ...originalURL,
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    } as unknown as typeof URL;

    // Arrange: Configure the mock to return a predictable URL string.
    createObjectURLMock.mockReturnValue("blob:mock-url");
  });

  // Teardown to restore the original global URL object after each test.
  afterEach(() => {
    global.URL = originalURL;
  });

  /**
   * Test case to verify that a remote file URL is rendered directly from the presigned URL.
   */
  it("renders a remote URL directly without cache busting", () => {
    // Arrange: Render the component with a remote file object.
    render(
      <PreviewThumbnail
        uploadableFile={remoteFile}
        onClick={vi.fn()}
        isActive={false}
        isMobile={false}
      />
    );

    // Assert: Check if the rendered image element has the correct URL without a version query parameter.
    const image = screen.getByTestId("next-image");
    expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
    // Assert: Verify that the image has the correct descriptive `alt` attribute.
    expect(image).toHaveAttribute("alt", "Thumbnail of image.jpg");
  });

  /**
   * Test case to verify that a local file object is converted to a blob URL using `createObjectURL`.
   */
  it("renders a local file using createObjectURL", () => {
    // Arrange: Render the component with a local file object.
    render(
      <PreviewThumbnail
        uploadableFile={localFile}
        onClick={vi.fn()}
        isActive={false}
        isMobile={false}
      />
    );

    // Assert: Check that `createObjectURL` was called with the local `File` object.
    const image = screen.getByTestId("next-image");
    expect(createObjectURLMock).toHaveBeenCalledWith(mockFileObject);
    // Assert: Verify that the image source is the mock blob URL.
    expect(image).toHaveAttribute("src", "blob:mock-url");
  });

  /**
   * Test case to verify that the temporary object URL is revoked when the component unmounts.
   */
  it("revokes the object URL when unmounted", () => {
    // Arrange: Render the component with a local file.
    const { unmount } = render(
      <PreviewThumbnail
        uploadableFile={localFile}
        onClick={vi.fn()}
        isActive={false}
        isMobile={false}
      />
    );

    // Act: Unmount the component to trigger cleanup effects.
    unmount();
    // Assert: Check that `revokeObjectURL` was called with the generated mock URL.
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
  });

  /**
   * Test case to verify that the `onClick` prop is executed when the thumbnail is clicked.
   */
  it("calls onClick when clicked", async () => {
    // Arrange: Create a mock click handler and user event setup.
    const onClickMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component with the mock click handler.
    render(
      <PreviewThumbnail
        uploadableFile={remoteFile}
        onClick={onClickMock}
        isActive={false}
        isMobile={false}
      />
    );

    // Act: Click the button element.
    const button = screen.getByRole("button", { name: "View image.jpg" });
    await user.click(button);

    // Assert: Verify that the mock click handler was called exactly once.
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the button is disabled and `onClick` is not called when `isActive` is true.
   */
  it("is disabled when active (isActive=true)", async () => {
    // Arrange: Create a mock click handler and user event setup.
    const onClickMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component with `isActive` set to true.
    render(
      <PreviewThumbnail
        uploadableFile={remoteFile}
        onClick={onClickMock}
        isActive={true}
        isMobile={false}
      />
    );

    // Assert: Check that the button element is disabled.
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    // Act: Attempt to click the disabled button.
    await user.click(button);
    // Assert: Verify that the mock click handler was not called.
    expect(onClickMock).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the correct 'active' styling classes are applied for the desktop view.
   */
  it("applies active styles for Desktop", () => {
    // Arrange: Render the component with `isActive=true` and `isMobile=false`.
    render(
      <PreviewThumbnail
        uploadableFile={remoteFile}
        onClick={vi.fn()}
        isActive={true}
        isMobile={false}
      />
    );

    // Assert: Check that the button element includes the specific desktop active ring classes.
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ring-2", "ring-emerald-500", "ring-offset-background");
  });

  /**
   * Test case to verify that the correct 'active' styling classes are applied for the mobile view.
   */
  it("applies active styles for Mobile", () => {
    // Arrange: Render the component with `isActive=true` and `isMobile=true`.
    render(
      <PreviewThumbnail
        uploadableFile={remoteFile}
        onClick={vi.fn()}
        isActive={true}
        isMobile={true}
      />
    );

    // Assert: Check that the button element includes the specific mobile active ring class.
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ring-amber-400");
    // Assert: Check that the desktop-specific active class is not applied.
    expect(button).not.toHaveClass("ring-emerald-500");
  });

  /**
   * Test case to verify that a skeleton loader is rendered when no preview URL is available.
   */
  it("renders a skeleton if no preview URL can be generated", () => {
    // Arrange: Create a file object that lacks both `url` and `file` for preview generation.
    const emptyFile = {
      ...remoteFile,
      url: undefined,
      file: undefined,
    } as unknown as UploadableFile;

    // Arrange: Render the component with the empty file object.
    const { container } = render(
      <PreviewThumbnail
        uploadableFile={emptyFile}
        onClick={vi.fn()}
        isActive={false}
        isMobile={false}
      />
    );

    // Assert: Check that the mock `Next/Image` element is not present.
    expect(screen.queryByTestId("next-image")).not.toBeInTheDocument();
    // Assert: Check that the component's root element has the `animate-pulse` class, indicating a skeleton state.
    expect(container.firstChild).toHaveClass("animate-pulse");
  });
});
