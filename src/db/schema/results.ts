import { jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

import { cases } from "@/db/schema/cases";
import { analysisStatusEnum } from "@/db/schema/enums";

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
