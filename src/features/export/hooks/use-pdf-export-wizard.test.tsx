import { act } from "react";
import { describe, expect, it } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import { defaultPdfPermissions } from "@/features/export/constants/pdf-options";
import { usePdfExportWizard } from "@/features/export/hooks/use-pdf-export-wizard";

/**
 * Test suite for the `usePdfExportWizard` custom hook.
 */
describe("usePdfExportWizard", () => {
  /**
   * Test case to verify that the hook initializes with correct default state values.
   */
  it("initializes with default values", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePdfExportWizard());

    // Assert: Verify that all state variables correspond to their initial defaults.
    expect(result.current.step).toBe("introduction");
    expect(result.current.securityLevel).toBeNull();
    expect(result.current.pageSize).toBeNull();
    expect(result.current.password).toBe("");
    expect(result.current.permissions).toEqual(defaultPdfPermissions);
  });

  /**
   * Test case to verify that state setters correctly update the hook's internal state.
   */
  it("updates state via setters", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePdfExportWizard());

    // Act: Update all state variables using their respective setters.
    act(() => {
      result.current.setSecurityLevel("view_protected");
      result.current.setPageSize("a4");
      result.current.setPassword("secret123");
      result.current.setPermissions({ ...defaultPdfPermissions, printing: true });
    });

    // Assert: Check that the state values reflect the updates.
    expect(result.current.securityLevel).toBe("view_protected");
    expect(result.current.pageSize).toBe("a4");
    expect(result.current.password).toBe("secret123");
    expect(result.current.permissions.printing).toBe(true);
  });

  /**
   * Group of tests covering the wizard's step navigation logic.
   */
  describe("Navigation Logic", () => {
    /**
     * Test case to verify that the wizard advances from the introduction step to the security step.
     */
    it("advances from introduction to security", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => usePdfExportWizard());

      // Act: Trigger the next step action.
      act(() => {
        result.current.handleNext();
      });

      // Assert: Verify the step is now 'security'.
      expect(result.current.step).toBe("security");
    });

    /**
     * Test case to verify that navigation to the permissions step is restricted to specific security levels.
     */
    it("advances from security to permissions only if security level is permissions_protected", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => usePdfExportWizard());

      // Act: Advance to the security step.
      act(() => {
        result.current.handleNext();
      });
      expect(result.current.step).toBe("security");

      // Act: Set security level to 'standard' and attempt to advance.
      act(() => {
        result.current.setSecurityLevel("standard");
        result.current.handleNext();
      });
      // Assert: Verify the step remains 'security'.
      expect(result.current.step).toBe("security");

      // Act: Set security level to 'view_protected' and attempt to advance.
      act(() => {
        result.current.setSecurityLevel("view_protected");
        result.current.handleNext();
      });
      // Assert: Verify the step remains 'security'.
      expect(result.current.step).toBe("security");

      // Act: Set security level to 'permissions_protected'.
      act(() => {
        result.current.setSecurityLevel("permissions_protected");
      });
      // Act: Attempt to advance.
      act(() => {
        result.current.handleNext();
      });
      // Assert: Verify the step is now 'permissions'.
      expect(result.current.step).toBe("permissions");
    });

    /**
     * Test case to verify that backward navigation updates the step state correctly.
     */
    it("navigates back correctly", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => usePdfExportWizard());

      // Act: Navigate forward to the permissions step.
      act(() => {
        result.current.handleNext();
      });
      act(() => {
        result.current.setSecurityLevel("permissions_protected");
      });
      act(() => {
        result.current.handleNext();
      });
      expect(result.current.step).toBe("permissions");

      // Act: Navigate back once.
      act(() => {
        result.current.handleBack();
      });
      // Assert: Verify the step returns to 'security'.
      expect(result.current.step).toBe("security");

      // Act: Navigate back again.
      act(() => {
        result.current.handleBack();
      });
      // Assert: Verify the step returns to 'introduction'.
      expect(result.current.step).toBe("introduction");
    });
  });

  /**
   * Group of tests covering navigation boundary conditions (first and last steps).
   */
  describe("Boundary Navigation", () => {
    /**
     * Test case to verify that `handleBack` has no effect when on the first step.
     */
    it("does nothing when navigating back from introduction", () => {
      // Arrange: Render the hook and verify initial state.
      const { result } = renderHook(() => usePdfExportWizard());

      expect(result.current.step).toBe("introduction");

      // Act: Attempt to navigate back.
      act(() => {
        result.current.handleBack();
      });

      // Assert: Verify the step remains 'introduction'.
      expect(result.current.step).toBe("introduction");
    });

    /**
     * Test case to verify that `handleNext` has no effect when on the final step.
     */
    it("does nothing when navigating next from permissions", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => usePdfExportWizard());

      // Act: Navigate forward to the last step (permissions).
      act(() => {
        result.current.handleNext();
      });
      act(() => {
        result.current.setSecurityLevel("permissions_protected");
      });
      act(() => {
        result.current.handleNext();
      });

      expect(result.current.step).toBe("permissions");

      // Act: Attempt to navigate next again.
      act(() => {
        result.current.handleNext();
      });

      // Assert: Verify the step remains 'permissions'.
      expect(result.current.step).toBe("permissions");
    });
  });

  /**
   * Group of tests covering the state reset functionality.
   */
  describe("Reset Logic", () => {
    /**
     * Test case to verify that the reset function restores all state variables to their default values.
     */
    it("resets all state to initial defaults", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => usePdfExportWizard());

      // Act: Modify all state values to non-default states.
      act(() => {
        result.current.handleNext();
        result.current.setSecurityLevel("permissions_protected");
        result.current.setPageSize("letter");
        result.current.setPassword("changed");
        result.current.setPermissions({ ...defaultPdfPermissions, copying: true });
      });

      // Act: Call the reset function.
      act(() => {
        result.current.resetState();
      });

      // Assert: Verify that all state values have returned to their initial defaults.
      expect(result.current.step).toBe("introduction");
      expect(result.current.securityLevel).toBeNull();
      expect(result.current.pageSize).toBeNull();
      expect(result.current.password).toBe("");
      expect(result.current.permissions).toEqual(defaultPdfPermissions);
    });
  });
});
