import { motion } from "framer-motion";

import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { SessionCard } from "@/features/account/components/session-card";

interface SessionListProps {
  sessions: UserSessionInfo[];
  currentSessionToken: string | null;
  onSessionClick: (sessionItem: UserSessionInfo) => void;
}

/**
 * Session list component that renders the grid of session cards.
 * Handles the layout and animation of multiple session cards.
 */
export const SessionList = ({
  sessions,
  currentSessionToken,
  onSessionClick,
}: SessionListProps) => {
  return (
    <motion.div
      key={sessions.length}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3"
    >
      {sessions.map((sessionItem: UserSessionInfo) => {
        // A derived boolean to identify the current device's session.
        const isCurrentSession = currentSessionToken === sessionItem.sessionToken;

        return (
          <SessionCard
            key={sessionItem.id}
            sessionItem={sessionItem}
            isCurrentSession={isCurrentSession}
            onSessionClick={onSessionClick}
          />
        );
      })}
    </motion.div>
  );
};

SessionList.displayName = "SessionList";
