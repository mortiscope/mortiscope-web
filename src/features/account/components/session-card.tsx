import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { SessionInformation } from "@/features/account/components/session-information";

interface SessionCardProps {
  sessionItem: UserSessionInfo;
  isCurrentSession: boolean;
  onSessionClick: (sessionItem: UserSessionInfo) => void;
}

/**
 * Session card component that displays individual session information.
 * Handles session display, current session highlighting, and click interactions.
 */
export const SessionCard = ({
  sessionItem,
  isCurrentSession,
  onSessionClick,
}: SessionCardProps) => {
  return (
    <div
      key={sessionItem.id}
      onClick={() => onSessionClick(sessionItem)}
      className={`group relative flex h-full cursor-pointer flex-col rounded-xl border-2 bg-white p-4 transition-all duration-300 ease-in-out ${
        isCurrentSession
          ? "border-emerald-500 bg-emerald-50"
          : "border-slate-200 hover:border-emerald-300"
      }`}
    >
      {isCurrentSession && (
        <Badge className="font-inter absolute -top-2 -right-2 rounded-md bg-emerald-500 text-xs font-normal text-white hover:bg-emerald-500">
          Current
        </Badge>
      )}

      {/* Session Info Section */}
      <SessionInformation sessionItem={sessionItem} />

      {/* Review Button */}
      <div className="mt-4">
        <Button
          size="sm"
          variant="outline"
          className={`font-inter w-full border-2 font-normal transition-all duration-300 ease-in-out group-hover:border-emerald-300 group-hover:bg-emerald-50 group-hover:text-emerald-700 hover:cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 ${
            isCurrentSession
              ? "border-emerald-500 text-emerald-700"
              : "border-slate-200 text-slate-600"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSessionClick(sessionItem);
          }}
        >
          Review
        </Button>
      </div>
    </div>
  );
};

SessionCard.displayName = "SessionCard";
