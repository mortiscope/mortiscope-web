CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "analysis_results" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_results" ADD COLUMN "status" "analysis_status" DEFAULT 'pending' NOT NULL;