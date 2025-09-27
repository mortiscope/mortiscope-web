import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResultsHeaderSkeleton } from "@/features/results/components/results-header-skeleton";
import { type LayoutState, useLayoutStore } from "@/stores/layout-store";

// Mock the skeleton wrapper to isolate the header skeleton logic from its visual implementation.
vi.mock("@/features/results/components/results-skeleton", () => ({
  ResultsHeaderSkeletonWrapper: () => <div data-testid="skeleton-wrapper" />,
}));

// Mock the global layout store to track how additional header content is managed.
vi.mock("@/stores/layout-store", () => ({
  useLayoutStore: vi.fn(),
}));

/**
 * Test suite for the `ResultsHeaderSkeleton` component.
 */
describe("ResultsHeaderSkeleton", () => {
  const mockSetHeaderAdditionalContent = vi.fn();
  const mockClearHeaderAdditionalContent = vi.fn();

  // Reset mocks and initialize the store implementation before each test case.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLayoutStore).mockImplementation((selector: (state: LayoutState) => unknown) => {
      const state = {
        headerAdditionalContent: null,
        setHeaderAdditionalContent: mockSetHeaderAdditionalContent,
        clearHeaderAdditionalContent: mockClearHeaderAdditionalContent,
      };
      return selector(state);
    });
  });

  /**
   * Test case to verify that the component does not render any markup to its immediate location.
   */
  it("renders nothing visible in the DOM", () => {
    // Arrange: Render the component which is designed as a logic-only or portal-like component.
    const { container } = render(<ResultsHeaderSkeleton />);

    // Assert: Check that the rendered output is empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify that the component pushes skeleton content to the layout header when it mounts.
   */
  it("sets the header additional content on mount", () => {
    // Act: Render the component to trigger the mounting lifecycle hook.
    render(<ResultsHeaderSkeleton />);

    // Assert: Ensure the store function `setHeaderAdditionalContent` was called to inject the skeleton.
    expect(mockSetHeaderAdditionalContent).toHaveBeenCalledTimes(1);

    // Assert: Verify that the argument passed to the store is a valid React element.
    const callArgument = mockSetHeaderAdditionalContent.mock.calls[0][0];
    expect(callArgument).toBeTruthy();
    expect(callArgument.type).toBeDefined();
  });

  /**
   * Test case to verify that the component cleans up the header content when it is removed from the tree.
   */
  it("clears the header additional content on unmount", () => {
    // Arrange: Render the component and prepare the `unmount` function.
    const { unmount } = render(<ResultsHeaderSkeleton />);

    // Assert: Verify the clear function has not been called prematurely.
    expect(mockClearHeaderAdditionalContent).not.toHaveBeenCalled();

    // Act: Trigger the unmounting lifecycle.
    unmount();

    // Assert: Ensure the store function `clearHeaderAdditionalContent` was called once for cleanup.
    expect(mockClearHeaderAdditionalContent).toHaveBeenCalledTimes(1);
  });
});
