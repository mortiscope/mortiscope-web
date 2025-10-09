import { createId } from "@paralleldrive/cuid2";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "@/db/schema/authentication";
import { cases } from "@/db/schema/cases";

// Stores a detailed audit trail of all changes made to a case.
export const caseAuditLogs = pgTable(
  "case_audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    batchId: text("batch_id").notNull(),
    timestamp: timestamp("timestamp", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    field: text("field").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
  },
  (table) => [
    index("case_audit_logs_case_id_idx").on(table.caseId),
    index("case_audit_logs_case_id_timestamp_idx").on(table.caseId, table.timestamp),
  ]
);
