import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, requireRecordAccess } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { id } = await params;
  const db = getDb();

  const invoice = db.prepare("SELECT i.*, c.name as contact_name, a.name as activity_name, cc.name as cost_center_name FROM invoices i JOIN contacts c ON c.id = i.contact_id JOIN activities a ON a.id = i.activity_id LEFT JOIN cost_centers cc ON cc.id = i.cost_center_id WHERE i.id = ?").get(id) as Record<string, unknown> | undefined;
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const lines = db.prepare("SELECT l.*, it.name as item_name, it.sku FROM invoice_lines l LEFT JOIN items it ON it.id = l.item_id WHERE l.invoice_id = ?").all(id);
  return NextResponse.json({ invoice: { ...invoice, lines } });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const recErr = requireRecordAccess(user, id, "invoices");
  if (recErr) return recErr;
  const body = await request.json();

  const inv = db.prepare("SELECT id, status FROM invoices WHERE id = ?").get(id) as { id: string; status: string } | undefined;
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (inv.status !== "draft") return NextResponse.json({ error: "Only draft invoices can be edited" }, { status: 400 });

  const { contact_id, cost_center_id, invoice_date, due_date, notes, lines } = body;

  if (lines && Array.isArray(lines)) {
    const fy = db.prepare("SELECT id FROM fiscal_years WHERE activity_id = (SELECT activity_id FROM invoices WHERE id = ?) AND ? BETWEEN start_date AND end_date LIMIT 1").get(id, invoice_date || "") as { id: string } | undefined;
    if (invoice_date && !fy) return NextResponse.json({ error: "No active fiscal year for this date" }, { status: 400 });

    let subTotal = 0;
    let totalDiscount = 0;
    let vatTotal = 0;
    let grandTotal = 0;

    for (const line of lines) {
      const lineTotal = line.quantity * line.unit_price;
      const discount = line.discount || 0;
      const taxable = lineTotal - discount;
      const vatRate = line.vat_rate ?? 15;
      const vat = Math.round(taxable * vatRate) / 100;
      const total = taxable + vat;
      subTotal += taxable;
      totalDiscount += discount;
      vatTotal += vat;
      grandTotal += total;
    }

    const tx = db.transaction(() => {
      db.prepare(`UPDATE invoices SET contact_id = ?, cost_center_id = ?, invoice_date = ?, due_date = ?, subtotal = ?, discount_total = ?, vat_amount = ?, total_amount = ?, notes = ? WHERE id = ?`)
        .run(contact_id ?? null, cost_center_id ?? null, invoice_date ?? null, due_date ?? null, subTotal, totalDiscount, vatTotal, grandTotal, notes ?? null, id);

      db.prepare("DELETE FROM invoice_lines WHERE invoice_id = ?").run(id);
      const insertLine = db.prepare("INSERT INTO invoice_lines (id, invoice_id, item_id, description, quantity, unit_price, discount, vat_rate, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      for (const line of lines) {
        const lineTotal = line.quantity * line.unit_price;
        const discount = line.discount || 0;
        const taxable = lineTotal - discount;
        const vatRate = line.vat_rate ?? 15;
        const vat = Math.round(taxable * vatRate) / 100;
        const total = taxable + vat;
        insertLine.run(crypto.randomUUID(), id, line.item_id || null, line.description || null, line.quantity, line.unit_price, discount, vatRate, total);
      }
    });
    tx();
  } else {
    db.prepare(`UPDATE invoices SET contact_id = COALESCE(?, contact_id), cost_center_id = COALESCE(?, cost_center_id), invoice_date = COALESCE(?, invoice_date), due_date = COALESCE(?, due_date), notes = COALESCE(?, notes) WHERE id = ?`)
      .run(contact_id ?? null, cost_center_id ?? null, invoice_date ?? null, due_date ?? null, notes ?? null, id);
  }

  const invoice = db.prepare("SELECT i.*, c.name as contact_name FROM invoices i JOIN contacts c ON c.id = i.contact_id WHERE i.id = ?").get(id) as Record<string, unknown>;
  const lineRows = db.prepare("SELECT l.*, it.name as item_name FROM invoice_lines l LEFT JOIN items it ON it.id = l.item_id WHERE l.invoice_id = ?").all(id);
  return NextResponse.json({ invoice: { ...invoice, lines: lineRows } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const recErr = requireRecordAccess(user, id, "invoices");
  if (recErr) return recErr;

  const inv = db.prepare("SELECT id, status FROM invoices WHERE id = ?").get(id) as { id: string; status: string } | undefined;
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (inv.status !== "draft") return NextResponse.json({ error: "Only draft invoices can be deleted" }, { status: 400 });

  db.prepare("DELETE FROM invoices WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
