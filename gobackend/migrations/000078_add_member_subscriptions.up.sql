-- ============================================================
-- Member Subscriptions System
-- Plans: templates for recurring memberships (monthly, yearly, etc.)
-- Member Subscriptions: actual customer subscription records
-- ============================================================

-- Subscription plans (باقات الاشتراك)
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id"             TEXT NOT NULL,
    "shop_id"        TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "name_ar"        TEXT,
    "description"    TEXT,
    "billing_cycle"  TEXT NOT NULL DEFAULT 'monthly', -- monthly | yearly | quarterly | weekly | custom
    "duration_days"  INTEGER NOT NULL DEFAULT 30,       -- عدد الأيام الفعلية
    "price"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency"       TEXT NOT NULL DEFAULT 'EGP',
    "features"       JSONB,                             -- مصفوفة المميزات
    "max_members"    INTEGER,                           -- حد أعلى للأعضاء (null = لا حد)
    "trial_days"     INTEGER NOT NULL DEFAULT 0,        -- أيام تجريبية مجانية
    "sort_order"     INTEGER NOT NULL DEFAULT 0,
    "is_active"      BOOLEAN NOT NULL DEFAULT true,
    "is_featured"    BOOLEAN NOT NULL DEFAULT false,    -- الباقة المميزة
    "color"          TEXT,                              -- لون الكارت في الواجهة
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- Member subscriptions (اشتراكات الأعضاء)
CREATE TABLE IF NOT EXISTS "member_subscriptions" (
    "id"              TEXT NOT NULL,
    "shop_id"         TEXT NOT NULL,
    "customer_id"     TEXT NOT NULL,
    "plan_id"         TEXT NOT NULL,
    "plan_name"       TEXT NOT NULL,  -- snapshot at time of subscription
    "billing_cycle"   TEXT NOT NULL,
    "price"           DOUBLE PRECISION NOT NULL,
    "currency"        TEXT NOT NULL DEFAULT 'EGP',
    "start_date"      DATE NOT NULL,
    "end_date"        DATE NOT NULL,
    "trial_end_date"  DATE,
    "status"          TEXT NOT NULL DEFAULT 'active', -- active | expired | frozen | cancelled | pending | trial
    "payment_status"  TEXT NOT NULL DEFAULT 'pending', -- paid | pending | overdue | refunded | waived
    "payment_method"  TEXT,                            -- cash | card | bank_transfer | wallet
    "payment_ref"     TEXT,                            -- مرجع الدفع
    "auto_renew"      BOOLEAN NOT NULL DEFAULT false,
    "frozen_at"       TIMESTAMP(3),
    "frozen_days"     INTEGER NOT NULL DEFAULT 0,      -- تراكم أيام التجميد
    "cancelled_at"    TIMESTAMP(3),
    "cancel_reason"   TEXT,
    "notes"           TEXT,
    "renewed_from_id" TEXT,                            -- الاشتراك السابق
    "created_by"      TEXT,                            -- user_id للي أنشأ الاشتراك
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "member_subscriptions_plan_fkey"
        FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT,
    CONSTRAINT "member_subscriptions_customer_fkey"
        FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
    CONSTRAINT "member_subscriptions_shop_fkey"
        FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS "subscription_plans_shop_id_idx"
    ON "subscription_plans"("shop_id");

CREATE INDEX IF NOT EXISTS "subscription_plans_is_active_idx"
    ON "subscription_plans"("shop_id", "is_active");

CREATE INDEX IF NOT EXISTS "member_subscriptions_shop_id_idx"
    ON "member_subscriptions"("shop_id");

CREATE INDEX IF NOT EXISTS "member_subscriptions_customer_id_idx"
    ON "member_subscriptions"("customer_id");

CREATE INDEX IF NOT EXISTS "member_subscriptions_status_idx"
    ON "member_subscriptions"("shop_id", "status");

CREATE INDEX IF NOT EXISTS "member_subscriptions_end_date_idx"
    ON "member_subscriptions"("shop_id", "end_date");

CREATE INDEX IF NOT EXISTS "member_subscriptions_payment_status_idx"
    ON "member_subscriptions"("shop_id", "payment_status");
