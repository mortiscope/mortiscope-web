import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  index,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/authentication";
import { caseStatusEnum } from "@/db/schema/enums";

// Stores the main details for each case created by a user
export const cases = pgTable(
  "cases",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    caseName: varchar("case_name", { length: 256 }).notNull(),
    status: caseStatusEnum("status").notNull().default("draft"),
    temperatureCelsius: real("temperature_celsius").notNull(),
    locationRegion: text("location_region").notNull(),
    locationProvince: text("location_province").notNull(),
    locationCity: text("location_city").notNull(),
    locationBarangay: text("location_barangay").notNull(),
    caseDate: timestamp("case_date", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    recalculationNeeded: boolean("recalculation_needed").notNull().default(false),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("case_name_idx").on(table.userId, table.caseName),
    index("cases_user_id_idx").on(table.userId),
    index("cases_status_idx").on(table.status),
    index("cases_created_at_idx").on(table.createdAt),
  ]
);
