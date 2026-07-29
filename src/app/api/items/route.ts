import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const type = searchParams.get("type");
  const db = getDb();

  let query = `SELECT i.*, a.name as activity_name FROM items i JOIN activities a ON a.id = i.activity_id`;
  const params: string[] = [];
  const wheres: string[] = [];

  const actFilter = buildActivityFilterCol(user, activityId, "i.activity_id");
  wheres.push(actFilter.clause);
  params.push(...actFilter.params);
  if (type) { wheres.push("i.type = ?"); params.push(type); }

  if (wheres.length > 0) query += " WHERE " + wheres.join(" AND ");
  query += " ORDER BY i.name";

  const items = db.prepare(query).all(...params);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const db = getDb();
  const body = await request.json();
  const { activity_id, type, name, sku, cost_price, sale_price, vat_rate, stock_quantity, reorder_level, hourly_rate, unit_of_measure } = body;

  if (!activity_id || !type || !name) {
    return NextResponse.json({ error: "activity_id, type, and name are required" }, { status: 400 });
  }
  if (type !== "product" && type !== "service") {
    return NextResponse.json({ error: "type must be 'product' or 'service'" }, { status: 400 });
  }

  const activity = db.prepare("SELECT id FROM activities WHERE id = ?").get(activity_id);
  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  if (sku) {
    const exist = db.prepare("SELECT id FROM items WHERE sku = ? AND activity_id = ?").get(sku, activity_id);
    if (exist) return NextResponse.json({ error: "SKU already exists for this activity" }, { status: 409 });
  }

  const id = generateId();
  db.prepare(`INSERT INTO items (id, activity_id, type, name, sku, cost_price, sale_price, vat_rate, stock_quantity, reorder_level, hourly_rate, unit_of_measure)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, activity_id, type, name, sku || null, cost_price || 0, sale_price || 0, vat_rate ?? 15, stock_quantity ?? 0, reorder_level ?? 0, hourly_rate ?? 0, unit_of_measure || null);

  const item = db.prepare("SELECT i.*, a.name as activity_name FROM items i JOIN activities a ON a.id = i.activity_id WHERE i.id = ?").get(id);
  return NextResponse.json({ item }, { status: 201 });
}
