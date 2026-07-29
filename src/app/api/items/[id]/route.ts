import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireRole, requireRecordAccess } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { id } = await params;
  const db = getDb();

  const item = db.prepare("SELECT i.*, a.name as activity_name FROM items i JOIN activities a ON a.id = i.activity_id WHERE i.id = ?").get(id) as Record<string, unknown> | undefined;
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  return NextResponse.json({ item });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const recErr = requireRecordAccess(user, id, "items");
  if (recErr) return recErr;
  const body = await request.json();

  const existing = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const { name, sku, cost_price, sale_price, vat_rate, stock_quantity, reorder_level, hourly_rate, unit_of_measure } = body;

  if (sku && sku !== existing.sku) {
    const dup = db.prepare("SELECT id FROM items WHERE sku = ? AND activity_id = ? AND id != ?").get(sku, existing.activity_id, id);
    if (dup) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
  }

  db.prepare(`UPDATE items SET
    name = COALESCE(?, name),
    sku = COALESCE(?, sku),
    cost_price = COALESCE(?, cost_price),
    sale_price = COALESCE(?, sale_price),
    vat_rate = COALESCE(?, vat_rate),
    stock_quantity = COALESCE(?, stock_quantity),
    reorder_level = COALESCE(?, reorder_level),
    hourly_rate = COALESCE(?, hourly_rate),
    unit_of_measure = COALESCE(?, unit_of_measure)
    WHERE id = ?`)
    .run(name ?? null, sku ?? null, cost_price ?? null, sale_price ?? null, vat_rate ?? null, stock_quantity ?? null, reorder_level ?? null, hourly_rate ?? null, unit_of_measure ?? null, id);

  const item = db.prepare("SELECT i.*, a.name as activity_name FROM items i JOIN activities a ON a.id = i.activity_id WHERE i.id = ?").get(id);
  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const { id } = await params;
  const db = getDb();
  const recErr = requireRecordAccess(user, id, "items");
  if (recErr) return recErr;

  const item = db.prepare("SELECT id FROM items WHERE id = ?").get(id);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const used = db.prepare("SELECT id FROM invoice_lines WHERE item_id = ? LIMIT 1").get(id);
  if (used) return NextResponse.json({ error: "Cannot delete item used in invoices" }, { status: 400 });

  db.prepare("DELETE FROM items WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
