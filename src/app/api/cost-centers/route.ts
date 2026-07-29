import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const db = getDb();

  let query = `SELECT cc.*, a.name as activity_name FROM cost_centers cc JOIN activities a ON a.id = cc.activity_id`;
  const params: string[] = [];
  const actFilter = buildActivityFilterCol(user, activityId, "cc.activity_id");
  query += ` WHERE ${actFilter.clause}`;
  params.push(...actFilter.params);
  query += " ORDER BY cc.code";

  const centers = db.prepare(query).all(...params);
  return NextResponse.json({ centers });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const db = getDb();
  const body = await request.json();
  const { activity_id, parent_id, name, code } = body;

  if (!activity_id || !name) {
    return NextResponse.json({ error: "activity_id and name are required" }, { status: 400 });
  }

  let level = 1;
  let generatedCode = code;

  if (parent_id) {
    const parent = db.prepare("SELECT code, level FROM cost_centers WHERE id = ?").get(parent_id) as { code: string; level: number } | undefined;
    if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    level = parent.level + 1;

    const siblings = db.prepare("SELECT code FROM cost_centers WHERE parent_id = ? ORDER BY code DESC LIMIT 1").all(parent_id) as { code: string }[];
    generatedCode = siblings.length > 0
      ? String(Math.max(...siblings.map(s => parseInt(s.code.replace(/\D/g, '')))) + 1).padStart(parent.code.length, '0')
      : parent.code + "-01";
  } else {
    if (!code) return NextResponse.json({ error: "code is required for root cost centers" }, { status: 400 });
    const exist = db.prepare("SELECT id FROM cost_centers WHERE code = ?").get(code);
    if (exist) return NextResponse.json({ error: "Code already exists" }, { status: 409 });
  }

  const id = generateId();
  db.prepare(`INSERT INTO cost_centers (id, activity_id, name, code, parent_id, level) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, activity_id, name, generatedCode, parent_id || null, level);

  const center = db.prepare("SELECT cc.*, a.name as activity_name FROM cost_centers cc JOIN activities a ON a.id = cc.activity_id WHERE cc.id = ?").get(id);
  return NextResponse.json({ center });
}
