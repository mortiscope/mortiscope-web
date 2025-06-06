import type { AdapterAccount } from "@auth/core/adapters";
import { createId } from "@paralleldrive/cuid2";
import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

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

// Stores metadata for files uploaded to the S3 bucket
export const uploads = pgTable("uploads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
