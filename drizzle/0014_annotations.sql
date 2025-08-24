CREATE TYPE "public"."detection_status" AS ENUM('model_generated', 'user_created', 'user_confirmed', 'user_edited');--> statement-breakpoint
ALTER TABLE "detections" ALTER COLUMN "confidence" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "detections" ADD COLUMN "original_confidence" real;--> statement-breakpoint
ALTER TABLE "detections" ADD COLUMN "status" "detection_status" DEFAULT 'model_generated' NOT NULL;--> statement-breakpoint
ALTER TABLE "detections" ADD COLUMN "created_by_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "detections" ADD COLUMN "last_modified_by_id" text;--> statement-breakpoint
ALTER TABLE "detections" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "detections" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "detections" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "width" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "height" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "detections" ADD CONSTRAINT "detections_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detections" ADD CONSTRAINT "detections_last_modified_by_id_users_id_fk" FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;