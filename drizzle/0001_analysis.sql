CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"case_name" varchar(256) NOT NULL,
	"temperature_celsius" real NOT NULL,
	"location_region" text NOT NULL,
	"location_province" text NOT NULL,
	"location_city" text NOT NULL,
	"location_barangay" text NOT NULL,
	"case_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "case_id" integer;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_name_idx" ON "cases" USING btree ("user_id","case_name");--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;