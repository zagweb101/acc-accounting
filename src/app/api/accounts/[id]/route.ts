import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  const { name_ar, name_en, is_postable, is_active } = body;

  const existing = db.prepare("SELECT id FROM chart_of_accounts WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  db.prepare(`UPDATE chart_of_accounts SET name_ar = COALESCE(?, name_ar), name_en = COALESCE(?, name_en),
    is_postable = COALESCE(?, is_postable), is_active = COALESCE(?, is_active) WHERE id = ?`)
    .run(name_ar || null, name_en ?? null, is_postable !== undefined ? (is_postable ? 1 : 0) : null, is_active !== undefined ? (is_active ? 1 : 0) : null, id);

  const account = db.prepare("SELECT * FROM chart_of_accounts WHERE id = ?").get(id);
  return NextResponse.json({ account });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();

  const account = db.prepare("SELECT id, name_ar FROM chart_of_accounts WHERE id = ?").get(id) as { id: string; name_ar: string } | undefined;
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const childCount = (db.prepare("SELECT COUNT(*) as c FROM chart_of_accounts WHERE parent_id = ?").get(id) as { c: number }).c;
  if (childCount > 0) return NextResponse.json({ error: `Cannot delete "${account.name_ar}": it has ${childCount} sub-account(s)` }, { status: 409 });

  const lineCount = (db.prepare("SELECT COUNT(*) as c FROM journal_entry_lines WHERE account_id = ?").get(id) as { c: number }).c;
  if (lineCount > 0) return NextResponse.json({ error: `Cannot delete "${account.name_ar}": it has ${lineCount} journal entry line(s)` }, { status: 409 });

  db.prepare("DELETE FROM chart_of_accounts WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
