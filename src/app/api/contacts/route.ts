import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const db = getDb();

  let query = `SELECT c.*,
    (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices WHERE contact_id = c.id AND type = 'sales' AND status != 'paid') as outstanding
    FROM contacts c`;
  const params: string[] = [];
  const actFilter = buildActivityFilterCol(user, activityId, "c.activity_id");
  query += ` WHERE ${actFilter.clause}`;
  params.push(...actFilter.params);
  query += " ORDER BY c.name";
  const contacts = db.prepare(query).all(...params);
  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant", "sales");
  if (roleErr) return roleErr;
  const db = getDb();
  const body = await request.json();
  const { activity_id, type, name, tax_number, phone, credit_limit } = body;
  if (!activity_id || !type || !name) {
    return NextResponse.json({ error: "activity_id, type, and name are required" }, { status: 400 });
  }
  if (!["customer", "supplier", "both"].includes(type)) {
    return NextResponse.json({ error: "Invalid contact type" }, { status: 400 });
  }
  const id = generateId();
  db.prepare("INSERT INTO contacts (id, activity_id, type, name, tax_number, phone, credit_limit) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, activity_id, type, name, tax_number || null, phone || null, credit_limit || 0);
  const contact = db.prepare("SELECT * FROM contacts WHERE id = ?").get(id) as Record<string, unknown>;
  return NextResponse.json({ contact }, { status: 201 });
}


