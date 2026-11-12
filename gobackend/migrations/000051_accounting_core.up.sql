-- Accounting core: hierarchical chart of accounts + double-entry journal
CREATE TABLE IF NOT EXISTS acc_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
    parent_id UUID REFERENCES acc_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, code)
);
CREATE INDEX IF NOT EXISTS acc_accounts_shop_idx ON acc_accounts(shop_id);
CREATE INDEX IF NOT EXISTS acc_accounts_parent_idx ON acc_accounts(parent_id);

CREATE TABLE IF NOT EXISTS acc_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id TEXT NOT NULL,
    number TEXT NOT NULL,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
    total_debit NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
    posted_at TIMESTAMPTZ,
    posted_by TEXT,
    reversed_by_entry_id UUID,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, number)
);
CREATE INDEX IF NOT EXISTS acc_journal_entries_shop_idx ON acc_journal_entries(shop_id, entry_date);
CREATE INDEX IF NOT EXISTS acc_journal_entries_status_idx ON acc_journal_entries(shop_id, status);

CREATE TABLE IF NOT EXISTS acc_journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES acc_journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES acc_accounts(id),
    description TEXT,
    debit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    line_no INT NOT NULL DEFAULT 1,
    CHECK ((debit = 0 AND credit > 0) OR (credit = 0 AND debit > 0))
);
CREATE INDEX IF NOT EXISTS acc_journal_lines_entry_idx ON acc_journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS acc_journal_lines_account_idx ON acc_journal_lines(account_id);