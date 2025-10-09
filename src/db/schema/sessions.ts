import { createId } from "@paralleldrive/cuid2";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { sessions, users } from "@/db/schema/authentication";

// Stores detailed session information for device and location tracking
export const userSessions = pgTable(
  "user_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token")
      .notNull()
      .references(() => sessions.sessionToken, { onDelete: "cascade" }),
    deviceType: text("device_type"),
    deviceVendor: text("device_vendor"),
    deviceModel: text("device_model"),
    browserName: text("browser_name"),
    browserVersion: text("browser_version"),
    osName: text("os_name"),
    osVersion: text("os_version"),
    ipAddress: text("ip_address").notNull(),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    timezone: text("timezone"),
    userAgent: text("user_agent").notNull(),
    isCurrentSession: boolean("is_current_session").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp("last_active_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => [
    index("user_sessions_session_token_idx").on(table.sessionToken),
    index("user_sessions_user_id_idx").on(table.userId),
    index("user_sessions_user_id_last_active_idx").on(table.userId, table.lastActiveAt),
  ]
);
