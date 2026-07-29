import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole, buildActivityFilterCol, requireActivityAccess } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const contactId = searchParams.get("contact_id");
  const db = getDb();

  let query = `SELECT p.*, i.invoice_number, c.name as contact_name FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN contacts c ON c.id = p.contact_id`;
  const params: string[] = [];
  const wheres: string[] = [];
  const actFilter = buildActivityFilterCol(user, activityId, "p.activity_id");
  wheres.push(actFilter.clause);
  params.push(...actFilter.params);
  if (contactId) { wheres.push("p.contact_id = ?"); params.push(contactId); }
  if (wheres.length > 0) query += " WHERE " + wheres.join(" AND ");
  query += " ORDER BY p.payment_date DESC LIMIT 100";

  const payments = db.prepare(query).all(...params);
  return NextResponse.json({ payments });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const db = getDb();
  const body = await request.json();
  const { activity_id, invoice_id, contact_id, amount, payment_date, method, notes } = body;

  if (!activity_id || !contact_id || !amount || amount <= 0 || !payment_date || !method) {
    return NextResponse.json({ error: "activity_id, contact_id, amount > 0, payment_date, and method are required" }, { status: 400 });
  }
  if (!["cash", "bank", "transfer"].includes(method)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  if (!requireActivityAccess(user, activity_id)) {
    return NextResponse.json({ error: "لا تملك صلاحية لهذا النشاط" }, { status: 403 });
  }

  const contact = db.prepare("SELECT id, name FROM contacts WHERE id = ?").get(contact_id) as { id: string; name: string } | undefined;
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const fy = db.prepare("SELECT id FROM fiscal_years WHERE activity_id = ? AND ? BETWEEN start_date AND end_date LIMIT 1").get(activity_id, payment_date) as { id: string } | undefined;
  if (!fy) return NextResponse.json({ error: "No active fiscal year for this date" }, { status: 400 });

  const accCash = db.prepare("SELECT id FROM chart_of_accounts WHERE code = '1100' AND activity_id = ?").get(activity_id) as { id: string } | undefined;
  const accAR = db.prepare("SELECT id FROM chart_of_accounts WHERE code = '1200' AND activity_id = ?").get(activity_id) as { id: string } | undefined;
  if (!accCash || !accAR) return NextResponse.json({ error: "Cash (1100) or AR (1200) account not found" }, { status: 400 });

  const inv = invoice_id ? db.prepare("SELECT id, invoice_number, total_amount, paid_amount, status FROM invoices WHERE id = ?").get(invoice_id) as { id: string; invoice_number: string; total_amount: number; paid_amount: number; status: string } | undefined : undefined;
  if (invoice_id && !inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const id = generateId();
  const jeId = generateId();
  const jeNumber = `PAY-${new Date(payment_date).getFullYear()}-${generateId().substring(0, 4)}`;

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO journal_entries (id, entry_number, activity_id, fiscal_year_id, entry_date, description, total_debit, total_credit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(jeId, jeNumber, activity_id, fy.id, payment_date, `دفعة من ${contact.name}`, amount, amount);

    db.prepare("INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, contact_id, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(generateId(), jeId, accCash.id, contact_id, amount, 0, `دفعة من ${contact.name}`);
    db.prepare("INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, contact_id, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(generateId(), jeId, accAR.id, contact_id, 0, amount, `مقاصة ${contact.name}`);

    db.prepare("INSERT INTO payments (id, activity_id, invoice_id, contact_id, amount, payment_date, method, journal_entry_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, activity_id, invoice_id || null, contact_id, amount, payment_date, method, jeId, notes || null);

    if (inv) {
      const newPaid = inv.paid_amount + amount;
      const newStatus = newPaid >= inv.total_amount ? "paid" : "unpaid";
      db.prepare("UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?").run(newPaid, newStatus, inv.id);
    }
  });

  tx();

  const payment = db.prepare("SELECT p.*, i.invoice_number, c.name as contact_name FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id JOIN contacts c ON c.id = p.contact_id WHERE p.id = ?").get(id) as Record<string, unknown>;
  return NextResponse.json({ payment, journal_entry_id: jeId }, { status: 201 });
}
