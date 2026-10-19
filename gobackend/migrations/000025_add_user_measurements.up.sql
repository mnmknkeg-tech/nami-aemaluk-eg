-- CreateTable
CREATE TABLE "user_measurements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'cm',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_measurements_user_id_idx" ON "user_measurements"("user_id");

-- CreateIndex
CREATE INDEX "user_measurements_user_id_is_active_idx" ON "user_measurements"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "user_measurements" ADD CONSTRAINT "user_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
