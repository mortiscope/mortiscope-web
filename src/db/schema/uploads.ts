import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "@/db/schema/authentication";
import { cases } from "@/db/schema/cases";

// Stores metadata for each file uploaded to S3, linking it to a user and a case
export const uploads = pgTable(
  "uploads",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    size: integer("size").notNull(),
    type: text("type").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    caseId: text("case_id").references(() => cases.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("uploads_user_id_idx").on(table.userId),
    index("uploads_case_id_idx").on(table.caseId),
  ]
);
