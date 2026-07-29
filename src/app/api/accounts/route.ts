import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { requireAuth, requireRole, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const db = getDb();

  let query = `
    SELECT a.*,
      (SELECT COALESCE(SUM(l.debit - l.credit), 0)
        FROM journal_entry_lines l
        JOIN journal_entries e ON e.id = l.journal_entry_id
        WHERE l.account_id = a.id AND e.status = 'posted'
      ) as balance
    FROM chart_of_accounts a
  `;
  const params: string[] = [];
  const actFilter = buildActivityFilterCol(user, activityId, "a.activity_id");
  query += ` WHERE ${actFilter.clause}`;
  query += " ORDER BY a.code";
  params.push(...actFilter.params);

  const accounts = db.prepare(query).all(...params);
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const roleErr = requireRole(user, "owner", "accountant");
  if (roleErr) return roleErr;
  const db = getDb();
  const body = await request.json();
  const { activity_id, parent_id, name_ar, name_en, account_type, nature, is_postable } = body;

  if (!activity_id || !name_ar) {
    return NextResponse.json({ error: "activity_id and name_ar are required" }, { status: 400 });
  }

  let level = 1;
  let generatedCode = "";

  if (parent_id) {
    const parent = db.prepare("SELECT code, level FROM chart_of_accounts WHERE id = ?").get(parent_id) as { code: string; level: number } | undefined;
    if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    level = parent.level + 1;

    const siblings = db.prepare("SELECT code FROM chart_of_accounts WHERE parent_id = ? ORDER BY code DESC LIMIT 1").all(parent_id) as { code: string }[];
    const parentNum = parseInt(parent.code);
    generatedCode = siblings.length > 0
      ? String(Math.max(...siblings.map(s => parseInt(s.code))) + 1).padStart(parent.code.length, '0')
      : String(parentNum + 1).padStart(parent.code.length, '0');
  } else {
    const bodyAny = body as Record<string, unknown>;
    if (!bodyAny.code) return NextResponse.json({ error: "code is required for root accounts" }, { status: 400 });
    generatedCode = String(bodyAny.code);
  }

  const id = generateId();
  let effectiveType = account_type;
  let effectiveNature = nature;
  if (!effectiveType && parent_id) {
    const p = db.prepare("SELECT account_type FROM chart_of_accounts WHERE id = ?").get(parent_id) as { account_type: string } | undefined;
    effectiveType = p?.account_type;
  }
  if (!effectiveNature && parent_id) {
    const p = db.prepare("SELECT nature FROM chart_of_accounts WHERE id = ?").get(parent_id) as { nature: string } | undefined;
    effectiveNature = p?.nature;
  }

  db.prepare(`INSERT INTO chart_of_accounts (id, activity_id, code, name_ar, name_en, account_type, parent_id, level, nature, is_postable)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, activity_id, generatedCode, name_ar, name_en || null, effectiveType, parent_id || null, level, effectiveNature, is_postable !== undefined ? (is_postable ? 1 : 0) : 1);

  const account = db.prepare("SELECT * FROM chart_of_accounts WHERE id = ?").get(id);
  return NextResponse.json({ account });
}
