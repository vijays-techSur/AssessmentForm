CREATE TABLE "assessment_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"launch_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_modified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_modified_by" text,
	CONSTRAINT "assessment_config_singleton_check" CHECK ("assessment_config"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "config_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" text NOT NULL,
	"field_changed" text NOT NULL,
	"old_value" text,
	"new_value" text
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"option_text" text NOT NULL,
	"display_order" integer NOT NULL,
	"is_other" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" text NOT NULL,
	"question_text" text NOT NULL,
	"question_type" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"has_other" boolean DEFAULT false NOT NULL,
	"display_order" integer NOT NULL,
	"help_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_question_type_check" CHECK ("questions"."question_type" IN ('single_choice', 'multi_choice', 'likert', 'ranking', 'free_text_short', 'free_text_long'))
);
--> statement-breakpoint
CREATE TABLE "respondents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"team_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "respondents_email_unique" UNIQUE("email"),
	CONSTRAINT "respondents_team_type_check" CHECK ("respondents"."team_type" IN ('program_project', 'platform_engineering', 'infrastructure_cloud', 'data_api_governance'))
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer_payload" jsonb NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_routing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_type" text NOT NULL,
	"section_id" text NOT NULL,
	"display_order" integer NOT NULL,
	"is_included" boolean DEFAULT true NOT NULL,
	CONSTRAINT "section_routing_team_type_check" CHECK ("section_routing"."team_type" IN ('program_project', 'platform_engineering', 'infrastructure_cloud', 'data_api_governance'))
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"respondent_id" uuid NOT NULL,
	"submission_status" text DEFAULT 'draft' NOT NULL,
	"current_section_index" integer DEFAULT 0 NOT NULL,
	"section_ids_ordered" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone,
	"last_saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_modified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_submission_status_check" CHECK ("sessions"."submission_status" IN ('draft', 'submitted'))
);
--> statement-breakpoint
CREATE TABLE "system_owner_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "system_owner_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_routing" ADD CONSTRAINT "section_routing_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_options_question_order_uniq" ON "question_options" USING btree ("question_id","display_order");--> statement-breakpoint
CREATE INDEX "idx_question_options_question_id" ON "question_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_questions_section_id" ON "questions" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_respondents_email_lower" ON "respondents" USING btree (LOWER("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "responses_session_question_uniq" ON "responses" USING btree ("session_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_responses_session_id" ON "responses" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_responses_question_id" ON "responses" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "section_routing_team_section_uniq" ON "section_routing" USING btree ("team_type","section_id");--> statement-breakpoint
CREATE INDEX "idx_section_routing_team_type" ON "section_routing" USING btree ("team_type");--> statement-breakpoint
CREATE INDEX "idx_sessions_respondent_id" ON "sessions" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_submission_status" ON "sessions" USING btree ("submission_status");--> statement-breakpoint
CREATE INDEX "idx_sessions_submitted_at" ON "sessions" USING btree ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_system_owner_emails_lower" ON "system_owner_emails" USING btree (LOWER("email"));