import type { AdapterAccount } from "@auth/core/adapters";
import { createId } from "@paralleldrive/cuid2";
import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// Represents the core user profile in the application
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletionScheduledAt: timestamp("deletion_scheduled_at", { mode: "date" }),
});

// Links user accounts to OAuth providers
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

// Stores user session data to manage authentication state
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// Stores tokens for one-time email verification links
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// Stores tokens to securely verify a user's request to change their email
export const emailChangeTokens = pgTable("email_change_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  newEmail: text("new_email").notNull(),
});

// Stores tokens for the password reset process
export const forgotPasswordTokens = pgTable(
  "forgot_password_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (fpt) => [primaryKey({ columns: [fpt.identifier, fpt.token] })]
);

// Stores tokens to confirm an account deletion request
export const accountDeletionTokens = pgTable(
  "account_deletion_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (adt) => [primaryKey({ columns: [adt.identifier, adt.token] })]
);

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
  },
  (table) => [uniqueIndex("case_name_idx").on(table.userId, table.caseName)]
);

// Stores metadata for each file uploaded to S3, linking it to a user and a case
export const uploads = pgTable("uploads", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  caseId: text("case_id").references(() => cases.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// Stores the aggregated results of the detection and PMI computation for a specific case
export const analysisResults = pgTable("analysis_results", {
  caseId: text("case_id")
    .primaryKey()
    .references(() => cases.id, { onDelete: "cascade" }),
  totalCounts: jsonb("total_counts"),
  oldestStageDetected: text("oldest_stage_detected"),
  pmiSourceImageKey: text("pmi_source_image_key"),
  pmiDays: real("pmi_days"),
  pmiHours: real("pmi_hours"),
  pmiMinutes: real("pmi_minutes"),
  stageUsedForCalculation: text("stage_used_for_calculation"),
  temperatureProvided: real("temperature_provided"),
  calculatedAdh: real("calculated_adh"),
  ldtUsed: real("ldt_used"),
  explanation: text("explanation"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Stores every single object detection from every image for bounding box rendering
export const detections = pgTable("detections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  uploadId: text("upload_id")
    .notNull()
    .references(() => uploads.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  confidence: real("confidence").notNull(),
  xMin: real("x_min").notNull(),
  yMin: real("y_min").notNull(),
  xMax: real("x_max").notNull(),
  yMax: real("y_max").notNull(),
});
