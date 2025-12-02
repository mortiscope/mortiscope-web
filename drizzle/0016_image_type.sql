CREATE TYPE "public"."image_type" AS ENUM('macro', 'field');--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "image_type" "image_type";