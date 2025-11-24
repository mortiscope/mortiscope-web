import { render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { UploadThumbnail } from "@/features/upload/components/upload-thumbnail";

// Mock the Next.js Image component to replace it with a standard HTML img tag for testing.
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", {
      src,
      alt,
      "data-testid": "upload-thumbnail-image",
      ...props,
    }),
}));

/**
 * Test suite for the UploadThumbnail component.
 */
describe("UploadThumbnail", () => {
  // Mock functions for global URL methods used to handle local file previews.
  const mockCreateObjectURL = vi.fn();
  const mockRevokeObjectURL = vi.fn();

  // Setup mock implementations for global URL methods before each test.
  beforeEach(() => {
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
    // Always return a consistent mock blob URL for local files.
    mockCreateObjectURL.mockReturnValue("blob:mock-url");
  });

  // Clear all mock function call history after each test for isolation.
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Arrange: Define a base `UploadableFile` object to be extended in test cases.
  const baseFile: UploadableFile = {
    id: "1",
    name: "test.jpg",
    size: 1024,
    type: "image/jpeg",
    status: "success",
    progress: 100,
    source: "upload",
    dateUploaded: new Date(),
    version: 1,
    key: "key-1",
    file: undefined,
    url: "",
  };

  /**
   * Test case to verify that a skeleton loader is displayed when no image source is available.
   */
  it("renders a skeleton loader when no URL is available", () => {
    // Arrange: Create a file object lacking both a remote `url` and a local `file`.
    const emptyFile = { ...baseFile, url: "", file: undefined };
    // Act: Render the component.
    const { container } = render(<UploadThumbnail uploadableFile={emptyFile as UploadableFile} />);

    // Assert: Check that the image mock is not in the document.
    expect(screen.queryByTestId("upload-thumbnail-image")).not.toBeInTheDocument();
    // Assert: Check that the container div has the expected background class for a skeleton.
    expect(container.firstChild).toHaveClass("bg-slate-200");
  });

  /**
   * Test case to verify that an image is rendered correctly from a remote URL.
   */
  it("renders an image from a remote URL directly", () => {
    // Arrange: Create a file object with a remote URL and a specific version number.
    const remoteFile = {
      ...baseFile,
      url: "https://example.com/image.jpg",
      version: 5,
    };

    // Act: Render the component.
    render(<UploadThumbnail uploadableFile={remoteFile as UploadableFile} />);

    // Assert: Retrieve the rendered image element.
    const img = screen.getByTestId("upload-thumbnail-image");
    expect(img).toBeInTheDocument();
    // Assert: Check that the `src` attribute uses the URL directly without cache-busting.
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    // Assert: Check that the `alt` attribute is correctly constructed from the file name.
    expect(img).toHaveAttribute("alt", "Preview of test.jpg");
  });

  /**
   * Test case to verify that a local `File` object is correctly converted to a blob URL for display.
   */
  it("renders an image from a local File object", () => {
    // Arrange: Create a file object containing a local `File` instance.
    const localFile = {
      ...baseFile,
      file: new File([""], "local.jpg", { type: "image/jpeg" }),
      url: "",
    };

    // Act: Render the component.
    render(<UploadThumbnail uploadableFile={localFile as UploadableFile} />);

    // Assert: Retrieve the rendered image element.
    const img = screen.getByTestId("upload-thumbnail-image");
    expect(img).toBeInTheDocument();
    // Assert: Check that the image `src` uses the mock blob URL returned by `createObjectURL`.
    expect(img).toHaveAttribute("src", "blob:mock-url");
    // Assert: Check that `createObjectURL` was called exactly once with the local file object.
    expect(mockCreateObjectURL).toHaveBeenCalledWith(localFile.file);
  });

  /**
   * Test case to verify that `URL.revokeObjectURL` is called on component unmount.
   */
  it("revokes the object URL on unmount", () => {
    // Arrange: Create a file object containing a local `File` instance to trigger URL creation.
    const localFile = {
      ...baseFile,
      file: new File([""], "local.jpg", { type: "image/jpeg" }),
      url: "",
    };

    // Act: Render the component and capture the unmount function.
    const { unmount } = render(<UploadThumbnail uploadableFile={localFile as UploadableFile} />);

    // Act: Simulate component removal from the DOM.
    unmount();

    // Assert: Check that `revokeObjectURL` was called with the mock URL generated during mount.
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  /**
   * Test case to verify that custom class names are correctly applied to the thumbnail container.
   */
  it("applies custom classNames to the container", () => {
    // Arrange: Use a file that will successfully render an image.
    const remoteFile = {
      ...baseFile,
      url: "https://example.com/image.jpg",
    };

    // Act: Render the component with custom `className` prop.
    const { container } = render(
      <UploadThumbnail uploadableFile={remoteFile as UploadableFile} className="h-full w-full" />
    );

    // Assert: Check that the root element of the component contains the custom class names.
    expect(container.firstChild).toHaveClass("h-full");
    expect(container.firstChild).toHaveClass("w-full");
  });
});
