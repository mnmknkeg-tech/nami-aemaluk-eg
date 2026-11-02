-- Extend accounting_invoices to serve the dashboard finance page:
-- customer linkage, lifecycle status, due date and payment tracking.
ALTER TABLE "accounting_invoices" ADD COLUMN "customer_id" TEXT;
ALTER TABLE "accounting_invoices" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "accounting_invoices" ADD COLUMN "due_date" TIMESTAMP(3);
ALTER TABLE "accounting_invoices" ADD COLUMN "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "accounting_invoices" ADD COLUMN "paid_date" TIMESTAMP(3);

CREATE INDEX "accounting_invoices_shop_status_idx" ON "accounting_invoices"("shop_id", "status");

ALTER TABLE "accounting_invoices" ADD CONSTRAINT "accounting_invoices_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
