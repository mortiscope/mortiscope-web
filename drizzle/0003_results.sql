CREATE TABLE "analysis_results" (
	"case_id" text PRIMARY KEY NOT NULL,
	"total_counts" jsonb,
	"oldest_stage_detected" text,
	"pmi_source_image_key" text,
	"pmi_days" real,
	"pmi_hours" real,
	"pmi_minutes" real,
	"stage_used_for_calculation" text,
	"temperature_provided" real,
	"calculated_adh" real,
	"ldt_used" real,
	"explanation" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detections" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"label" text NOT NULL,
	"confidence" real NOT NULL,
	"x_min" real NOT NULL,
	"y_min" real NOT NULL,
	"x_max" real NOT NULL,
	"y_max" real NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detections" ADD CONSTRAINT "detections_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;