import { HiMiniListBullet } from "react-icons/hi2";
import { BeatLoader } from "react-spinners";

/**
 * A component that renders a loading indicator for the history log.
 * It is displayed while the history data is being fetched.
 */
export const HistoryLogLoadingState = () => (
  <div className="flex h-full items-center justify-center p-6">
    <BeatLoader color="#16a34a" size={12} />
  </div>
);

HistoryLogLoadingState.displayName = "HistoryLogLoadingState";

/**
 * A component that renders an error message for the history log.
 * It is displayed if the history data fails to load.
 */
export const HistoryLogErrorState = () => (
  <div className="flex h-full flex-col items-center justify-center p-6 text-slate-500">
    <HiMiniListBullet className="mb-4 h-12 w-12 text-slate-300" />
    Failed to load history.
  </div>
);

HistoryLogErrorState.displayName = "HistoryLogErrorState";

/**
 * A component that renders an empty state message for the history log.
 * It is displayed when there are no history entries to show for the case.
 */
export const HistoryLogEmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center p-6 text-slate-500">
    <HiMiniListBullet className="mb-4 h-12 w-12 text-slate-300" />
    No history available.
  </div>
);

HistoryLogEmptyState.displayName = "HistoryLogEmptyState";
