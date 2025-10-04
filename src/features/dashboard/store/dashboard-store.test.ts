import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboardStore } from "@/features/dashboard/store/dashboard-store";

/**
 * Test suite for the dashboard Zustand store and its activity tracking logic.
 */
describe("useDashboardStore", () => {
  // Capture the initial state to facilitate state resets between test runs.
  const initialState = useDashboardStore.getState();

  // Configure fake timers and reset the store to its initial state before each test.
  beforeEach(() => {
    vi.useFakeTimers();
    useDashboardStore.setState(initialState, true);
  });

  // Clean up global listeners and restore real timers after each test to prevent side effects.
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    useDashboardStore.getState().cleanupActivityListeners();
  });

  /**
   * Test case to verify the store's initial configuration.
   */
  it("initializes with default values", () => {
    // Act: Retrieve the current state of the store.
    const state = useDashboardStore.getState();

    // Assert: Verify that polling, activity, and listener defaults are correctly set.
    expect(state.pollInterval).toBe(10000);
    expect(state.isUserActive).toBe(true);
    expect(state.listenersInitialized).toBe(false);
    expect(state.activityCheckInterval).toBeNull();
  });

  /**
   * Test group for the fast polling reset functionality.
   */
  describe("resetToFastPolling", () => {
    /**
     * Test case to verify that the polling interval returns to the base frequency.
     */
    it("resets pollInterval to 10000", () => {
      // Arrange: Manually set a slow polling interval.
      useDashboardStore.setState({ pollInterval: 30000 });

      // Act: Invoke the reset action.
      act(() => {
        useDashboardStore.getState().resetToFastPolling();
      });

      // Assert: Verify `pollInterval` returned to the default fast value.
      expect(useDashboardStore.getState().pollInterval).toBe(10000);
    });
  });

  /**
   * Test group for the dynamic polling interval increment logic.
   */
  describe("increasePollingInterval", () => {
    /**
     * Test case to verify the incremental increase formula of the interval.
     */
    it("increases interval by 50%", () => {
      // Act: Increase the interval from the default 10000.
      act(() => {
        useDashboardStore.getState().increasePollingInterval();
      });

      // Assert: Verify the new interval reflects a 50% increase.
      expect(useDashboardStore.getState().pollInterval).toBe(15000);
    });

    /**
     * Test case to ensure the interval does not exceed the predefined maximum.
     */
    it("caps the interval at 30000", () => {
      // Arrange: Set the interval close to the maximum threshold.
      useDashboardStore.setState({ pollInterval: 25000 });

      // Act: Attempt to increase the interval again.
      act(() => {
        useDashboardStore.getState().increasePollingInterval();
      });

      // Assert: Verify the interval is capped at exactly 30000.
      expect(useDashboardStore.getState().pollInterval).toBe(30000);
    });
  });

  /**
   * Test group for manual activity update actions.
   */
  describe("updateActivity", () => {
    /**
     * Test case to verify the timestamp refresh logic.
     */
    it("updates lastActivity timestamp", () => {
      // Arrange: Capture the starting time and current state.
      const initialTime = Date.now();
      const state = useDashboardStore.getState();

      // Act: Advance time and trigger an activity update.
      vi.advanceTimersByTime(5000);
      act(() => {
        state.updateActivity();
      });

      // Assert: Verify that `lastActivity` has been updated to a later timestamp.
      const newState = useDashboardStore.getState();
      expect(newState.lastActivity).toBeGreaterThan(initialTime);
    });

    /**
     * Test case to verify that an activity update restores the active status.
     */
    it("reactivates user if inactive", () => {
      // Arrange: Force the store into an inactive state.
      useDashboardStore.setState({ isUserActive: false });

      // Act: Trigger an activity update.
      act(() => {
        useDashboardStore.getState().updateActivity();
      });

      // Assert: Verify `isUserActive` is toggled back to true.
      expect(useDashboardStore.getState().isUserActive).toBe(true);
    });
  });

  /**
   * Test group for the initialization of DOM event listeners and background intervals.
   */
  describe("initializeActivityListeners", () => {
    /**
     * Test case to ensure idempotent initialization behavior.
     */
    it("initializes listeners and interval only once", () => {
      // Arrange: Create spies for global event and interval registration.
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      const setIntervalSpy = vi.spyOn(window, "setInterval");

      // Act: Call initialization twice.
      act(() => {
        useDashboardStore.getState().initializeActivityListeners();
      });

      // Assert: Verify first-time setup occurred.
      expect(useDashboardStore.getState().listenersInitialized).toBe(true);
      expect(useDashboardStore.getState().activityCheckInterval).not.toBeNull();
      expect(addEventListenerSpy).toHaveBeenCalled();
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

      act(() => {
        useDashboardStore.getState().initializeActivityListeners();
      });

      // Assert: Verify the initialization flag remains true and setup was not duplicated.
      expect(useDashboardStore.getState().listenersInitialized).toBe(true);
    });

    /**
     * Test case to verify automatic inactivity detection after a period of idle time.
     */
    it("sets user to inactive after threshold elapsed", () => {
      // Arrange: Initialize the monitoring logic.
      act(() => {
        useDashboardStore.getState().initializeActivityListeners();
      });

      expect(useDashboardStore.getState().isUserActive).toBe(true);

      // Act: Advance virtual time beyond the inactivity threshold.
      act(() => {
        vi.advanceTimersByTime(120000 + 30000);
      });

      // Assert: Verify that the background check has set the user to inactive.
      expect(useDashboardStore.getState().isUserActive).toBe(false);
    });

    /**
     * Test case to verify that periodic activity prevents the inactivity transition.
     */
    it("keeps user active if activity occurs within threshold", () => {
      // Arrange: Start activity monitoring.
      act(() => {
        useDashboardStore.getState().initializeActivityListeners();
      });

      // Act: Advance time in steps, simulating active use.
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Assert: Verify user status remains active.
      expect(useDashboardStore.getState().isUserActive).toBe(true);
    });

    /**
     * Test case to verify that browser mouse events trigger a timestamp update in the store.
     */
    it("updates activity on window events", () => {
      // Arrange: Initialize listeners and record the starting timestamp.
      act(() => {
        useDashboardStore.getState().initializeActivityListeners();
      });

      const initialTime = useDashboardStore.getState().lastActivity;

      // Act: Advance time and dispatch a mock mouse movement event.
      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        window.dispatchEvent(new Event("mousemove"));
      });

      // Assert: Verify the event listener updated the `lastActivity` value.
      expect(useDashboardStore.getState().lastActivity).toBeGreaterThan(initialTime);
    });
  });

  /**
   * Test group for the removal of listeners and intervals.
   */
  describe("cleanupActivityListeners", () => {
    /**
     * Test case to verify that the store correctly halts background checks.
     */
    it("clears interval and resets initialization flag", () => {
      // Arrange: Create a spy for interval clearing and perform setup.
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");

      act(() => {
        useDashboardStore.getState().initializeActivityListeners();
      });

      const intervalId = useDashboardStore.getState().activityCheckInterval;
      expect(intervalId).not.toBeNull();

      // Act: Perform cleanup.
      act(() => {
        useDashboardStore.getState().cleanupActivityListeners();
      });

      // Assert: Ensure the specific interval was cleared and flags were reset.
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
      expect(useDashboardStore.getState().activityCheckInterval).toBeNull();
      expect(useDashboardStore.getState().listenersInitialized).toBe(false);
    });

    /**
     * Test case to ensure cleanup logic handles uninitialized states safely.
     */
    it("does nothing if interval is not set", () => {
      // Arrange: Spy on the clear function.
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");

      // Act: Attempt cleanup without prior initialization.
      act(() => {
        useDashboardStore.getState().cleanupActivityListeners();
      });

      // Assert: Ensure no attempts to clear an interval were made.
      expect(clearIntervalSpy).not.toHaveBeenCalled();
    });
  });
});
