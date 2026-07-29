import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole, requireRecordAccess } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { id } = await params;
  const db = getDb();
  const contact = db.prepare(`SELECT c.*,
    (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices WHERE contact_id = c.id AND status != 'paid') as outstanding
    FROM contacts c WHERE c.id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const invoices = db.prepare(`SELECT i.* FROM invoices i WHERE i.contact_id = ? ORDER BY i.invoice_date DESC LIMIT 50`).all(id);
  const payments = db.prepare(`SELECT p.* FROM payments p WHERE p.contact_id = ? ORDER BY p.payment_date DESC LIMIT 50`).all(id);
  const statement = db.prepare(`SELECT j.entry_date as date, j.description, j.entry_number,
    jl.debit, jl.credit, jl.description as line_desc
    FROM journal_entry_lines jl
    JOIN journal_entries j ON j.id = jl.journal_entry_id
    WHERE jl.contact_id = ? ORDER BY j.entry_date DESC LIMIT 100`).all(id);

  return NextResponse.json({ contact, invoices, payments, statement });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant", "sales");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM contacts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  const recErr = requireRecordAccess(user, id, "contacts");
  if (recErr) return recErr;

  const body = await request.json();
  const { type, name, tax_number, phone, credit_limit } = body;
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  db.prepare("UPDATE contacts SET type = COALESCE(?, type), name = ?, tax_number = COALESCE(?, tax_number), phone = COALESCE(?, phone), credit_limit = COALESCE(?, credit_limit) WHERE id = ?")
    .run(type || null, name, tax_number || null, phone || null, credit_limit ?? null, id);
  const contact = db.prepare("SELECT * FROM contacts WHERE id = ?").get(id) as Record<string, unknown>;
  return NextResponse.json({ contact });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM contacts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  const recErr = requireRecordAccess(user, id, "contacts");
  if (recErr) return recErr;
  db.prepare("DELETE FROM contacts WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
