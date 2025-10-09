import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "@/db/schema/authentication";
import { detectionStatusEnum } from "@/db/schema/enums";
import { uploads } from "@/db/schema/uploads";

// Stores every single object detection from every image for bounding box rendering
export const detections = pgTable(
  "detections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    uploadId: text("upload_id")
      .notNull()
      .references(() => uploads.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    originalLabel: text("original_label").notNull(),
    confidence: real("confidence"),
    originalConfidence: real("original_confidence"),
    xMin: real("x_min").notNull(),
    yMin: real("y_min").notNull(),
    xMax: real("x_max").notNull(),
    yMax: real("y_max").notNull(),
    status: detectionStatusEnum("status").notNull().default("model_generated"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    lastModifiedById: text("last_modified_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("detections_upload_id_idx").on(table.uploadId),
    index("detections_deleted_at_idx").on(table.deletedAt),
    index("detections_status_idx").on(table.status),
  ]
);
