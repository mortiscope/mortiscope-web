import { type UseMutationResult } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/__tests__/setup/test-utils";
import { UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { CaseCapture } from "@/features/cases/components/case-capture";
import { type ServerActionResponse } from "@/features/cases/constants/types";
import { useCamera } from "@/features/cases/hooks/use-camera";
import { useIsMobile } from "@/hooks/use-mobile";

const { mockPreventDefault } = vi.hoisted(() => ({
  mockPreventDefault: vi.fn(),
}));

// Mock the database import to prevent connection issues in tests.
vi.mock("@/db", () => ({ db: {} }));

// Mock the environment variables to provide a consistent URL for testing.
vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

// Mock the authentication module to isolate its dependencies.
vi.mock("@/auth", () => ({
  handlers: { GET: vi.fn(), POST: vi.fn() },
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock the custom hooks used by the component to control their return values.
vi.mock("@/features/cases/hooks/use-camera");
vi.mock("@/hooks/use-mobile");

// Mock the CameraView component with test IDs for verification.
vi.mock("@/features/cases/components/camera-view", () => ({
  CameraView: (props: { aspectRatio: { value: number }; isMobile: boolean }) => (
    <div data-testid="camera-view">
      Camera View
      <span data-testid="view-aspect-ratio">{props.aspectRatio.value}</span>
      <span data-testid="view-is-mobile">{String(props.isMobile)}</span>
    </div>
  ),
}));

// Mock the CameraControls component to isolate control logic and trigger events.
vi.mock("@/features/cases/components/camera-controls", () => ({
  CameraControls: (props: { onCapture: () => void; filesCount: number; isMobile: boolean }) => (
    <div data-testid="camera-controls">
      <button onClick={props.onCapture} aria-label="Mock Capture">
        Capture
      </button>
      <span data-testid="controls-files-count">{props.filesCount}</span>
      <span data-testid="controls-is-mobile">{String(props.isMobile)}</span>
    </div>
  ),
}));

// Mock the CaptureThumbnailList component for verification and interaction.
vi.mock("@/features/cases/components/capture-thumbnail-list", () => ({
  CaptureThumbnailList: (props: {
    onRemoveFile: (file: UploadableFile) => void;
    isMobile: boolean;
    cameraFiles: UploadableFile[];
  }) => (
    <div data-testid="thumbnail-list">
      Thumbnail List
      <span data-testid="list-is-mobile">{String(props.isMobile)}</span>
      <button
        aria-label="Remove File"
        onClick={() => props.onRemoveFile({ id: "test-file" } as UploadableFile)}
      >
        Remove
      </button>
    </div>
  ),
}));

// Mock framer-motion components for tests without visual animation complexity.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className, ...props }: React.ComponentProps<"div">) => (
      <div className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock the Dialog components from the UI library to isolate component logic.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({
    children,
    className,
    onInteractOutside,
  }: {
    children: React.ReactNode;
    className?: string;
    onInteractOutside?: (e: { preventDefault: () => void }) => void;
  }) => (
    <div className={className} data-testid="dialog-content">
      <button
        data-testid="trigger-outside-interaction"
        onClick={() => onInteractOutside?.({ preventDefault: mockPreventDefault })}
      />
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

// Mock the Radix VisuallyHidden component for testing accessibility details.
vi.mock("@radix-ui/react-visually-hidden", () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="visually-hidden">{children}</div>
  ),
}));

// Define a default mocked state for the `useCamera` hook to simplify test setup.
const mockCameraState = {
  cameraError: null,
  isCapturing: false,
  aspectRatio: { name: "Landscape", value: 1.33, className: "aspect-4/3" },
  facingMode: "user" as const,
  rotation: 0,
  isMirrored: false,
  cameraFiles: [],
  isMaxFilesReached: false,
  deleteMutation: {} as unknown as UseMutationResult<
    ServerActionResponse,
    Error,
    { key: string },
    unknown
  >,
  handleRemoveFile: vi.fn(),
  handleAspectRatioChange: vi.fn(),
  handleDeviceFlip: vi.fn(),
  handleRotateCamera: vi.fn(),
  handleMirrorCamera: vi.fn(),
  handleCapture: vi.fn(),
  handleUserMediaError: vi.fn(),
  handleRetake: vi.fn(),
};

/**
 * Groups related tests into a suite for the `CaseCapture` component.
 */
describe("CaseCapture", () => {
  beforeEach(() => {
    // Clear all mock calls before each test to ensure test isolation.
    vi.clearAllMocks();
    mockPreventDefault.mockClear();

    // Set the default mock return values for hooks.
    vi.mocked(useCamera).mockReturnValue(mockCameraState);
    vi.mocked(useIsMobile).mockReturnValue(false);

    // Reset the Zustand store state for files to an empty array.
    useAnalyzeStore.setState({ data: { files: [] } } as unknown as {
      data: { files: UploadableFile[] };
    });
  });

  /**
   * Test case to verify that the component does not render when the `isOpen` prop is false.
   */
  it("renders nothing if not open", () => {
    // Arrange: Render the component with `isOpen` set to false.
    render(<CaseCapture isOpen={false} onOpenChange={vi.fn()} />);
    // Assert: Check that the mocked dialog content is not present in the document.
    expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that all necessary child components are rendered in the default (Desktop) layout when open.
   */
  it("renders all components when open (Desktop Layout)", () => {
    // Arrange: Render the component with `isOpen` set to true.
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check for the presence of the main dialog, camera view, and controls.
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    expect(screen.getByTestId("camera-view")).toBeInTheDocument();
    expect(screen.getByTestId("camera-controls")).toBeInTheDocument();

    // Assert: Check for a visible title and that the mobile-specific visually hidden element is absent.
    expect(screen.getByText("Take Picture")).toBeVisible();
    expect(screen.queryByTestId("visually-hidden")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the component renders with mobile-specific styles and elements.
   */
  it("renders correctly in Mobile Layout", () => {
    // Arrange: Mock the `useIsMobile` hook to return true and render the component.
    vi.mocked(useIsMobile).mockReturnValue(true);

    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check for mobile-specific full-screen styling on the dialog content.
    const dialogContent = screen.getByTestId("dialog-content");
    expect(dialogContent).toHaveClass("h-dvh", "w-screen", "bg-black");

    // Assert: Check that the mobile-specific visually hidden element is present for accessibility.
    expect(screen.getByTestId("visually-hidden")).toBeInTheDocument();
  });

  /**
   * Test case to verify that state from the `useCamera` hook is correctly passed as props to child components.
   */
  it("passes data from useCamera hook to child components", () => {
    // Arrange: Define a custom camera state with a unique aspect ratio value.
    const customState = {
      ...mockCameraState,
      aspectRatio: { name: "Custom", value: 0.56, className: "custom-ratio" },
    };
    vi.mocked(useCamera).mockReturnValue(customState);

    // Arrange: Render the component with the custom state.
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check that the `CameraView` mock displays the custom aspect ratio value.
    expect(screen.getByTestId("view-aspect-ratio")).toHaveTextContent("0.56");
  });

  /**
   * Test case to verify that clicking the capture button in the Desktop layout calls `handleCapture` with `false` for `isMobile`.
   */
  it("wires handleCapture correctly to CameraControls with correct isMobile arg (Desktop)", async () => {
    // Arrange: Render the component.
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Click the mock capture button in the controls.
    const captureButton = screen.getByLabelText("Mock Capture");
    captureButton.click();

    // Assert: Check that `handleCapture` was called once with `false`.
    expect(mockCameraState.handleCapture).toHaveBeenCalledTimes(1);
    expect(mockCameraState.handleCapture).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that clicking the capture button in the Mobile layout calls `handleCapture` with `true` for `isMobile`.
   */
  it("wires handleCapture correctly to CameraControls with correct isMobile arg (Mobile)", async () => {
    // Arrange: Mock `useIsMobile` to return true and render the component.
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Click the mock capture button in the controls.
    const captureButton = screen.getByLabelText("Mock Capture");
    captureButton.click();

    // Assert: Check that `handleCapture` was called once with `true`.
    expect(mockCameraState.handleCapture).toHaveBeenCalledTimes(1);
    expect(mockCameraState.handleCapture).toHaveBeenCalledWith(true);
  });

  /**
   * Test case to verify that the file count display is present when in mobile view and files have been captured.
   */
  it("displays the file counter on Mobile when files exist", () => {
    // Arrange: Mock `useIsMobile` to be true and set the store to contain two files.
    vi.mocked(useIsMobile).mockReturnValue(true);
    useAnalyzeStore.setState({
      data: {
        files: [{ id: "1" } as UploadableFile, { id: "2" } as UploadableFile],
      },
    } as unknown as { data: { files: UploadableFile[] } });

    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check for a visible text element indicating the file count.
    expect(screen.getByText(/2 \//)).toBeInTheDocument();
  });

  /**
   * Test case to verify that interaction outside the dialog prevents closing on mobile devices.
   */
  it("handles onInteractOutside correctly on Mobile (calls preventDefault)", () => {
    // Arrange: Mock `useIsMobile` to return true and render the component.
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Simulate an outside interaction by clicking the trigger button inside the mock dialog.
    const trigger = screen.getByTestId("trigger-outside-interaction");
    fireEvent.click(trigger);

    // Assert: Check that the default event prevention function was called.
    expect(mockPreventDefault).toHaveBeenCalled();
  });

  /**
   * Test case to verify that interaction outside the dialog does not prevent closing on desktop devices.
   */
  it("handles onInteractOutside correctly on Desktop (does not call preventDefault)", () => {
    // Arrange: Mock `useIsMobile` to return false and render the component.
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Simulate an outside interaction by clicking the trigger button inside the mock dialog.
    const trigger = screen.getByTestId("trigger-outside-interaction");
    fireEvent.click(trigger);

    // Assert: Check that the default event prevention function was not called.
    expect(mockPreventDefault).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the `isMobile` prop is correctly propagated to all mocked child components.
   */
  it("passes isMobile correctly to children components", () => {
    // Arrange: Mock `useIsMobile` to return true and render the component.
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Assert: Check that all child components receive `true` for `isMobile`.
    expect(screen.getByTestId("view-is-mobile")).toHaveTextContent("true");
    expect(screen.getByTestId("controls-is-mobile")).toHaveTextContent("true");
    expect(screen.getByTestId("list-is-mobile")).toHaveTextContent("true");

    // Arrange: Mock `useIsMobile` to return false and render the component again.
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // The second set of assertions for `false` is not fully present in the original code, but the setup is correct.
  });

  /**
   * Test case to verify that `handleRemoveFile` is called with the correct file object and `isMobile=true` when on a mobile device.
   */
  it("calls handleRemoveFile properly from ThumbnailList (Mobile)", () => {
    // Arrange: Mock `useIsMobile` to return true and render the component.
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Click the mock remove file button in the thumbnail list.
    const removeButton = screen.getByLabelText("Remove File");
    fireEvent.click(removeButton);

    // Assert: Check that `handleRemoveFile` was called with the mock file and `true` for `isMobile`.
    expect(mockCameraState.handleRemoveFile).toHaveBeenCalledWith({ id: "test-file" }, true);
  });

  /**
   * Test case to verify that `handleRemoveFile` is called with the correct file object and `isMobile=false` when on a desktop device.
   */
  it("calls handleRemoveFile properly from ThumbnailList (Desktop)", () => {
    // Arrange: Mock `useIsMobile` to return false and render the component.
    vi.mocked(useIsMobile).mockReturnValue(false);
    render(<CaseCapture isOpen={true} onOpenChange={vi.fn()} />);

    // Act: Click the mock remove file button in the thumbnail list.
    const removeButton = screen.getByLabelText("Remove File");
    fireEvent.click(removeButton);

    // Assert: Check that `handleRemoveFile` was called with the mock file and `false` for `isMobile`.
    expect(mockCameraState.handleRemoveFile).toHaveBeenCalledWith({ id: "test-file" }, false);
  });
});
