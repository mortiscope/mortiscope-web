CREATE TABLE "revoked_jwt_tokens" (
	"jti" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_token" text NOT NULL,
	"revoked_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_token" text NOT NULL,
	"device_type" text,
	"device_vendor" text,
	"device_model" text,
	"browser_name" text,
	"browser_version" text,
	"os_name" text,
	"os_version" text,
	"ip_address" text NOT NULL,
	"country" text,
	"region" text,
	"city" text,
	"timezone" text,
	"user_agent" text NOT NULL,
	"is_current_session" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revoked_jwt_tokens" ADD CONSTRAINT "revoked_jwt_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_session_token_sessions_session_token_fk" FOREIGN KEY ("session_token") REFERENCES "public"."sessions"("session_token") ON DELETE cascade ON UPDATE no action;