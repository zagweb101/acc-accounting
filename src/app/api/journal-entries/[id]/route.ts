import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, requireRecordAccess } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { id } = await params;
  const db = getDb();

  const entry = db.prepare("SELECT j.*, f.name as fiscal_year_name FROM journal_entries j JOIN fiscal_years f ON f.id = j.fiscal_year_id WHERE j.id = ?").get(id) as Record<string, unknown> | undefined;
  if (!entry) return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });

  const lines = db.prepare(`SELECT l.*, a.name_ar as account_name, c.name as cost_center_name
    FROM journal_entry_lines l
    LEFT JOIN chart_of_accounts a ON a.id = l.account_id
    LEFT JOIN cost_centers c ON c.id = l.cost_center_id
    WHERE l.journal_entry_id = ?`).all(id);

  return NextResponse.json({ entry: { ...entry, lines } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const recErr = requireRecordAccess(user, id, "journal_entries");
  if (recErr) return recErr;

  const entry = db.prepare("SELECT id, status FROM journal_entries WHERE id = ?").get(id) as { id: string; status: string } | undefined;
  if (!entry) return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
  if (entry.status !== "draft") {
    return NextResponse.json({ error: "Only draft entries can be deleted" }, { status: 400 });
  }

  const auditId = crypto.randomUUID();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM journal_entry_lines WHERE journal_entry_id = ?").run(id);
    db.prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
    db.prepare("INSERT INTO audit_log (id, table_name, record_id, action, user_id) VALUES (?, 'journal_entries', ?, 'delete', ?)").run(auditId, id, user.id);
  });

  tx();
  return NextResponse.json({ success: true });
}
