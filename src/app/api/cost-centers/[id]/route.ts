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
  const { name, is_active } = body;

  const existing = db.prepare("SELECT id FROM cost_centers WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Cost center not found" }, { status: 404 });

  db.prepare("UPDATE cost_centers SET name = COALESCE(?, name), is_active = COALESCE(?, is_active) WHERE id = ?")
    .run(name || null, is_active !== undefined ? (is_active ? 1 : 0) : null, id);

  const center = db.prepare("SELECT cc.*, a.name as activity_name FROM cost_centers cc JOIN activities a ON a.id = cc.activity_id WHERE cc.id = ?").get(id);
  return NextResponse.json({ center });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();

  const center = db.prepare("SELECT id, name FROM cost_centers WHERE id = ?").get(id) as { id: string; name: string } | undefined;
  if (!center) return NextResponse.json({ error: "Cost center not found" }, { status: 404 });

  const childCount = (db.prepare("SELECT COUNT(*) as c FROM cost_centers WHERE parent_id = ?").get(id) as { c: number }).c;
  if (childCount > 0) return NextResponse.json({ error: `Cannot delete "${center.name}": it has ${childCount} sub-center(s)` }, { status: 409 });

  const lineCount = (db.prepare("SELECT COUNT(*) as c FROM journal_entry_lines WHERE cost_center_id = ?").get(id) as { c: number }).c;
  if (lineCount > 0) return NextResponse.json({ error: `Cannot delete "${center.name}": it has ${lineCount} journal entry line(s)` }, { status: 409 });

  db.prepare("DELETE FROM cost_centers WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
