import { describe, expect, it, vi } from "vitest";

import { act, renderHook } from "@/__tests__/setup/test-utils";
import { useCameraSettings } from "@/features/cases/hooks/use-camera-settings";

// Mock the constant file that defines the camera aspect ratios available for selection.
vi.mock("@/lib/constants", () => ({
  CAMERA_ASPECT_RATIOS: [
    { name: "Square", value: 1, className: "aspect-square" },
    { name: "Landscape", value: 1.77, className: "aspect-video" },
    { name: "Portrait", value: 0.56, className: "aspect-portrait" },
  ],
}));

/**
 * Test suite for the `useCameraSettings` hook, which manages the user-configurable camera parameters.
 */
describe("useCameraSettings", () => {
  /**
   * Test case to verify that the hook initializes with the expected default configuration.
   */
  it("initializes with default settings", () => {
    // Act: Render the hook.
    const { result } = renderHook(() => useCameraSettings(false));

    // Assert: Check for the default aspect ratio setting.
    expect(result.current.aspectRatio.name).toBe("Square");
    // Assert: Check for the default camera facing mode, typically the back camera.
    expect(result.current.facingMode).toBe("environment");
    // Assert: Check for the initial rotation value.
    expect(result.current.rotation).toBe(0);
    // Assert: Check for the initial mirroring setting.
    expect(result.current.isMirrored).toBe(false);
  });

  /**
   * Test case to verify that settings are reset to their defaults when the camera (represented by `isOpen`) is closed and reopened.
   */
  it("resets settings to defaults when isOpen changes to true", () => {
    // Arrange: Render the hook initially with `isOpen` as true.
    const { result, rerender } = renderHook((isOpen) => useCameraSettings(isOpen), {
      initialProps: true,
    });

    // Act: Change the settings away from defaults.
    act(() => {
      result.current.handleDeviceFlip();
      result.current.handleRotateCamera();
      result.current.handleMirrorCamera();
    });

    // Assert: Verify the settings are currently modified.
    expect(result.current.facingMode).toBe("user");
    expect(result.current.rotation).toBe(90);
    expect(result.current.isMirrored).toBe(true);

    // Act: Simulate closing the camera (`isOpen=false`).
    rerender(false);
    // Act: Simulate reopening the camera (`isOpen=true`), triggering the reset effect.
    rerender(true);

    // Assert: Check that the settings have been restored to their initial defaults.
    expect(result.current.facingMode).toBe("environment");
    expect(result.current.rotation).toBe(0);
    expect(result.current.isMirrored).toBe(false);
  });

  /**
   * Test suite for the aspect ratio cycling functionality.
   */
  describe("handleAspectRatioChange", () => {
    /**
     * Test case to verify that successive calls cycle through the defined list of aspect ratios.
     */
    it("cycles through available aspect ratios", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCameraSettings(true));

      // Assert: Check the initial aspect ratio.
      expect(result.current.aspectRatio.name).toBe("Square");

      // Act: Change the aspect ratio once.
      act(() => result.current.handleAspectRatioChange());
      // Assert: Check for the next ratio in the list.
      expect(result.current.aspectRatio.name).toBe("Landscape");

      // Act: Change the aspect ratio a second time.
      act(() => result.current.handleAspectRatioChange());
      // Assert: Check for the final ratio in the list.
      expect(result.current.aspectRatio.name).toBe("Portrait");

      // Act: Change the aspect ratio a third time, wrapping around.
      act(() => result.current.handleAspectRatioChange());
      // Assert: Check that it looped back to the initial ratio.
      expect(result.current.aspectRatio.name).toBe("Square");
    });

    /**
     * Test case to ensure that changing the aspect ratio resets the rotation back to zero.
     */
    it("resets rotation when aspect ratio changes", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCameraSettings(true));

      // Act: Rotate the camera to a non-zero value.
      act(() => result.current.handleRotateCamera());
      // Assert: Verify the rotation is applied.
      expect(result.current.rotation).toBe(90);

      // Act: Change the aspect ratio.
      act(() => result.current.handleAspectRatioChange());
      // Assert: Check that the rotation has been reset to zero.
      expect(result.current.rotation).toBe(0);
    });
  });

  /**
   * Test suite for the camera device flipping functionality.
   */
  describe("handleDeviceFlip", () => {
    /**
     * Test case to verify that the facing mode toggles between "user" (front camera) and "environment" (back camera).
     */
    it("toggles between user and environment modes", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCameraSettings(true));

      // Act: Flip the camera once.
      act(() => result.current.handleDeviceFlip());
      // Assert: Check that the mode changed to "user".
      expect(result.current.facingMode).toBe("user");

      // Act: Flip the camera again.
      act(() => result.current.handleDeviceFlip());
      // Assert: Check that the mode toggled back to "environment".
      expect(result.current.facingMode).toBe("environment");
    });
  });

  /**
   * Test suite for the camera rotation functionality.
   */
  describe("handleRotateCamera", () => {
    /**
     * Test case to verify that rotation increments by 90 degrees and loops from 270 to 0 when the aspect ratio is square.
     */
    it("rotates by 90 degrees increments if aspect ratio is Square", () => {
      // Arrange: Render the hook, defaulting to "Square" aspect ratio.
      const { result } = renderHook(() => useCameraSettings(true));

      // Assert: Verify the initial aspect ratio for this test.
      expect(result.current.aspectRatio.name).toBe("Square");

      // Act: Rotate once.
      act(() => result.current.handleRotateCamera());
      expect(result.current.rotation).toBe(90);

      // Act: Rotate twice.
      act(() => result.current.handleRotateCamera());
      expect(result.current.rotation).toBe(180);

      // Act: Rotate three times.
      act(() => result.current.handleRotateCamera());
      expect(result.current.rotation).toBe(270);

      // Act: Rotate four times, checking the loop back to 0.
      act(() => result.current.handleRotateCamera());
      expect(result.current.rotation).toBe(0);
    });

    /**
     * Test case to verify that rotation toggles only between 0 and 180 degrees when a non-square aspect ratio is selected.
     */
    it("toggles between 0 and 180 if aspect ratio is NOT Square", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCameraSettings(true));

      // Act: Change the aspect ratio to a non-square value (Landscape).
      act(() => result.current.handleAspectRatioChange());
      // Assert: Verify the aspect ratio is now "Landscape".
      expect(result.current.aspectRatio.name).toBe("Landscape");

      // Act: Rotate once.
      act(() => result.current.handleRotateCamera());
      // Assert: Check that rotation is 180 degrees.
      expect(result.current.rotation).toBe(180);

      // Act: Rotate again.
      act(() => result.current.handleRotateCamera());
      // Assert: Check that rotation toggled back to 0 degrees.
      expect(result.current.rotation).toBe(0);
    });
  });

  /**
   * Test suite for the camera mirroring functionality.
   */
  describe("handleMirrorCamera", () => {
    /**
     * Test case to verify that the `isMirrored` state toggles on each call.
     */
    it("toggles isMirrored state", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useCameraSettings(true));

      // Act: Toggle mirroring once.
      act(() => result.current.handleMirrorCamera());
      // Assert: Check that mirroring is now enabled.
      expect(result.current.isMirrored).toBe(true);

      // Act: Toggle mirroring again.
      act(() => result.current.handleMirrorCamera());
      // Assert: Check that mirroring is now disabled.
      expect(result.current.isMirrored).toBe(false);
    });
  });
});
