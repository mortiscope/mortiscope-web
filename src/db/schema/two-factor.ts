import { createId } from "@paralleldrive/cuid2";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "@/db/schema/authentication";

// Stores two-factor authentication settings for users
export const userTwoFactor = pgTable("user_two_factor", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  backupCodesGenerated: boolean("backup_codes_generated").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Stores recovery/backup codes for two-factor authentication
export const twoFactorRecoveryCodes = pgTable(
  "two_factor_recovery_codes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    used: boolean("used").notNull().default(false),
    usedAt: timestamp("used_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("two_factor_recovery_codes_user_id_idx").on(table.userId)]
);

// Stores blacklisted JWT tokens to prevent their reuse after session revocation
export const revokedJwtTokens = pgTable(
  "revoked_jwt_tokens",
  {
    jti: text("jti").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull(),
    revokedAt: timestamp("revoked_at", { mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  },
  (table) => [index("revoked_jwt_tokens_session_token_idx").on(table.sessionToken)]
);
