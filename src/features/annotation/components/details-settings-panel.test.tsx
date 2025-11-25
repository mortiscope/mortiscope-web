import { fireEvent, screen } from "@testing-library/react";
import { useParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { DetailsSettingsPanel } from "@/features/annotation/components/details-settings-panel";
import { useAnnotatedData } from "@/features/annotation/hooks/use-annotated-data";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { type AnnotationState } from "@/features/annotation/store/annotation-store";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

// Mock the hook responsible for fetching general annotation data.
vi.mock("@/features/annotation/hooks/use-annotated-data", () => ({
  useAnnotatedData: vi.fn(),
}));

// Mock the hook responsible for managing the current image in the editor.
vi.mock("@/features/annotation/hooks/use-editor-image", () => ({
  useEditorImage: vi.fn(),
}));

// Mock the global annotation store to control state during testing.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

// Mock framer-motion to bypass animation-related side effects and render plain divs.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

// Mock the panel section header to simplify testing of UI sectioning.
vi.mock("@/features/annotation/components/panel-section-header", () => ({
  PanelSectionHeader: ({ title }: { title: string }) => (
    <div data-testid="section-header">{title}</div>
  ),
}));

// Mock the Switch component to provide a clickable button for interaction tests.
vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id: string;
  }) => (
    <button
      data-testid={`switch-${id}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
    >
      Toggle {id}
    </button>
  ),
}));

// Mock the UI Button to allow for standard event firing and attribute checking.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
  }: React.ComponentProps<"button">) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

// Mock the delete image modal to prevent complex nested rendering.
vi.mock("@/features/annotation/components/editor-delete-image-modal", () => ({
  EditorDeleteImageModal: () => <div />,
}));

// Mock the bulk verification modal to simplify assertions on modal triggers.
vi.mock("@/features/annotation/components/verify-all-detections-modal", () => ({
  VerifyAllDetectionsModal: () => <div />,
}));

// Mock Next.js dynamic imports to track which modal components are requested for lazy loading.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    loader()
      .then((mod: unknown) => mod)
      .catch(() => {});

    const loaderStr = loader.toString();
    let testId = "unknown-modal";

    if (loaderStr.includes("editor-delete-image-modal")) {
      testId = "delete-modal";
    } else if (loaderStr.includes("verify-all-detections-modal")) {
      testId = "verify-all-modal";
    }

    const MockModal = ({ isOpen }: { isOpen: boolean }) =>
      isOpen ? <div data-testid={testId} /> : null;
    MockModal.displayName = `MockDynamic(${testId})`;
    return MockModal;
  },
}));

/**
 * Test suite for the `DetailsSettingsPanel` component.
 */
describe("DetailsSettingsPanel", () => {
  const mockSetDisplayFilter = vi.fn();

  const defaultImage = {
    id: "img-1",
    name: "test-image.jpg",
  };

  const defaultDetections = [
    { id: "d1", status: "model_generated" },
    { id: "d2", status: "user_confirmed" },
  ];

  // Initialize mocks with default valid data before each test execution.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useParams).mockReturnValue({
      resultsId: "case-123",
      imageId: "img-1",
    });

    vi.mocked(useAnnotatedData).mockReturnValue({
      totalImages: 5,
    } as unknown as ReturnType<typeof useAnnotatedData>);

    vi.mocked(useEditorImage).mockReturnValue({
      image: defaultImage,
    } as unknown as ReturnType<typeof useEditorImage>);

    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = {
        displayFilter: "all",
        setDisplayFilter: mockSetDisplayFilter,
        isLocked: false,
        detections: defaultDetections,
        classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
        toggleClassFilter: vi.fn(),
        viewMode: "all",
        setViewMode: vi.fn(),
      };
      return selector(state as unknown as AnnotationState);
    });
  });

  /**
   * Test case to verify that the main UI sections are rendered with correct titles.
   */
  it("renders display filters and actions sections", () => {
    // Arrange: Render the settings panel.
    render(<DetailsSettingsPanel />);

    // Assert: Check for the existence of the four primary category headers.
    expect(screen.getAllByTestId("section-header")).toHaveLength(4);
    expect(screen.getByText("Layer Visibility")).toBeInTheDocument();
    expect(screen.getByText("Display Filters")).toBeInTheDocument();
    expect(screen.getByText("Class Filters")).toBeInTheDocument();
    expect(screen.getByText("Image Actions")).toBeInTheDocument();
  });

  /**
   * Test case to ensure all status-based filter switches are present.
   */
  it("renders all filter switches", () => {
    // Arrange: Render the settings panel.
    render(<DetailsSettingsPanel />);

    // Assert: Verify visibility of switches for all, verified, and unverified filters.
    expect(screen.getByTestId("switch-show-all")).toBeInTheDocument();
    expect(screen.getByTestId("switch-show-verified")).toBeInTheDocument();
    expect(screen.getByTestId("switch-show-unverified")).toBeInTheDocument();
  });

  /**
   * Test case to verify switch states correctly reflect the current `displayFilter` state.
   */
  it("sets correct switch state based on displayFilter", () => {
    // Arrange: Render component with default state where filter is set to all.
    render(<DetailsSettingsPanel />);

    // Assert: Verify that only the show-all switch is marked as checked.
    expect(screen.getByTestId("switch-show-all")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("switch-show-verified")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("switch-show-unverified")).toHaveAttribute("aria-checked", "false");
  });

  /**
   * Test case to verify that clicking the verified filter switch updates the store.
   */
  it("updates displayFilter to 'verified' when verified switch is toggled", () => {
    // Arrange: Render the settings panel.
    render(<DetailsSettingsPanel />);

    // Act: Click the switch labeled for verified items.
    fireEvent.click(screen.getByTestId("switch-show-verified"));

    // Assert: Ensure the store update function was called with the verified value.
    expect(mockSetDisplayFilter).toHaveBeenCalledWith("verified");
  });

  /**
   * Test case to verify that clicking the unverified filter switch updates the store.
   */
  it("updates displayFilter to 'unverified' when unverified switch is toggled", () => {
    // Arrange: Render the settings panel.
    render(<DetailsSettingsPanel />);

    // Act: Click the switch labeled for unverified items.
    fireEvent.click(screen.getByTestId("switch-show-unverified"));

    // Assert: Ensure the store update function was called with the unverified value.
    expect(mockSetDisplayFilter).toHaveBeenCalledWith("unverified");
  });

  /**
   * Test case to verify that clicking the show-all switch resets the filter in the store.
   */
  it("updates displayFilter to 'all' when all switch is toggled", () => {
    // Arrange: Mock the store with a currently active verified filter.
    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = {
        displayFilter: "verified",
        setDisplayFilter: mockSetDisplayFilter,
        isLocked: false,
        detections: defaultDetections,
        classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
        toggleClassFilter: vi.fn(),
        viewMode: "all",
        setViewMode: vi.fn(),
      };
      return selector(state as unknown as AnnotationState);
    });

    render(<DetailsSettingsPanel />);

    // Act: Click the switch labeled to show all items.
    fireEvent.click(screen.getByTestId("switch-show-all"));

    // Assert: Ensure the filter is reset to all.
    expect(mockSetDisplayFilter).toHaveBeenCalledWith("all");
  });

  /**
   * Test case to prevent redundant state updates when an already active filter is clicked.
   */
  it("does not update displayFilter when clicking an already active switch (toggle off attempt)", () => {
    // Arrange: Render the settings panel.
    render(<DetailsSettingsPanel />);

    // Act: Click a switch that is already active based on the default state.
    fireEvent.click(screen.getByTestId("switch-show-all"));

    // Assert: Verify that no state update function was triggered.
    expect(mockSetDisplayFilter).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure the component does not crash and opens the delete modal even if image data is missing.
   */
  it("handles null image gracefully", () => {
    // Arrange: Provide a null value for the current editor image.
    vi.mocked(useEditorImage).mockReturnValue({
      image: null,
    } as unknown as ReturnType<typeof useEditorImage>);

    render(<DetailsSettingsPanel />);

    // Act: Trigger the delete action.
    fireEvent.click(screen.getByLabelText("Delete image"));

    // Assert: Verify that the delete confirmation modal is rendered despite the null image.
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify the bulk verification button is enabled when unverified work exists.
   */
  it("enables 'Verify All' button when there are unverified detections", () => {
    // Arrange: Render component with default model_generated detections.
    render(<DetailsSettingsPanel />);

    // Assert: Ensure the verification action is available to the user.
    expect(screen.getByLabelText("Verify all detections")).toBeEnabled();
  });

  /**
   * Test case to verify the bulk verification button is disabled when no unverified work remains.
   */
  it("disables 'Verify All' button when all detections are verified", () => {
    // Arrange: Mock store with only user_confirmed detections.
    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = {
        displayFilter: "all",
        setDisplayFilter: mockSetDisplayFilter,
        isLocked: false,
        detections: [
          { id: "d1", status: "user_confirmed" },
          { id: "d2", status: "user_edited_confirmed" },
        ],
        classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
        toggleClassFilter: vi.fn(),
        viewMode: "all",
        setViewMode: vi.fn(),
      };
      return selector(state as unknown as AnnotationState);
    });

    render(<DetailsSettingsPanel />);

    // Assert: Ensure the button is disabled to prevent redundant actions.
    expect(screen.getByLabelText("Verify all detections")).toBeDisabled();
  });

  /**
   * Test case to ensure the bulk verification button is disabled if the detection list is empty.
   */
  it("disables 'Verify All' button when there are no detections", () => {
    // Arrange: Provide an empty detections array to the store mock.
    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = {
        displayFilter: "all",
        setDisplayFilter: mockSetDisplayFilter,
        isLocked: false,
        detections: [],
        classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
        toggleClassFilter: vi.fn(),
        viewMode: "all",
        setViewMode: vi.fn(),
      };
      return selector(state as unknown as AnnotationState);
    });

    render(<DetailsSettingsPanel />);

    // Assert: Verify the button is disabled as there is nothing to verify.
    expect(screen.getByLabelText("Verify all detections")).toBeDisabled();
  });

  /**
   * Test case to prevent verification actions when the editor is in a locked state.
   */
  it("disables 'Verify All' button when editor is locked", () => {
    // Arrange: Set the `isLocked` state to true in the store mock.
    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = {
        displayFilter: "all",
        setDisplayFilter: mockSetDisplayFilter,
        isLocked: true,
        detections: defaultDetections,
        classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
        toggleClassFilter: vi.fn(),
        viewMode: "all",
        setViewMode: vi.fn(),
      };
      return selector(state as unknown as AnnotationState);
    });

    render(<DetailsSettingsPanel />);

    // Assert: Verify the verification action is restricted.
    expect(screen.getByLabelText("Verify all detections")).toBeDisabled();
  });

  /**
   * Test case to prevent image deletion when the editor is in a locked state.
   */
  it("disables 'Delete Image' button when editor is locked", () => {
    // Arrange: Set the `isLocked` state to true in the store mock.
    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = {
        displayFilter: "all",
        setDisplayFilter: mockSetDisplayFilter,
        isLocked: true,
        detections: defaultDetections,
        classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
        toggleClassFilter: vi.fn(),
        viewMode: "all",
        setViewMode: vi.fn(),
      };
      return selector(state as unknown as AnnotationState);
    });

    render(<DetailsSettingsPanel />);

    // Assert: Verify the delete action is restricted.
    expect(screen.getByLabelText("Delete image")).toBeDisabled();
  });

  /**
   * Test case to verify that clicking the bulk verify button triggers the correct modal.
   */
  it("opens 'Verify All' modal when button is clicked", () => {
    // Arrange: Render the settings panel.
    render(<DetailsSettingsPanel />);

    // Act: Click the button intended to verify all detections.
    fireEvent.click(screen.getByLabelText("Verify all detections"));

    // Assert: Verify the corresponding modal appears in the DOM.
    expect(screen.getByTestId("verify-all-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the delete image button triggers the confirmation modal.
   */
  it("opens 'Delete Image' modal when button is clicked", () => {
    // Arrange: Render the settings panel.
    render(<DetailsSettingsPanel />);

    // Act: Click the button intended to delete the image.
    fireEvent.click(screen.getByLabelText("Delete image"));

    // Assert: Verify the corresponding modal appears in the DOM.
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
  });

  /**
   * Test case to ensure UI stability when URL parameters are malformed or missing.
   */
  it("handles invalid route parameters gracefully", () => {
    // Arrange: Provide invalid types for route parameters.
    vi.mocked(useParams).mockReturnValue({
      resultsId: undefined,
      imageId: ["array-is-invalid"],
    } as unknown as ReturnType<typeof useParams>);

    render(<DetailsSettingsPanel />);

    // Assert: Confirm the component still renders critical UI sections.
    expect(screen.getByText("Display Filters")).toBeInTheDocument();
  });

  /**
   * Test case to verify that an active 'verified' filter cannot be redundantly reapplied.
   */
  it("does not update displayFilter when clicking already active 'verified' switch", () => {
    // Arrange: Mock store with 'verified' as the current filter.
    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = {
        displayFilter: "verified",
        setDisplayFilter: mockSetDisplayFilter,
        isLocked: false,
        detections: defaultDetections,
        classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
        toggleClassFilter: vi.fn(),
        viewMode: "all",
        setViewMode: vi.fn(),
      };
      return selector(state as unknown as AnnotationState);
    });

    render(<DetailsSettingsPanel />);

    // Act: Click the switch that matches the current state.
    fireEvent.click(screen.getByTestId("switch-show-verified"));

    // Assert: Ensure no update was triggered.
    expect(mockSetDisplayFilter).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an active 'unverified' filter cannot be redundantly reapplied.
   */
  it("does not update displayFilter when clicking already active 'unverified' switch", () => {
    // Arrange: Mock store with 'unverified' as the current filter.
    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = {
        displayFilter: "unverified",
        setDisplayFilter: mockSetDisplayFilter,
        isLocked: false,
        detections: defaultDetections,
        classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
        toggleClassFilter: vi.fn(),
        viewMode: "all",
        setViewMode: vi.fn(),
      };
      return selector(state as unknown as AnnotationState);
    });

    render(<DetailsSettingsPanel />);

    // Act: Click the switch that matches the current state.
    fireEvent.click(screen.getByTestId("switch-show-unverified"));

    // Assert: Ensure no update was triggered.
    expect(mockSetDisplayFilter).not.toHaveBeenCalled();
  });

  /**
   * Nested suite for testing the logic controlling how different layers are visible in the editor.
   */
  describe("Layer Visibility Logic", () => {
    /**
     * Test case to verify that hiding annotations shifts the view mode to image-only.
     */
    it("sets viewMode to 'image_only' when disabling annotations from 'all'", () => {
      // Arrange: Render panel with initial view mode showing everything.
      const mockSetViewMode = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
          toggleClassFilter: vi.fn(),
          viewMode: "all",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle off the visibility of annotations.
      fireEvent.click(screen.getByTestId("switch-show-annotations"));

      // Assert: Verify the view mode is updated to show only the background image.
      expect(mockSetViewMode).toHaveBeenCalledWith("image_only");
    });

    /**
     * Test case to verify that re-enabling annotations restores the full view mode.
     */
    it("sets viewMode to 'all' when enabling annotations from 'image_only'", () => {
      // Arrange: Render panel with current view mode set to show only the image.
      const mockSetViewMode = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
          toggleClassFilter: vi.fn(),
          viewMode: "image_only",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle on the visibility of annotations.
      fireEvent.click(screen.getByTestId("switch-show-annotations"));

      // Assert: Verify the view mode is updated to show both image and annotations.
      expect(mockSetViewMode).toHaveBeenCalledWith("all");
    });

    /**
     * Test case to verify that hiding the image layer shifts the view mode to show only annotations.
     */
    it("sets viewMode to 'annotations_only' when disabling image from 'all'", () => {
      // Arrange: Render panel with initial view mode showing everything.
      const mockSetViewMode = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
          toggleClassFilter: vi.fn(),
          viewMode: "all",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle off the visibility of the image layer.
      fireEvent.click(screen.getByTestId("switch-show-image"));

      // Assert: Verify the view mode is updated to hide the image background.
      expect(mockSetViewMode).toHaveBeenCalledWith("annotations_only");
    });

    /**
     * Test case to verify that enabling the image from annotations_only switches to all.
     */
    it("sets viewMode to 'all' when enabling image from 'annotations_only'", () => {
      // Arrange: Render panel with current view mode showing only annotations.
      const mockSetViewMode = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
          toggleClassFilter: vi.fn(),
          viewMode: "annotations_only",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle on the visibility of the image layer.
      fireEvent.click(screen.getByTestId("switch-show-image"));

      // Assert: Verify the view mode is updated to show both.
      expect(mockSetViewMode).toHaveBeenCalledWith("all");
    });

    /**
     * Test case to verify that disabling the image from 'none' remains at 'none' (nothing visible).
     */
    it("sets viewMode to 'none' when disabling annotations from 'image_only'", () => {
      // Arrange: Render panel with view mode showing only the image.
      const mockSetViewMode = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
          toggleClassFilter: vi.fn(),
          viewMode: "image_only",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle off image visibility.
      fireEvent.click(screen.getByTestId("switch-show-image"));

      // Assert: Verify the view mode changes to "none".
      expect(mockSetViewMode).toHaveBeenCalledWith("none");
    });

    /**
     * Test case to verify enabling image from 'none' sets viewMode to 'image_only'.
     */
    it("sets viewMode to 'image_only' when enabling image from 'none'", () => {
      // Arrange: Render panel with view mode set to none.
      const mockSetViewMode = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
          toggleClassFilter: vi.fn(),
          viewMode: "none",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle on the image layer visibility.
      fireEvent.click(screen.getByTestId("switch-show-image"));

      // Assert: Verify view mode is updated to show only the image.
      expect(mockSetViewMode).toHaveBeenCalledWith("image_only");
    });

    /**
     * Test case to verify enabling annotations from 'none' sets viewMode to 'annotations_only'.
     */
    it("sets viewMode to 'annotations_only' when enabling annotations from 'none'", () => {
      // Arrange: Render panel with nothing visible.
      const mockSetViewMode = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
          toggleClassFilter: vi.fn(),
          viewMode: "none",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle on the annotations visibility.
      fireEvent.click(screen.getByTestId("switch-show-annotations"));

      // Assert: Verify view mode is updated to show only annotations.
      expect(mockSetViewMode).toHaveBeenCalledWith("annotations_only");
    });

    /**
     * Test case to verify disabling annotations from 'annotations_only' sets viewMode to 'none'.
     */
    it("sets viewMode to 'none' when disabling annotations from 'annotations_only'", () => {
      // Arrange: Render panel with only annotations visible.
      const mockSetViewMode = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
          toggleClassFilter: vi.fn(),
          viewMode: "annotations_only",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle off annotations visibility.
      fireEvent.click(screen.getByTestId("switch-show-annotations"));

      // Assert: Verify view mode changes to "none".
      expect(mockSetViewMode).toHaveBeenCalledWith("none");
    });
  });

  /**
   * Nested suite for testing interactions with specific object class filters.
   */
  describe("Class Filter Interaction Logic", () => {
    /**
     * Test case to verify that removing the final active class filter hides the annotation layer entirely.
     */
    it("switches to 'image_only' when removing the last class filter", () => {
      // Arrange: Provide only one active class filter in the store mock.
      const mockSetViewMode = vi.fn();
      const mockToggleClassFilter = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1"],
          toggleClassFilter: mockToggleClassFilter,
          viewMode: "all",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle off the last remaining class filter.
      fireEvent.click(screen.getByTestId("switch-show-instar_1"));

      // Assert: Verify class is toggled and view mode switches to image-only since no annotations are visible.
      expect(mockToggleClassFilter).toHaveBeenCalledWith("instar_1");
      expect(mockSetViewMode).toHaveBeenCalledWith("image_only");
    });

    /**
     * Test case to verify that adding a class filter when none were active restores the annotation view.
     */
    it("switches to 'all' when adding the first class filter (from none)", () => {
      // Arrange: Provide an empty class filter array and image-only view mode.
      const mockSetViewMode = vi.fn();
      const mockToggleClassFilter = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: [],
          toggleClassFilter: mockToggleClassFilter,
          viewMode: "image_only",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle on a specific class filter.
      fireEvent.click(screen.getByTestId("switch-show-instar_1"));

      // Assert: Verify class is toggled and view mode restores annotations to the screen.
      expect(mockToggleClassFilter).toHaveBeenCalledWith("instar_1");
      expect(mockSetViewMode).toHaveBeenCalledWith("all");
    });

    /**
     * Test case to verify that toggling a class filter doesn't impact view mode if other classes are still visible.
     */
    it("does not change viewMode when toggling class filter if others remain", () => {
      // Arrange: Provide multiple active class filters.
      const mockSetViewMode = vi.fn();
      const mockToggleClassFilter = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1", "instar_2"],
          toggleClassFilter: mockToggleClassFilter,
          viewMode: "all",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle off one of the active classes.
      fireEvent.click(screen.getByTestId("switch-show-instar_1"));

      // Assert: Verify the class is toggled but the general view mode remains unchanged.
      expect(mockToggleClassFilter).toHaveBeenCalledWith("instar_1");
      expect(mockSetViewMode).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify removing the last class filter from annotations_only switches to none.
     */
    it("switches to 'none' when removing the last class filter from 'annotations_only'", () => {
      // Arrange: Provide only one active class filter with annotations_only view mode.
      const mockSetViewMode = vi.fn();
      const mockToggleClassFilter = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: ["instar_1"],
          toggleClassFilter: mockToggleClassFilter,
          viewMode: "annotations_only",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle off the last remaining class filter.
      fireEvent.click(screen.getByTestId("switch-show-instar_1"));

      // Assert: Verify the view mode changes to "none" since no annotations or image are shown.
      expect(mockToggleClassFilter).toHaveBeenCalledWith("instar_1");
      expect(mockSetViewMode).toHaveBeenCalledWith("none");
    });

    /**
     * Test case to verify adding the first class filter from none switches to annotations_only.
     */
    it("switches to 'annotations_only' when adding the first class filter from 'none'", () => {
      // Arrange: Provide an empty class filter array and "none" view mode.
      const mockSetViewMode = vi.fn();
      const mockToggleClassFilter = vi.fn();
      vi.mocked(useAnnotationStore).mockImplementation((selector) => {
        return selector({
          displayFilter: "all",
          setDisplayFilter: mockSetDisplayFilter,
          isLocked: false,
          detections: defaultDetections,
          classFilter: [],
          toggleClassFilter: mockToggleClassFilter,
          viewMode: "none",
          setViewMode: mockSetViewMode,
        } as unknown as AnnotationState);
      });

      render(<DetailsSettingsPanel />);

      // Act: Toggle on a specific class filter.
      fireEvent.click(screen.getByTestId("switch-show-instar_1"));

      // Assert: Verify the view mode changes to "annotations_only".
      expect(mockToggleClassFilter).toHaveBeenCalledWith("instar_1");
      expect(mockSetViewMode).toHaveBeenCalledWith("annotations_only");
    });
  });
});
