import { act } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import { useRecoveryCodes } from "@/features/account/hooks/use-recovery-codes";
import { useTwoFactorAuth } from "@/features/account/hooks/use-two-factor-auth";

// Mock the toast notification library to verify feedback for copy and download actions.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock the two-factor authentication hook to control mutation behaviors for recovery codes.
vi.mock("@/features/account/hooks/use-two-factor-auth", () => ({
  useTwoFactorAuth: vi.fn(),
}));

/**
 * Test suite for the `useRecoveryCodes` custom hook.
 */
describe("useRecoveryCodes", () => {
  const mockGetRecoveryCodesMutate = vi.fn();
  const mockRegenerateRecoveryCodesMutate = vi.fn();

  // Configure environment mocks and reset timers before each test case.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    vi.mocked(useTwoFactorAuth).mockReturnValue({
      getRecoveryCodes: {
        mutate: mockGetRecoveryCodesMutate,
      } as unknown as ReturnType<typeof useTwoFactorAuth>["getRecoveryCodes"],
      regenerateRecoveryCodes: {
        mutate: mockRegenerateRecoveryCodesMutate,
      } as unknown as ReturnType<typeof useTwoFactorAuth>["regenerateRecoveryCodes"],
      setupTwoFactor: {} as unknown as ReturnType<typeof useTwoFactorAuth>["setupTwoFactor"],
      verifyTwoFactor: {} as unknown as ReturnType<typeof useTwoFactorAuth>["verifyTwoFactor"],
      disableTwoFactor: {} as unknown as ReturnType<typeof useTwoFactorAuth>["disableTwoFactor"],
    });

    // Mock navigator clipboard API.
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    // Mock secure context to test clipboard API availability.
    Object.defineProperty(window, "isSecureContext", {
      value: true,
      writable: true,
    });

    // Mock legacy document commands for fallback copy testing.
    document.execCommand = vi.fn().mockReturnValue(true) as unknown as (
      commandId: string,
      showUI?: boolean,
      value?: string
    ) => boolean;
    document.queryCommandSupported = vi.fn().mockReturnValue(true) as unknown as (
      commandId: string
    ) => boolean;

    // Mock URL object methods for file download testing.
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
  });

  // Restore real timers after each test to prevent side effects in other suites.
  afterEach(() => {
    vi.useRealTimers();
  });

  const stableInitialCodes = ["code-1", "code-2", "code-3"];
  const stableSingleCode = ["code-1"];
  const stableEmptyArray: string[] = [];

  /**
   * Group of tests focusing on the hook behavior during the initial 2FA setup flow.
   */
  describe("Initial Setup Mode", () => {
    /**
     * Test case to verify that provided codes are correctly padded to fill the standard UI grid.
     */
    it("initializes with provided codes and pads to 16 slots", () => {
      // Arrange: Render hook with specific codes.
      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableInitialCodes },
      });

      // Assert: Verify that `displayCodes` contains the original codes followed by null padding.
      expect(result.current.isInitialSetup).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.displayCodes).toHaveLength(16);
      expect(result.current.displayCodes.slice(0, 3)).toEqual(stableInitialCodes);
      expect(result.current.displayCodes[3]).toBeNull();
    });

    /**
     * Test case to verify that redundant network requests are avoided when codes are passed as props.
     */
    it("does not fetch codes if initialCodes are provided", () => {
      // Act: Render hook with existing codes.
      renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableSingleCode },
      });

      // Assert: Verify the get mutation was not triggered.
      expect(mockGetRecoveryCodesMutate).not.toHaveBeenCalled();
    });
  });

  /**
   * Group of tests focusing on the hook behavior when viewing existing recovery status.
   */
  describe("View Status Mode", () => {
    /**
     * Test case to verify that the hook fetches code status automatically when no codes are provided.
     */
    it("fetches codes on mount if no initialCodes provided", () => {
      // Act: Render hook in view mode.
      renderHook(({ isOpen }) => useRecoveryCodes(isOpen), { initialProps: { isOpen: true } });

      // Assert: Verify the mutation was called to fetch code information.
      expect(mockGetRecoveryCodesMutate).toHaveBeenCalled();
    });

    /**
     * Test case to verify that codes are displayed as masked placeholders when fetched in view-only mode.
     */
    it("displays masked placeholders on successful fetch", () => {
      // Arrange: Mock a successful status fetch.
      mockGetRecoveryCodesMutate.mockImplementation((_, { onSuccess }) => {
        onSuccess({
          success: "Codes fetched",
          data: {
            codeStatus: [true, true, false],
            totalCodes: 16,
            usedCount: 0,
            unusedCount: 16,
            hasRecoveryCodes: true,
          },
        });
      });

      const { result } = renderHook(({ isOpen }) => useRecoveryCodes(isOpen), {
        initialProps: { isOpen: true },
      });

      // Assert: Verify that active codes are represented by masking strings and inactive ones are null.
      expect(result.current.displayCodes[0]).toBe("••••-••••");
      expect(result.current.displayCodes[1]).toBe("••••-••••");
      expect(result.current.displayCodes[2]).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    /**
     * Test case to verify that network errors result in an empty padded display.
     */
    it("handles fetch error gracefully", () => {
      // Arrange: Simulate a mutation error.
      mockGetRecoveryCodesMutate.mockImplementation((_, { onError }) => {
        onError();
      });

      const { result } = renderHook(({ isOpen }) => useRecoveryCodes(isOpen), {
        initialProps: { isOpen: true },
      });

      // Assert: Verify display contains 16 null slots.
      expect(result.current.displayCodes).toHaveLength(16);
      expect(result.current.displayCodes.every((code) => code === null)).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    /**
     * Test case to verify that specific error responses from the server are handled correctly.
     */
    it("handles failed fetch response with null displayCodes", () => {
      // Arrange: Simulate a server-side failure response.
      mockGetRecoveryCodesMutate.mockImplementation((_, { onSuccess }) => {
        onSuccess({ error: "Failed to fetch" });
      });

      const { result } = renderHook(({ isOpen }) => useRecoveryCodes(isOpen), {
        initialProps: { isOpen: true },
      });

      // Assert: Verify display is reset to null values.
      expect(result.current.displayCodes).toHaveLength(16);
      expect(result.current.displayCodes.every((code) => code === null)).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  /**
   * Group of tests focusing on the code regeneration flow.
   */
  describe("Regenerate Action", () => {
    /**
     * Test case to verify that regeneration updates the UI to show the new codes in plaintext.
     */
    it("regenerates codes and updates display to plaintext", () => {
      // Arrange: Mock successful regeneration response.
      mockRegenerateRecoveryCodesMutate.mockImplementation((_, { onSuccess }) => {
        onSuccess({
          success: true,
          data: {
            recoveryCodes: ["new-code-1", "new-code-2"],
          },
        });
      });

      const { result } = renderHook(({ isOpen }) => useRecoveryCodes(isOpen), {
        initialProps: { isOpen: true },
      });

      // Act: Trigger regeneration.
      act(() => {
        result.current.handleRegenerate();
      });

      // Assert: Verify state transitioned to setup mode and shows plaintext.
      expect(mockRegenerateRecoveryCodesMutate).toHaveBeenCalled();
      expect(result.current.isInitialSetup).toBe(true);
      expect(result.current.displayCodes[0]).toBe("new-code-1");
    });

    /**
     * Test case to verify that regeneration failures do not crash the hook.
     */
    it("handles regenerate error gracefully", () => {
      // Arrange: Mock regeneration error.
      mockRegenerateRecoveryCodesMutate.mockImplementation((_, { onError }) => {
        onError();
      });

      const { result } = renderHook(({ isOpen }) => useRecoveryCodes(isOpen), {
        initialProps: { isOpen: true },
      });

      // Act: Trigger regeneration.
      act(() => {
        result.current.handleRegenerate();
      });

      // Assert: Verify loading is terminated.
      expect(mockRegenerateRecoveryCodesMutate).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  /**
   * Group of tests focusing on the "Copy to Clipboard" functionality.
   */
  describe("Copy Action", () => {
    /**
     * Test case to verify that plaintext codes are successfully sent to the clipboard API.
     */
    it("copies codes to clipboard when plain text codes exist", async () => {
      // Arrange: Provide plaintext codes to the hook.
      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableSingleCode },
      });

      // Act: Trigger copy action.
      await act(async () => {
        await result.current.handleCopy();
      });

      // Assert: Verify clipboard API call and success notification.
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("code-1"));
      expect(toast.success).toHaveBeenCalledWith(
        "Recovery codes copied to clipboard.",
        expect.any(Object)
      );
    });

    /**
     * Test case to verify that the hook falls back to `execCommand` in non-secure or legacy environments.
     */
    it("copies codes using fallback execCommand when clipboard API is unavailable", async () => {
      // Arrange: Force non-secure context to trigger fallback logic.
      Object.defineProperty(window, "isSecureContext", { value: false });

      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableSingleCode },
      });

      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      // Act: Trigger copy action.
      await act(async () => {
        await result.current.handleCopy();
      });

      // Assert: Verify DOM manipulation and legacy command execution.
      expect(document.execCommand).toHaveBeenCalledWith("copy");
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Recovery codes copied to clipboard.",
        expect.any(Object)
      );

      Object.defineProperty(window, "isSecureContext", { value: true });
    });

    /**
     * Test case to verify that failures in the legacy copy mechanism are reported to the user.
     */
    it("handles fallback copy failure when execCommand returns false", async () => {
      // Arrange: Mock `execCommand` returning failure.
      Object.defineProperty(window, "isSecureContext", { value: false });
      document.execCommand = vi.fn().mockReturnValue(false) as unknown as (
        commandId: string,
        showUI?: boolean,
        value?: string
      ) => boolean;

      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableSingleCode },
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act: Trigger copy.
      await act(async () => {
        await result.current.handleCopy();
      });

      // Assert: Verify error toast was shown.
      expect(document.execCommand).toHaveBeenCalledWith("copy");
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to copy codes to clipboard.",
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
      Object.defineProperty(window, "isSecureContext", { value: true });
    });

    /**
     * Test case to verify that clipboard API rejections are caught and displayed as errors.
     */
    it("handles copy error gracefully", async () => {
      // Arrange: Mock clipboard API rejection.
      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableSingleCode },
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (navigator.clipboard.writeText as unknown as Mock).mockRejectedValueOnce(
        new Error("Copy failed")
      );

      // Act: Trigger copy.
      await act(async () => {
        await result.current.handleCopy();
      });

      // Assert: Verify error notification.
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to copy codes to clipboard.",
        expect.any(Object)
      );
      consoleErrorSpy.mockRestore();
    });

    /**
     * Test case to verify that the copy action terminates early if no codes are present.
     */
    it("returns early when no codes available to copy", async () => {
      // Arrange: Render with empty code array.
      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableEmptyArray },
      });

      // Act: Trigger copy.
      await act(async () => {
        await result.current.handleCopy();
      });

      // Assert: Verify no clipboard activity or notifications.
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that the hook prevents copying masked placeholders to avoid sensitive data leakage.
     */
    it("does not copy if codes are masked", async () => {
      // Arrange: Mock a state where codes are fetched but masked.
      mockGetRecoveryCodesMutate.mockImplementation((_, { onSuccess }) => {
        onSuccess({
          success: "Codes fetched",
          data: {
            codeStatus: [true],
            totalCodes: 16,
            usedCount: 0,
            unusedCount: 16,
            hasRecoveryCodes: true,
          },
        });
      });

      const { result } = renderHook(({ isOpen }) => useRecoveryCodes(isOpen), {
        initialProps: { isOpen: true },
      });

      // Act: Trigger copy.
      await act(async () => {
        await result.current.handleCopy();
      });

      // Assert: Verify the masked strings were not sent to the clipboard.
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });

  /**
   * Group of tests focusing on the "Download as Text File" functionality.
   */
  describe("Download Action", () => {
    /**
     * Test case to verify that the download flow creates a temporary link and triggers a click.
     */
    it("triggers download when plain text codes exist", () => {
      // Arrange: Render with plaintext codes.
      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableSingleCode },
      });

      const mockLink = document.createElement("a");
      const clickSpy = vi.spyOn(mockLink, "click");
      const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(mockLink);
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      // Act: Trigger download.
      act(() => {
        result.current.handleDownload();
      });

      // Assert: Verify Blob creation and link interaction.
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);

      createElementSpy.mockRestore();
    });

    /**
     * Test case to verify that the temporary Blob URL is revoked to prevent memory leaks.
     */
    it("cleans up object URL after download", () => {
      // Arrange: Render with plaintext codes.
      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableSingleCode },
      });

      (global.URL.createObjectURL as unknown as Mock).mockReturnValue("blob:test-url");

      const mockLink = document.createElement("a");
      const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(mockLink);

      // Act: Trigger download.
      act(() => {
        result.current.handleDownload();
      });

      // Assert: Revocation should be delayed.
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();

      // Act: Advance timers to trigger cleanup logic.
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Assert: Verify URL was revoked.
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
      createElementSpy.mockRestore();
    });

    /**
     * Test case to verify that download failures are caught and reported.
     */
    it("handles download error gracefully", () => {
      // Arrange: Mock `createObjectURL` to throw.
      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableSingleCode },
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (global.URL.createObjectURL as unknown as Mock).mockImplementation(() => {
        throw new Error("Download Error");
      });

      // Act: Trigger download.
      act(() => {
        result.current.handleDownload();
      });

      // Assert: Verify error toast notification.
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to download recovery codes.",
        expect.any(Object)
      );
      consoleErrorSpy.mockRestore();
    });

    /**
     * Test case to verify that the download action terminates early if no codes are available.
     */
    it("returns early when no codes available to download", () => {
      // Arrange: Render with empty codes.
      const { result } = renderHook(({ isOpen, codes }) => useRecoveryCodes(isOpen, codes), {
        initialProps: { isOpen: true, codes: stableEmptyArray },
      });

      // Act: Trigger download.
      act(() => {
        result.current.handleDownload();
      });

      // Assert: Verify no URL creation or notifications occurred.
      expect(global.URL.createObjectURL).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  /**
   * Group of tests focusing on state cleanup when the UI is dismissed.
   */
  describe("State Reset", () => {
    /**
     * Test case to verify that the hook clears its local code storage when the modal is closed.
     */
    it("resets state when modal closes", () => {
      // Arrange: Render with active modal and codes.
      const { result, rerender } = renderHook(
        ({ isOpen, codes }) => useRecoveryCodes(isOpen, codes),
        { initialProps: { isOpen: true, codes: stableSingleCode } }
      );

      expect(result.current.displayCodes.length).toBeGreaterThan(0);

      // Act: Change `isOpen` prop to false.
      rerender({ isOpen: false, codes: stableSingleCode });

      act(() => {
        vi.runAllTimers();
      });

      // Assert: Verify `displayCodes` was reset to an empty array.
      expect(result.current.displayCodes).toEqual([]);
    });
  });
});
