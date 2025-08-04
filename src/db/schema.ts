import type { AdapterAccount } from "@auth/core/adapters";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// Enum to define the possible statuses of an analysis job for type safety.
export const analysisStatusEnum = pgEnum("analysis_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// Enum to define the lifecycle status of a case.
export const caseStatusEnum = pgEnum("case_status", ["draft", "active"]);

// Enum to define the possible statuses of an export job.
export const exportStatusEnum = pgEnum("export_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// Enum to define the possible formats for an export.
export const exportFormatEnum = pgEnum("export_format", ["raw_data", "pdf", "labelled_images"]);

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
  status: analysisStatusEnum("status").notNull().default("pending"),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }),
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

// Tracks the state and result of data export jobs initiated by a user.
export const exports = pgTable("exports", {
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
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Defines the relationships for the `users` table.
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  cases: many(cases),
  exports: many(exports),
}));

// Defines the relationship from an `account` back to its owning `user`.
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// Defines the relationship from a `session` back to its owning `user`.
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Defines the relationships for a `case`, linking it to its owner and related data.
export const casesRelations = relations(cases, ({ one, many }) => ({
  user: one(users, {
    fields: [cases.userId],
    references: [users.id],
  }),
  uploads: many(uploads),
  analysisResult: one(analysisResults, {
    fields: [cases.id],
    references: [analysisResults.caseId],
  }),
  exports: many(exports),
}));

// Defines the relationships for an `upload`, linking it to its parent entities.
export const uploadsRelations = relations(uploads, ({ one, many }) => ({
  case: one(cases, {
    fields: [uploads.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [uploads.userId],
    references: [users.id],
  }),
  detections: many(detections),
}));

// Defines the one-to-one relationship from an `analysis result` back to its `case`.
export const analysisResultsRelations = relations(analysisResults, ({ one }) => ({
  case: one(cases, {
    fields: [analysisResults.caseId],
    references: [cases.id],
  }),
}));

// Defines the relationship from a `detection` back to the single `upload` it belongs to.
export const detectionsRelations = relations(detections, ({ one }) => ({
  upload: one(uploads, {
    fields: [detections.uploadId],
    references: [uploads.id],
  }),
}));

// Defines the relationships for an `export` job, linking back to its parent entities.
export const exportsRelations = relations(exports, ({ one }) => ({
  case: one(cases, {
    fields: [exports.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [exports.userId],
    references: [users.id],
  }),
}));
