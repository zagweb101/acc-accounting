import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const from = searchParams.get("from") || "2020-01-01";
  const to = searchParams.get("to") || "2099-12-31";
  const db = getDb();

  const actF = buildActivityFilterCol(user, activityId, "cc.activity_id");

  if (!activityId && user.role !== "owner") {
    return NextResponse.json({ error: "activity_id is required for non-owner users" }, { status: 400 });
  }

  const rows = db.prepare(`
    SELECT
      cc.id, cc.name, cc.code, cc.level,
      COALESCE(SUM(CASE WHEN ac.account_type IN ('revenue','equity') THEN (l.credit - l.debit) ELSE 0 END), 0) as revenue,
      COALESCE(SUM(CASE WHEN ac.account_type IN ('expense') THEN (l.debit - l.credit) ELSE 0 END), 0) as expense,
      COALESCE(SUM(CASE WHEN ac.account_type IN ('revenue','equity') THEN (l.credit - l.debit) ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN ac.account_type IN ('expense') THEN (l.debit - l.credit) ELSE 0 END), 0) as profit
    FROM cost_centers cc
    LEFT JOIN journal_entry_lines l ON l.cost_center_id = cc.id
    LEFT JOIN journal_entries je ON je.id = l.journal_entry_id AND je.status = 'posted' AND je.entry_date BETWEEN ? AND ?
    LEFT JOIN chart_of_accounts ac ON ac.id = l.account_id
    WHERE ${actF.clause}
    GROUP BY cc.id, cc.name, cc.code, cc.level
    ORDER BY cc.code
  `).all(from, to, ...actF.params);

  return NextResponse.json({ rows });
}
