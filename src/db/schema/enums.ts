import { pgEnum } from "drizzle-orm/pg-core";

// Enum to define the possible statuses of an analysis job for type safety.
export const analysisStatusEnum = pgEnum("analysis_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// Enum to define the lifecycle status of a case.
export const caseStatusEnum = pgEnum("case_status", ["draft", "active"]);

// Enum to define the status of a user-verified or created detection.
export const detectionStatusEnum = pgEnum("detection_status", [
  "model_generated",
  "user_created",
  "user_confirmed",
  "user_edited",
  "user_edited_confirmed",
]);

// Enum to define the possible statuses of an export job.
export const exportStatusEnum = pgEnum("export_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// Enum to define the possible formats for an export.
export const exportFormatEnum = pgEnum("export_format", ["raw_data", "pdf", "labelled_images"]);
