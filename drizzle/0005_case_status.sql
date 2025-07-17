CREATE TYPE "public"."case_status" AS ENUM('draft', 'active');--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "status" "case_status" DEFAULT 'draft' NOT NULL;