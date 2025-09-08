import { create } from "zustand";

/**
 * Defines the shape of the state and actions for the dashboard's polling logic.
 */
interface DashboardState {
  /** The current polling interval in milliseconds. This value adapts based on user activity and data changes. */
  pollInterval: number;
  /** A flag indicating if the user is considered active. */
  isUserActive: boolean;
  /** The timestamp of the last detected user activity. */
  lastActivity: number;
  /** The ID of the `setInterval` used to periodically check for user inactivity. */
  activityCheckInterval: NodeJS.Timeout | null;
  /** A flag to ensure that global event listeners for activity detection are only initialized once. */
  listenersInitialized: boolean;
  /** An action to reset the polling interval to its fastest rate. */
  resetToFastPolling: () => void;
  /** An action to gradually slow down the polling interval. */
  increasePollingInterval: () => void;
  /** An action to update the `lastActivity` timestamp upon user interaction. */
  updateActivity: () => void;
  /** An action to set up the global event listeners and the inactivity check interval. */
  initializeActivityListeners: () => void;
  /** An action to clean up the inactivity check interval to prevent memory leaks. */
  cleanupActivityListeners: () => void;
}

/**
 * A shared Zustand store that orchestrates an adaptive polling strategy. It slows down
 * polling when the user is inactive or when no new data is found, and speeds it up
 * when the user is active or data changes. This optimizes performance and reduces server load.
 */
export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial fast polling rate (10 seconds).
  pollInterval: 10000,
  isUserActive: true,
  lastActivity: Date.now(),
  activityCheckInterval: null,
  listenersInitialized: false,

  /**
   * Resets the polling interval to its fastest rate (10 seconds). This should be called
   * whenever new data is detected to ensure the UI feels responsive.
   */
  resetToFastPolling: () => {
    set({ pollInterval: 10000 });
  },

  /**
   * Increases the polling interval using an exponential back-off strategy, capped at a
   * maximum value (30 seconds). This is called when a poll returns no new data,
   * gradually reducing the frequency of requests.
   */
  increasePollingInterval: () => {
    set((state) => ({
      // Increase interval by 50%, but don't exceed 30 seconds.
      pollInterval: Math.min(state.pollInterval * 1.5, 30000),
    }));
  },

  /**
   * Called by global event listeners to record user interaction. It updates the
   * `lastActivity` timestamp and ensures the `isUserActive` flag is true.
   */
  updateActivity: () => {
    const state = get();
    set({ lastActivity: Date.now() });

    // If the user was previously marked as inactive, immediately mark them as active again.
    if (!state.isUserActive) {
      set({ isUserActive: true });
    }
  },

  /**
   * Sets up the global event listeners for user activity and the `setInterval` that
   * checks for inactivity. This function is idempotent and will only run once.
   */
  initializeActivityListeners: () => {
    const state = get();

    // Prevent adding listeners multiple times.
    if (state.listenersInitialized) return;

    /** A shared handler for all user interaction events. */
    const handleActivity = () => {
      get().updateActivity();
    };

    /**
     * A periodic check that runs every 30 seconds to determine if the user has been
     * inactive for more than a set threshold (2 minutes).
     */
    const checkInterval = setInterval(() => {
      const currentState = get();
      const timeSinceActivity = Date.now() - currentState.lastActivity;
      const inactivityThreshold = 120000; // 2 minutes
      const shouldBeActive = timeSinceActivity <= inactivityThreshold;

      // Only update the state if the activity status has actually changed.
      if (shouldBeActive !== currentState.isUserActive) {
        set({ isUserActive: shouldBeActive });
      }
    }, 30000); // Check every 30 seconds.

    // Attach passive event listeners for common user activity events.
    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("click", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });

    set({
      activityCheckInterval: checkInterval,
      listenersInitialized: true,
    });
  },

  /**
   * Cleans up the `setInterval` to prevent memory leaks. This should be called when
   * the application or the root component that uses this store unmounts.
   */
  cleanupActivityListeners: () => {
    const state = get();

    if (state.activityCheckInterval) {
      clearInterval(state.activityCheckInterval);
    }

    set({
      activityCheckInterval: null,
      listenersInitialized: false,
    });
  },
}));
