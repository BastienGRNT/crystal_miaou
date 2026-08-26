CREATE TYPE "public"."cat_activity_level" AS ENUM('faible', 'modere', 'eleve');--> statement-breakpoint
CREATE TYPE "public"."cat_sex" AS ENUM('male', 'femelle');--> statement-breakpoint
CREATE TYPE "public"."cat_special_condition" AS ENUM('aucune', 'gestation', 'croissance', 'surpoids');--> statement-breakpoint
CREATE TYPE "public"."food_legal_status" AS ENUM('complet', 'complementaire');--> statement-breakpoint
CREATE TYPE "public"."food_type" AS ENUM('croquette', 'patee', 'friandise');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"issuer" text,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"birth_date" date,
	"sex" "cat_sex" NOT NULL,
	"sterilized" boolean NOT NULL,
	"activity_level" "cat_activity_level" NOT NULL,
	"has_outdoor_access" boolean DEFAULT false NOT NULL,
	"special_condition" "cat_special_condition" NOT NULL,
	"active_croquette_food_id" text,
	"active_patee_food_id" text,
	"active_friandise_food_id" text,
	"friandise_quantite_totale_g" numeric(6, 2),
	"patee_nombre_paquets_override" numeric(4, 1),
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_member" (
	"id" text PRIMARY KEY NOT NULL,
	"cat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_weight_log" (
	"id" text PRIMARY KEY NOT NULL,
	"cat_id" text NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"recorded_at" date NOT NULL,
	"recorded_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"cat_id" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_plan_slot" (
	"id" text PRIMARY KEY NOT NULL,
	"daily_plan_id" text NOT NULL,
	"time_of_day" text NOT NULL,
	"food_type" "food_type" DEFAULT 'croquette' NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"type" "food_type" NOT NULL,
	"em_kcal_100g" numeric(6, 2),
	"em_estimee" boolean DEFAULT false NOT NULL,
	"package_size_g" numeric(6, 2),
	"proteines_g_100g" numeric(5, 2) NOT NULL,
	"lipides_g_100g" numeric(5, 2) NOT NULL,
	"humidite_g_100g" numeric(5, 2),
	"humidite_estimee" boolean DEFAULT false NOT NULL,
	"fibres_g_100g" numeric(5, 2) NOT NULL,
	"cendres_g_100g" numeric(5, 2) NOT NULL,
	"glucides_g_100g" numeric(5, 2),
	"glucides_estimes" boolean DEFAULT false NOT NULL,
	"calcium_g_100g" numeric(5, 3),
	"phosphore_g_100g" numeric(5, 3),
	"taurine_g_100g" numeric(5, 3),
	"statut_legal" "food_legal_status" NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"cat_id" text NOT NULL,
	"food_id" text NOT NULL,
	"quantity_g" numeric(6, 2),
	"locked" boolean DEFAULT false NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	"validated_by_user_id" text,
	"validated_at" timestamp,
	"consumed_at" timestamp NOT NULL,
	"recorded_by_user_id" text NOT NULL,
	"source_daily_plan_slot_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat" ADD CONSTRAINT "cat_active_croquette_food_id_food_id_fk" FOREIGN KEY ("active_croquette_food_id") REFERENCES "public"."food"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat" ADD CONSTRAINT "cat_active_patee_food_id_food_id_fk" FOREIGN KEY ("active_patee_food_id") REFERENCES "public"."food"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat" ADD CONSTRAINT "cat_active_friandise_food_id_food_id_fk" FOREIGN KEY ("active_friandise_food_id") REFERENCES "public"."food"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat" ADD CONSTRAINT "cat_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_member" ADD CONSTRAINT "cat_member_cat_id_cat_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_member" ADD CONSTRAINT "cat_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_weight_log" ADD CONSTRAINT "cat_weight_log_cat_id_cat_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_weight_log" ADD CONSTRAINT "cat_weight_log_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plan" ADD CONSTRAINT "daily_plan_cat_id_cat_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plan" ADD CONSTRAINT "daily_plan_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plan_slot" ADD CONSTRAINT "daily_plan_slot_daily_plan_id_daily_plan_id_fk" FOREIGN KEY ("daily_plan_id") REFERENCES "public"."daily_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food" ADD CONSTRAINT "food_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entry" ADD CONSTRAINT "meal_entry_cat_id_cat_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entry" ADD CONSTRAINT "meal_entry_food_id_food_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."food"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entry" ADD CONSTRAINT "meal_entry_validated_by_user_id_user_id_fk" FOREIGN KEY ("validated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entry" ADD CONSTRAINT "meal_entry_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entry" ADD CONSTRAINT "meal_entry_source_daily_plan_slot_id_daily_plan_slot_id_fk" FOREIGN KEY ("source_daily_plan_slot_id") REFERENCES "public"."daily_plan_slot"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cat_createdByUserId_idx" ON "cat" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "cat_member_catId_idx" ON "cat_member" USING btree ("cat_id");--> statement-breakpoint
CREATE INDEX "cat_member_userId_idx" ON "cat_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cat_weight_log_catId_idx" ON "cat_weight_log" USING btree ("cat_id");--> statement-breakpoint
CREATE INDEX "cat_weight_log_recordedAt_idx" ON "cat_weight_log" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "daily_plan_catId_idx" ON "daily_plan" USING btree ("cat_id");--> statement-breakpoint
CREATE INDEX "daily_plan_slot_dailyPlanId_idx" ON "daily_plan_slot" USING btree ("daily_plan_id");--> statement-breakpoint
CREATE INDEX "food_createdByUserId_idx" ON "food" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "meal_entry_catId_idx" ON "meal_entry" USING btree ("cat_id");--> statement-breakpoint
CREATE INDEX "meal_entry_foodId_idx" ON "meal_entry" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX "meal_entry_consumedAt_idx" ON "meal_entry" USING btree ("consumed_at");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");