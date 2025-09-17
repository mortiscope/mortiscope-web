import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { PreviewThumbnailList } from "@/features/cases/components/preview-thumbnail-list";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className, ...props }: React.ComponentProps<"div">) => (
      <div data-testid="motion-container" className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
  ScrollBar: () => <div data-testid="scroll-bar" />,
}));

vi.mock("@/features/cases/components/preview-thumbnail", () => ({
  PreviewThumbnail: ({
    uploadableFile,
    isActive,
    onClick,
  }: {
    uploadableFile: UploadableFile;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      data-testid="thumbnail"
      data-id={uploadableFile.id}
      data-active={isActive}
      onClick={onClick}
    >
      Thumbnail {uploadableFile.id}
    </button>
  ),
}));

const mockFiles = [
  { id: "1", file: { name: "image-1.jpg" } },
  { id: "2", file: { name: "image-1.jpg" } },
  { id: "3", file: { name: "image-3.jpg" } },
] as UploadableFile[];

const defaultProps = {
  sortedFiles: mockFiles,
  activeFile: mockFiles[0],
  isMobile: false,
  onSelectFile: vi.fn(),
  variants: {},
};

describe("PreviewThumbnailList", () => {
  it("renders all files in the list", () => {
    render(<PreviewThumbnailList {...defaultProps} />);

    const thumbnails = screen.getAllByTestId("thumbnail");
    expect(thumbnails).toHaveLength(3);
    expect(thumbnails[0]).toHaveTextContent("Thumbnail 1");
    expect(thumbnails[2]).toHaveTextContent("Thumbnail 3");
  });

  it("identifies the active file correctly", () => {
    render(<PreviewThumbnailList {...defaultProps} activeFile={mockFiles[1]} />);

    const thumbnails = screen.getAllByTestId("thumbnail");

    expect(thumbnails[0]).toHaveAttribute("data-active", "false");
    expect(thumbnails[1]).toHaveAttribute("data-active", "true");
    expect(thumbnails[2]).toHaveAttribute("data-active", "false");
  });

  it("calls onSelectFile when a thumbnail is clicked", async () => {
    const onSelectMock = vi.fn();
    const user = userEvent.setup();

    render(<PreviewThumbnailList {...defaultProps} onSelectFile={onSelectMock} />);

    const thumbnail3 = screen.getByText("Thumbnail 3");
    await user.click(thumbnail3);

    expect(onSelectMock).toHaveBeenCalledTimes(1);
    expect(onSelectMock).toHaveBeenCalledWith(mockFiles[2]);
  });

  it("applies mobile-specific styling classes when isMobile is true", () => {
    render(<PreviewThumbnailList {...defaultProps} isMobile={true} />);

    const container = screen.getByTestId("motion-container");
    expect(container).toHaveClass("absolute", "bottom-[88px]", "left-0", "z-10");
    expect(container).not.toHaveClass("px-6", "pt-2");
  });

  it("applies desktop-specific styling classes when isMobile is false", () => {
    render(<PreviewThumbnailList {...defaultProps} isMobile={false} />);

    const container = screen.getByTestId("motion-container");
    expect(container).toHaveClass("px-6", "pt-2");
    expect(container).not.toHaveClass("absolute", "bottom-[88px]");
  });

  it("renders the ScrollArea and ScrollBar", () => {
    render(<PreviewThumbnailList {...defaultProps} />);

    expect(screen.getByTestId("scroll-area")).toBeInTheDocument();
    expect(screen.getByTestId("scroll-bar")).toBeInTheDocument();
  });
});
