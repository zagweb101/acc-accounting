import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "acc.db");

let db: Database.Database | null = null;

export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  return crypto.scryptSync(password, salt, 64).toString("hex") === hash;
}

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(path.join(process.cwd(), "src", "lib", "schema.sql"), "utf-8");
  db.exec(schema);

  try { db.exec("ALTER TABLE payments ADD COLUMN notes TEXT"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE audit_log ADD COLUMN user_id TEXT"); } catch { /* already exists */ }
  try { db.exec("DROP VIEW IF EXISTS vw_account_balances"); db.exec("DROP VIEW IF EXISTS vw_income_data"); db.exec(schema); } catch { /* recreate views */ }

  const count = db.prepare("SELECT COUNT(*) as c FROM activities").get() as { c: number };
  if (count.c === 0) seed(db);

  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c === 0) seedUsers(db);

  const superAdmin = db.prepare("SELECT id FROM users WHERE username = ?").get("accsbc@hotmail.com") as { id: string } | undefined;
  if (!superAdmin) {
    const insertUser = db.prepare("INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)");
    const insertUA = db.prepare("INSERT INTO user_activities (user_id, activity_id) VALUES (?, ?)");
    const actIds = db.prepare("SELECT id FROM activities").all() as { id: string }[];
    const uid = generateId();
    insertUser.run(uid, "Super Admin", "accsbc@hotmail.com", hashPassword("Ym@0569040870"), "owner");
    for (const a of actIds) insertUA.run(uid, a.id);
  }

  return db;
}

function seedUsers(db: Database.Database) {
  const insertUser = db.prepare("INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)");
  const insertUA = db.prepare("INSERT INTO user_activities (user_id, activity_id) VALUES (?, ?)");

  const actIds = db.prepare("SELECT id FROM activities").all() as { id: string }[];

  const ownerId = generateId();
  insertUser.run(ownerId, "المالك", "owner", hashPassword("admin123"), "owner");

  const accId = generateId();
  insertUser.run(accId, "محاسب", "accountant", hashPassword("acc123"), "accountant");
  for (const a of actIds) insertUA.run(accId, a.id);

  const salesId = generateId();
  insertUser.run(salesId, "مندوب مبيعات", "sales", hashPassword("sales123"), "sales");

  const viewerId = generateId();
  insertUser.run(viewerId, "مشاهد", "viewer", hashPassword("view123"), "viewer");
}

function seed(db: Database.Database) {
  const now = new Date();
  const y = now.getFullYear();

  const actId = generateId();
  const act2Id = generateId();
  const fyId = generateId();
  const fy2Id = generateId();

  const insertAct = db.prepare("INSERT INTO activities (id, name, code, type, vat_number) VALUES (?, ?, ?, ?, ?)");
  const insertFY = db.prepare("INSERT INTO fiscal_years (id, activity_id, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)");
  const insertAccount = db.prepare("INSERT INTO chart_of_accounts (id, activity_id, code, name_ar, name_en, account_type, level, nature, is_postable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertContact = db.prepare("INSERT INTO contacts (id, activity_id, type, name, tax_number, phone) VALUES (?, ?, ?, ?, ?, ?)");
  const insertItem = db.prepare("INSERT INTO items (id, activity_id, type, name, sku, cost_price, sale_price, stock_quantity, reorder_level, hourly_rate, unit_of_measure) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertJournal = db.prepare("INSERT INTO journal_entries (id, entry_number, activity_id, fiscal_year_id, entry_date, description, total_debit, total_credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const insertLine = db.prepare("INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, contact_id, item_id, debit, credit, description, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertInvoice = db.prepare("INSERT INTO invoices (id, activity_id, contact_id, type, invoice_number, invoice_date, due_date, subtotal, vat_amount, total_amount, paid_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertInvLine = db.prepare("INSERT INTO invoice_lines (id, invoice_id, item_id, description, quantity, unit_price, discount, vat_rate, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insertPayment = db.prepare("INSERT INTO payments (id, activity_id, invoice_id, contact_id, amount, payment_date, method) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const insertCostCenter = db.prepare("INSERT INTO cost_centers (id, activity_id, name, code, level) VALUES (?, ?, ?, ?, ?)");

  const tx = db.transaction(() => {
    insertAct.run(actId, "النشاط التجاري", "COM", "commercial", "310123456700003");
    insertAct.run(act2Id, "النشاط الخدمي", "SVC", "service", "310123456700004");

    insertFY.run(fyId, actId, `FY ${y}`, `${y}-01-01`, `${y}-12-31`);
    insertFY.run(fy2Id, act2Id, `FY ${y}`, `${y}-01-01`, `${y}-12-31`);

    insertCostCenter.run(generateId(), actId, "الإدارة العامة", "CC-001", 1);
    insertCostCenter.run(generateId(), actId, "المبيعات", "CC-002", 1);
    insertCostCenter.run(generateId(), act2Id, "الخدمات الفنية", "CC-003", 1);

    const accounts = [
      ["1", "1001", "أصول ثابتة", "Fixed Assets", "asset", 1, "debit", 0],
      ["2", "1100", "النقدية", "Cash", "asset", 2, "debit", 1],
      ["3", "1200", "الذمم المدينة", "Accounts Receivable", "asset", 2, "debit", 1],
      ["4", "1300", "المخزون", "Inventory", "asset", 2, "debit", 1],
      ["5", "2001", "الخصوم", "Liabilities", "liability", 1, "credit", 0],
      ["6", "2100", "الذمم الدائنة", "Accounts Payable", "liability", 2, "credit", 1],
      ["7", "2200", "ضريبة القيمة المضافة", "VAT Payable", "liability", 2, "credit", 1],
      ["8", "3001", "حقوق الملكية", "Equity", "equity", 1, "credit", 0],
      ["9", "3100", "رأس المال", "Capital", "equity", 2, "credit", 1],
      ["10", "4001", "الإيرادات", "Revenue", "revenue", 1, "credit", 0],
      ["11", "4100", "إيرادات المبيعات", "Sales Revenue", "revenue", 2, "credit", 1],
      ["12", "4200", "إيرادات الخدمات", "Service Revenue", "revenue", 2, "credit", 1],
      ["13", "5001", "المصروفات", "Expenses", "expense", 1, "debit", 0],
      ["14", "5100", "تكلفة المبيعات", "Cost of Goods Sold", "expense", 2, "debit", 1],
      ["15", "5200", "مصروفات عمومية", "General Expenses", "expense", 2, "debit", 0],
    ];
    for (const [, code, ar, en, type, level, nature, postable] of accounts) {
      insertAccount.run(generateId(), actId, code as string, ar as string, en as string, type as string, level as number, nature as string, postable as number);
    }

    const contacts = [
      ["شركة الأفق للتجارة", "both", "302345678900003", "0555123456"],
      ["مؤسسة النور للمقاولات", "both", "303456789000004", "0555234567"],
      ["مجموعة الفهد القابضة", "both", "304567890000005", "0555345678"],
      ["شركة النخلة للتوزيع", "customer", "305678901000006", "0555456789"],
      ["أعمال الخليج الدولي", "customer", "306789012000007", "0555567890"],
      ["مكتبة المعرفة الرقمية", "supplier", "307890123000008", "0555678901"],
    ];
    const contactIds: string[] = [];
    for (const [name, type, tax, phone] of contacts) {
      const id = generateId();
      insertContact.run(id, actId, type as string, name as string, tax as string, phone as string);
      contactIds.push(id);
    }

    const itemRouterId = generateId();
    const itemKeyboardId = generateId();
    const itemConsultId = generateId();
    insertItem.run(itemRouterId, actId, "product", "جهاز توجيه (Router)", "RT-100", 450, 890, 50, 10, 0, null);
    insertItem.run(itemKeyboardId, actId, "product", "لوحة مفاتيح", "KB-200", 120, 250, 100, 20, 0, null);
    insertItem.run(itemConsultId, actId, "service", "خدمة استشارات ضريبية", "SV-001", 0, 500, 0, 0, 500, "ساعة");
    insertItem.run(generateId(), act2Id, "service", "خدمة دعم فني", "SV-002", 0, 300, 0, 0, 300, "ساعة");
    insertItem.run(generateId(), act2Id, "service", "خدمة استضافة سحابية", "SV-003", 0, 1500, 0, 0, 1500, "شهري");

    const accInventory = db.prepare("SELECT id FROM chart_of_accounts WHERE code = ?").get(accounts[3][1] as string) as { id: string };
    const accCOGS = db.prepare("SELECT id FROM chart_of_accounts WHERE code = ?").get(accounts[13][1] as string) as { id: string };

    const invData: [string, string, string, string, string, number, string, string, number, string | null, number | null][] = [
      [contactIds[0], "sales", "INV-2026-001", "2026-06-15", "2026-07-15", 85000, "paid", "2026-07-10", 85000, itemRouterId, 95],
      [contactIds[1], "sales", "INV-2026-002", "2026-07-01", "2026-07-31", 32000, "unpaid", "", 0, itemKeyboardId, 128],
      [contactIds[2], "sales", "INV-2026-003", "2026-04-01", "2026-04-30", 128000, "unpaid", "", 0, null, null],
      [contactIds[3], "sales", "INV-2026-004", "2026-07-10", "2026-08-09", 67000, "unpaid", "", 0, null, null],
      [contactIds[4], "sales", "INV-2026-005", "2026-03-01", "2026-03-31", 92000, "unpaid", "", 0, null, null],
      [contactIds[0], "sales", "INV-2026-006", "2026-07-20", "2026-08-19", 19000, "unpaid", "", 0, null, null],
      [contactIds[1], "purchase", "INV-2026-007", "2026-07-05", "2026-08-04", 45000, "unpaid", "", 0, null, null],
    ];

    const accountAR = accounts[2][1] as string;
    const accountCash = accounts[1][1] as string;
    const accountSales = accounts[10][1] as string;
    const accountVAT = accounts[6][1] as string;

    const accAR = db.prepare("SELECT id FROM chart_of_accounts WHERE code = ?").get(accountAR) as { id: string };
    const accCash = db.prepare("SELECT id FROM chart_of_accounts WHERE code = ?").get(accountCash) as { id: string };
    const accSales = db.prepare("SELECT id FROM chart_of_accounts WHERE code = ?").get(accountSales) as { id: string };
    const accVAT = db.prepare("SELECT id FROM chart_of_accounts WHERE code = ?").get(accountVAT) as { id: string };

    for (const [ci, type, invNum, invDate, dueDate, total, st, paidDate, paidAmt, invItemId, invQty] of invData) {
      const invId = generateId();
      const vat = Math.round(total * 0.15);
      const subtotal = total - vat;

      const jeId = generateId();
      const jeNumber = `JE-${invNum}`;
      insertJournal.run(jeId, jeNumber, actId, fyId, invDate, `فاتورة ${invNum}`, total, total);

      insertLine.run(generateId(), jeId, accAR.id, ci, null, total, 0, `تسجيل فاتورة ${invNum}`, dueDate);
      insertLine.run(generateId(), jeId, accSales.id, null, null, 0, subtotal, `إيراد ${invNum}`, null);
      insertLine.run(generateId(), jeId, accVAT.id, null, null, 0, vat, `ضريبة ${invNum}`, null);

      const status = st === "paid" ? "paid" : "unpaid";
      insertInvoice.run(invId, actId, ci, type, invNum, invDate, dueDate, subtotal, vat, total, st === "paid" ? total : 0, status);

      if (invItemId && invQty && type === "sales") {
        const item = db.prepare("SELECT cost_price, stock_quantity FROM items WHERE id = ?").get(invItemId) as { cost_price: number; stock_quantity: number };
        const cogsTotal = item.cost_price * invQty;
        if (cogsTotal > 0) {
          const cogsJeId = generateId();
          insertJournal.run(cogsJeId, `JE-COGS-${invNum}`, actId, fyId, invDate, `تكلفة فاتورة ${invNum}`, cogsTotal, cogsTotal);
          insertLine.run(generateId(), cogsJeId, accCOGS.id, null, invItemId, cogsTotal, 0, `تكلفة ${invNum}`, null);
          insertLine.run(generateId(), cogsJeId, accInventory.id, null, invItemId, 0, cogsTotal, `مخزون ${invNum}`, null);
        }
        db.prepare("UPDATE items SET stock_quantity = stock_quantity - ? WHERE id = ?").run(invQty, invItemId);
        insertInvLine.run(generateId(), invId, invItemId, null, invQty, total / invQty, 0, 15, total);
      }

      if (st === "paid" && paidAmt > 0) {
        const pjeId = generateId();
        insertJournal.run(pjeId, `JE-PAY-${invNum}`, actId, fyId, paidDate, `دفع فاتورة ${invNum}`, paidAmt, paidAmt);
        insertLine.run(generateId(), pjeId, accCash.id, null, null, paidAmt, 0, `دفع ${invNum}`, null);
        insertLine.run(generateId(), pjeId, accAR.id, ci, null, 0, paidAmt, `مقاصة ${invNum}`, null);
        insertPayment.run(generateId(), actId, invId, ci, paidAmt as number, paidDate as string, "bank");
      }
    }
  });

  tx();
}
