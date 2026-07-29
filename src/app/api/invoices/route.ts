import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "sales";
  const status = searchParams.get("status");
  const activityId = searchParams.get("activity_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const db = getDb();

  let query = `SELECT i.*, c.name as contact_name, a.name as activity_name FROM invoices i JOIN contacts c ON c.id = i.contact_id JOIN activities a ON a.id = i.activity_id`;
  const params: string[] = [];
  const wheres: string[] = [];

  wheres.push("i.type = ?"); params.push(type);
  if (status) { wheres.push("i.status = ?"); params.push(status); }
  const actFilter = buildActivityFilterCol(user, activityId, "i.activity_id");
  wheres.push(actFilter.clause);
  params.push(...actFilter.params);
  if (from) { wheres.push("i.invoice_date >= ?"); params.push(from); }
  if (to) { wheres.push("i.invoice_date <= ?"); params.push(to); }

  if (wheres.length > 0) query += " WHERE " + wheres.join(" AND ");
  query += " ORDER BY i.invoice_date DESC, i.invoice_number DESC LIMIT 100";

  const invoices = db.prepare(query).all(...params);
  return NextResponse.json({ invoices });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant", "sales");
  if (roleErr) return roleErr;
  const db = getDb();
  const body = await request.json();
  const { activity_id, contact_id, cost_center_id, type, invoice_date, due_date, notes, lines } = body;

  if (!activity_id || !contact_id || !type || !invoice_date || !due_date || !lines || !Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "activity_id, contact_id, type, invoice_date, due_date, and at least one line are required" }, { status: 400 });
  }
  if (!["sales", "purchase", "sales_return", "purchase_return"].includes(type)) {
    return NextResponse.json({ error: "Invalid invoice type" }, { status: 400 });
  }
  if (user.role === "sales" && type !== "sales") {
    return NextResponse.json({ error: "Sales role can only create sales invoices" }, { status: 403 });
  }
  if (user.role === "accountant") {
    const allowed = (db.prepare("SELECT activity_id FROM user_activities WHERE user_id = ? AND activity_id = ?").get(user.id, activity_id));
    if (!allowed) return NextResponse.json({ error: "لا تملك صلاحية لهذا النشاط" }, { status: 403 });
  }

  const activity = db.prepare("SELECT id, type as activity_type FROM activities WHERE id = ?").get(activity_id) as { id: string; activity_type: string } | undefined;
  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const contact = db.prepare("SELECT id, name FROM contacts WHERE id = ?").get(contact_id) as { id: string; name: string } | undefined;
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  let subTotal = 0;
  let totalDiscount = 0;
  let vatTotal = 0;
  let grandTotal = 0;

  const itemCache = new Map<string, { cost_price: number; type: string; activity_id: string }>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.quantity <= 0 || line.unit_price <= 0) {
      return NextResponse.json({ error: `Line ${i + 1}: quantity and unit_price must be positive` }, { status: 400 });
    }
    if (line.item_id) {
      if (!itemCache.has(line.item_id)) {
        const item = db.prepare("SELECT id, cost_price, type, activity_id FROM items WHERE id = ?").get(line.item_id) as { id: string; cost_price: number; type: string; activity_id: string } | undefined;
        if (!item) return NextResponse.json({ error: `Line ${i + 1}: item not found` }, { status: 404 });
        if (item.activity_id !== activity_id) return NextResponse.json({ error: `Line ${i + 1}: item belongs to a different activity` }, { status: 400 });
        itemCache.set(line.item_id, item);
      }
    }
    if (line.discount && (line.discount < 0 || line.discount > line.unit_price * line.quantity)) {
      return NextResponse.json({ error: `Line ${i + 1}: invalid discount` }, { status: 400 });
    }
    const lineTotal = line.quantity * line.unit_price;
    const discount = line.discount || 0;
    const vatRate = line.vat_rate ?? 15;
    const taxable = lineTotal - discount;
    const vat = Math.round(taxable * vatRate) / 100;
    const total = taxable + vat;

    subTotal += taxable;
    totalDiscount += discount;
    vatTotal += vat;
    grandTotal += total;
  }

  const fy = db.prepare("SELECT id FROM fiscal_years WHERE activity_id = ? AND ? BETWEEN start_date AND end_date LIMIT 1").get(activity_id, invoice_date) as { id: string } | undefined;
  if (!fy) return NextResponse.json({ error: "No active fiscal year for this date" }, { status: 400 });

  const lastInv = db.prepare(`SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`).get(`${type === "sales" || type === "sales_return" ? "INV" : "PO"}-${new Date(invoice_date).getFullYear()}-%`) as { invoice_number: string } | undefined;
  let nextNum = 1;
  if (lastInv) {
    const parts = lastInv.invoice_number.split("-");
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  const prefix = type === "sales" || type === "sales_return" ? "INV" : "PO";
  const suffix = type === "purchase" || type === "sales_return" ? "" : "";
  const invNumber = `${prefix}-${new Date(invoice_date).getFullYear()}-${nextNum.toString().padStart(4, "0")}`;

  const id = generateId();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO invoices (id, activity_id, contact_id, cost_center_id, type, invoice_number, invoice_date, due_date, subtotal, discount_total, vat_amount, total_amount, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`)
      .run(id, activity_id, contact_id, cost_center_id || null, type, invNumber, invoice_date, due_date, subTotal, totalDiscount, vatTotal, grandTotal, notes || null);

    const insertLine = db.prepare("INSERT INTO invoice_lines (id, invoice_id, item_id, description, quantity, unit_price, discount, vat_rate, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const line of lines) {
      const lineTotal = line.quantity * line.unit_price;
      const discount = line.discount || 0;
      const taxable = lineTotal - discount;
      const vatRate = line.vat_rate ?? 15;
      const vat = Math.round(taxable * vatRate) / 100;
      const total = taxable + vat;
      insertLine.run(generateId(), id, line.item_id || null, line.description || null, line.quantity, line.unit_price, discount, vatRate, total);
    }
  });

  tx();

  const invoice = db.prepare("SELECT i.*, c.name as contact_name FROM invoices i JOIN contacts c ON c.id = i.contact_id WHERE i.id = ?").get(id) as Record<string, unknown>;
  const invLines = db.prepare("SELECT l.*, it.name as item_name FROM invoice_lines l LEFT JOIN items it ON it.id = l.item_id WHERE l.invoice_id = ?").all(id);
  return NextResponse.json({ invoice: { ...invoice, lines: invLines } }, { status: 201 });
}
