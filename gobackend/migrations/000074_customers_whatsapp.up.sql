-- عمود واتساب إضافي للعملاء (بحث أسرع من الكاشير)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '';
