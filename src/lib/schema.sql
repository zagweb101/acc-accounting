CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    type TEXT CHECK (type IN ('commercial','service','mixed')),
    vat_number TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fiscal_years (
    id TEXT PRIMARY KEY,
    activity_id TEXT REFERENCES activities(id),
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_closed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cost_centers (
    id TEXT PRIMARY KEY,
    activity_id TEXT REFERENCES activities(id),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    parent_id TEXT REFERENCES cost_centers(id),
    level INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id TEXT PRIMARY KEY,
    activity_id TEXT REFERENCES activities(id),
    code TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    account_type TEXT CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
    parent_id TEXT REFERENCES chart_of_accounts(id),
    level INTEGER NOT NULL,
    nature TEXT CHECK (nature IN ('debit','credit')),
    is_postable INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    activity_id TEXT REFERENCES activities(id),
    type TEXT CHECK (type IN ('customer','supplier','both')),
    name TEXT NOT NULL,
    tax_number TEXT,
    phone TEXT,
    balance REAL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    activity_id TEXT REFERENCES activities(id),
    type TEXT CHECK (type IN ('product','service')),
    name TEXT NOT NULL,
    sku TEXT,
    cost_price REAL DEFAULT 0,
    sale_price REAL DEFAULT 0,
    vat_rate REAL DEFAULT 15.00,
    stock_quantity REAL DEFAULT 0,
    reorder_level REAL DEFAULT 0,
    hourly_rate REAL DEFAULT 0,
    unit_of_measure TEXT
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    entry_number TEXT UNIQUE NOT NULL,
    activity_id TEXT REFERENCES activities(id) NOT NULL,
    fiscal_year_id TEXT REFERENCES fiscal_years(id) NOT NULL,
    entry_date TEXT NOT NULL,
    description TEXT,
    total_debit REAL NOT NULL CHECK (total_debit >= 0),
    total_credit REAL NOT NULL CHECK (total_credit >= 0),
    status TEXT DEFAULT 'posted' CHECK (status IN ('draft','posted','reversed')),
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES chart_of_accounts(id) NOT NULL,
    cost_center_id TEXT REFERENCES cost_centers(id),
    contact_id TEXT REFERENCES contacts(id),
    item_id TEXT REFERENCES items(id),
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    description TEXT,
    due_date TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    activity_id TEXT REFERENCES activities(id),
    contact_id TEXT REFERENCES contacts(id),
    cost_center_id TEXT REFERENCES cost_centers(id),
    type TEXT CHECK (type IN ('sales','purchase','sales_return','purchase_return')),
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount_total REAL DEFAULT 0,
    vat_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    zatca_uuid TEXT,
    zatca_qr TEXT,
    notes TEXT,
    journal_entry_id TEXT REFERENCES journal_entries(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    activity_id TEXT REFERENCES activities(id),
    invoice_id TEXT REFERENCES invoices(id),
    contact_id TEXT REFERENCES contacts(id),
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    method TEXT CHECK (method IN ('cash','bank','transfer')),
    journal_entry_id TEXT REFERENCES journal_entries(id),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS invoice_lines (
    id TEXT PRIMARY KEY,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id),
    description TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    discount REAL DEFAULT 0,
    vat_rate REAL DEFAULT 15.00,
    total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner','accountant','sales','viewer')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_activities (
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, activity_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create','update','delete','post','unpost','reverse','stock_move')),
    old_data TEXT,
    new_data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journal_activity_date ON journal_entries(activity_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_lines_cost_center ON journal_entry_lines(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_lines_contact_due ON journal_entry_lines(contact_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_activity_due ON invoices(activity_id, due_date, status);

-- Reporting views
CREATE VIEW IF NOT EXISTS vw_account_balances AS
SELECT a.id as account_id, a.code, a.name_ar, a.activity_id, a.account_type, a.nature, a.level, a.parent_id,
  COALESCE(SUM(jl.debit), 0) as total_debit, COALESCE(SUM(jl.credit), 0) as total_credit,
  CASE WHEN a.nature = 'debit' THEN COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)
    ELSE COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0) END as balance
FROM chart_of_accounts a
LEFT JOIN journal_entry_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
GROUP BY a.id;

CREATE VIEW IF NOT EXISTS vw_income_data AS
SELECT je.activity_id, je.entry_date, je.fiscal_year_id, jl.cost_center_id,
  jl.debit, jl.credit, a.account_type, a.code as acc_code, a.name_ar as acc_name, a.nature
FROM journal_entry_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
JOIN chart_of_accounts a ON a.id = jl.account_id
WHERE a.account_type IN ('revenue', 'expense');
