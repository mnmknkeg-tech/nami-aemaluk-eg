ALTER TABLE "users"
  ADD COLUMN "email_verified_at" TIMESTAMP(3),
  ADD COLUMN "email_verification_sent_at" TIMESTAMP(3);

CREATE TABLE "auth_events" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "email" TEXT,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "ip" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_events_user_id_created_at_idx" ON "auth_events"("user_id", "created_at");
CREATE INDEX "auth_events_email_created_at_idx" ON "auth_events"("email", "created_at");
CREATE INDEX "auth_events_action_created_at_idx" ON "auth_events"("action", "created_at");

ALTER TABLE "auth_events"
  ADD CONSTRAINT "auth_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
