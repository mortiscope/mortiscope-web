import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { SupportedFormatsModal } from "@/features/cases/components/supported-formats-modal";

// Mock the Dialog primitives to isolate modal structure and control open state.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
}));

// Mock `framer-motion` components.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: React.ComponentProps<"div">) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock various icon components used in the format list.
vi.mock("react-icons/io5", () => ({
  IoImagesOutline: () => <svg data-testid="icon-jpg" />,
  IoLayersOutline: () => <svg data-testid="icon-png" />,
  IoPhonePortraitOutline: () => <svg data-testid="icon-heic" />,
}));

vi.mock("react-icons/pi", () => ({
  PiGlobeStand: () => <svg data-testid="icon-webp" />,
  PiSealPercent: () => <svg />,
  PiSealWarning: () => <svg />,
}));

/**
 * Test suite for the `SupportedFormatsModal` component.
 */
describe("SupportedFormatsModal", () => {
  /**
   * Test case to verify that the modal renders nothing when closed.
   */
  it("renders nothing when isOpen is false", () => {
    // Arrange: Render the modal in a closed state.
    render(<SupportedFormatsModal isOpen={false} onOpenChange={vi.fn()} />);
    // Assert: Check that the mocked dialog root is not present.
    expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the main structural elements, title, and description are rendered when open.
   */
  it("renders the modal content when isOpen is true", () => {
    // Arrange: Render the modal in an open state.
    render(<SupportedFormatsModal isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check for the presence of the dialog content container.
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    // Assert: Check for the main title heading.
    expect(screen.getByRole("heading", { name: /Supported File Formats/i })).toBeInTheDocument();
    // Assert: Check for the descriptive text.
    expect(
      screen.getByText(/Please upload an image in one of the approved formats/i)
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that all supported formats and their descriptions are listed.
   */
  it("renders the list of supported formats with descriptions", () => {
    // Arrange: Render the modal.
    render(<SupportedFormatsModal isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check for the name of each supported format.
    expect(screen.getByText("JPEG / JPG")).toBeInTheDocument();
    expect(screen.getByText("PNG")).toBeInTheDocument();
    expect(screen.getByText("WebP")).toBeInTheDocument();
    expect(screen.getByText("HEIF / HEIC")).toBeInTheDocument();

    // Assert: Check for key phrases in the description of compressed and lossless formats.
    expect(
      screen.getByText(/widely supported format using lossy compression/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/lossless compression format that preserves all original/i)
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify that the correct icon is rendered next to each supported format.
   */
  it("renders the correct icons for each format", () => {
    // Arrange: Render the modal.
    render(<SupportedFormatsModal isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check for the presence of the mock icon for each format.
    expect(screen.getByTestId("icon-jpg")).toBeInTheDocument();
    expect(screen.getByTestId("icon-png")).toBeInTheDocument();
    expect(screen.getByTestId("icon-webp")).toBeInTheDocument();
    expect(screen.getByTestId("icon-heic")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the "Got It" button closes the modal by calling `onOpenChange(false)`.
   */
  it("calls onOpenChange(false) when the 'Got It' button is clicked", async () => {
    // Arrange: Define a spy for the open change callback and set up user events.
    const onOpenChangeMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the modal.
    render(<SupportedFormatsModal isOpen={true} onOpenChange={onOpenChangeMock} />);

    // Act: Click the close button.
    const closeButton = screen.getByRole("button", { name: /Got It/i });
    await user.click(closeButton);

    // Assert: Check that the mock function was called exactly once with `false`.
    expect(onOpenChangeMock).toHaveBeenCalledTimes(1);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
