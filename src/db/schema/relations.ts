import { relations } from "drizzle-orm";

import { detections } from "@/db/schema/annotations";
import { caseAuditLogs } from "@/db/schema/audit-logs";
import { accounts, sessions, users } from "@/db/schema/authentication";
import { cases } from "@/db/schema/cases";
import { exports } from "@/db/schema/exports";
import { analysisResults } from "@/db/schema/results";
import { userSessions } from "@/db/schema/sessions";
import { revokedJwtTokens, twoFactorRecoveryCodes, userTwoFactor } from "@/db/schema/two-factor";
import { uploads } from "@/db/schema/uploads";

// Defines the relationships for the `users` table.
export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  userSessions: many(userSessions),
  cases: many(cases),
  exports: many(exports),
  caseAuditLogs: many(caseAuditLogs),
  twoFactor: one(userTwoFactor, {
    fields: [users.id],
    references: [userTwoFactor.userId],
  }),
  recoveryCodes: many(twoFactorRecoveryCodes),
  revokedJwtTokens: many(revokedJwtTokens),
  createdDetections: many(detections, { relationName: "createdBy" }),
  modifiedDetections: many(detections, { relationName: "lastModifiedBy" }),
}));

// Defines the relationship from an `account` back to its owning `user`.
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// Defines the relationship from a `session` back to its owning `user`.
export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  userSessions: many(userSessions),
}));

// Defines the relationships for detailed user sessions
export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [userSessions.sessionToken],
    references: [sessions.sessionToken],
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
  auditLogs: many(caseAuditLogs),
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
  createdBy: one(users, {
    fields: [detections.createdById],
    references: [users.id],
    relationName: "createdBy",
  }),
  lastModifiedBy: one(users, {
    fields: [detections.lastModifiedById],
    references: [users.id],
    relationName: "lastModifiedBy",
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

// Defines the relationships for a `case audit log`, linking it to its parent entities.
export const caseAuditLogsRelations = relations(caseAuditLogs, ({ one }) => ({
  case: one(cases, {
    fields: [caseAuditLogs.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [caseAuditLogs.userId],
    references: [users.id],
  }),
}));

// Defines the relationships for two-factor authentication
export const userTwoFactorRelations = relations(userTwoFactor, ({ one }) => ({
  user: one(users, {
    fields: [userTwoFactor.userId],
    references: [users.id],
  }),
}));

export const twoFactorRecoveryCodesRelations = relations(twoFactorRecoveryCodes, ({ one }) => ({
  user: one(users, {
    fields: [twoFactorRecoveryCodes.userId],
    references: [users.id],
  }),
}));

export const revokedJwtTokensRelations = relations(revokedJwtTokens, ({ one }) => ({
  user: one(users, {
    fields: [revokedJwtTokens.userId],
    references: [users.id],
  }),
}));
