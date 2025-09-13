import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useLayoutStore } from "@/stores/layout-store";

/**
 * Groups related tests for the layout store to verify state management of header content.
 */
describe("useLayoutStore", () => {
  // Resets the store state before each test to ensure test isolation.
  beforeEach(() => {
    act(() => {
      useLayoutStore.setState({ headerAdditionalContent: null });
    });
  });

  /**
   * Test case to verify that the store initializes with a null value for additional header content.
   */
  it("initializes with null headerAdditionalContent", () => {
    // Arrange: Render the hook to access the store instance.
    const { result } = renderHook(() => useLayoutStore());

    // Assert: Check if `headerAdditionalContent` is null by default.
    expect(result.current.headerAdditionalContent).toBeNull();
  });

  /**
   * Test case to verify that the store updates the additional header content with a string value.
   */
  it("updates headerAdditionalContent with a string", () => {
    // Arrange: Render the hook and define the test content string.
    const { result } = renderHook(() => useLayoutStore());
    const content = "Test Title";

    // Act: Update the store state with the string content.
    act(() => {
      result.current.setHeaderAdditionalContent(content);
    });

    // Assert: Verify that `headerAdditionalContent` matches the provided string.
    expect(result.current.headerAdditionalContent).toBe(content);
  });

  /**
   * Test case to verify that the store updates the additional header content with a React Node.
   */
  it("updates headerAdditionalContent with a React Node", () => {
    // Arrange: Render the hook and define a React Node as content.
    const { result } = renderHook(() => useLayoutStore());
    const content = <div data-testid="test-content">Header Content</div>;

    // Act: Update the store state with the React Node.
    act(() => {
      result.current.setHeaderAdditionalContent(content);
    });

    // Assert: Verify that `headerAdditionalContent` matches the provided React Node.
    expect(result.current.headerAdditionalContent).toBe(content);
  });

  /**
   * Test case to verify that the store allows clearing the additional header content.
   */
  it("clears headerAdditionalContent", () => {
    // Arrange: Render the hook to access the store.
    const { result } = renderHook(() => useLayoutStore());

    // Act: Set temporary content to verify the clear action subsequently.
    act(() => {
      result.current.setHeaderAdditionalContent("Temporary Content");
    });

    // Assert: Confirm that the content was successfully set.
    expect(result.current.headerAdditionalContent).toBe("Temporary Content");

    // Act: Invoke the clear action to remove the content.
    act(() => {
      result.current.clearHeaderAdditionalContent();
    });

    // Assert: Verify that `headerAdditionalContent` has been reset to null.
    expect(result.current.headerAdditionalContent).toBeNull();
  });

  /**
   * Test case to verify that the store handles setting the content to null explicitly via the setter.
   */
  it("handles setting content to null explicitly via setHeaderAdditionalContent", () => {
    // Arrange: Render the hook to access the store.
    const { result } = renderHook(() => useLayoutStore());

    // Act: Set initial content to establish a non-null state.
    act(() => {
      result.current.setHeaderAdditionalContent("Content");
    });

    // Assert: Confirm that the content was successfully set.
    expect(result.current.headerAdditionalContent).toBe("Content");

    // Act: explicitly set the content to null using the setter function.
    act(() => {
      result.current.setHeaderAdditionalContent(null);
    });

    // Assert: Verify that `headerAdditionalContent` is now null.
    expect(result.current.headerAdditionalContent).toBeNull();
  });
});
