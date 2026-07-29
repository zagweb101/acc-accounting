import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const db = getDb();

  const userActIds = user.role === "accountant" ? (db.prepare("SELECT activity_id FROM user_activities WHERE user_id = ?").all(user.id) as { activity_id: string }[]).map(a => a.activity_id) : null;

  let params: unknown[] = [];
  const w: string[] = ["v.account_type = 'revenue'"];

  if (userActIds) {
    if (activityId && userActIds.includes(activityId)) {
      w.push("v.activity_id = ?"); params.push(activityId);
    } else {
      w.push(`v.activity_id IN (${userActIds.map(() => "?").join(",")})`);
      params.push(...userActIds);
    }
  } else if (activityId) {
    w.push("v.activity_id = ?"); params.push(activityId);
  }

  if (from) { w.push("v.entry_date >= ?"); params.push(from); }
  if (to) { w.push("v.entry_date <= ?"); params.push(to); }

  const wheres = " WHERE " + w.join(" AND ");

  const rows = db.prepare(`SELECT v.activity_id, act.name as activity_name, act.code as activity_code,
    COALESCE(SUM(CASE WHEN v.nature = 'credit' THEN v.credit - v.debit ELSE v.debit - v.credit END), 0) as revenue
  FROM vw_income_data v
  JOIN activities act ON act.id = v.activity_id
  ${wheres}
  GROUP BY v.activity_id
  ORDER BY act.code`).all(...params) as { activity_id: string; activity_name: string; activity_code: string; revenue: number }[];

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return NextResponse.json({ rows, total_revenue: totalRevenue });
}
