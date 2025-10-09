import { createId } from "@paralleldrive/cuid2";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "@/db/schema/authentication";
import { cases } from "@/db/schema/cases";
import { exportFormatEnum, exportStatusEnum } from "@/db/schema/enums";

// Tracks the state and result of data export jobs initiated by a user.
export const exports = pgTable(
  "exports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: exportStatusEnum("status").notNull().default("pending"),
    format: exportFormatEnum("format").notNull(),
    s3Key: text("s3_key"),
    failureReason: text("failure_reason"),
    passwordProtected: boolean("password_protected").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("exports_user_id_idx").on(table.userId),
    index("exports_case_id_idx").on(table.caseId),
    index("exports_status_idx").on(table.status),
    index("exports_created_at_idx").on(table.createdAt),
  ]
);
