import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "single";
  const activityId = searchParams.get("activity_id");
  const fiscalYearId = searchParams.get("fiscal_year_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const compareFrom = searchParams.get("compare_from");
  const compareTo = searchParams.get("compare_to");
  const db = getDb();

  const userActIds = user.role === "accountant" ? (db.prepare("SELECT activity_id FROM user_activities WHERE user_id = ?").all(user.id) as { activity_id: string }[]).map(a => a.activity_id) : null;
  const resolvedActId = activityId || (userActIds ? null : null);

  function activityWheres(w: string[], params: unknown[]) {
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
  }

  function fetchPeriod(fId: string | null, f: string | null, t: string | null) {
    let params: unknown[] = [];
    const w: string[] = [];
    activityWheres(w, params);
    if (fId) { w.push("v.fiscal_year_id = ?"); params.push(fId); }
    if (f) { w.push("v.entry_date >= ?"); params.push(f); }
    if (t) { w.push("v.entry_date <= ?"); params.push(t); }
    const wheres = w.length > 0 ? " WHERE " + w.join(" AND ") : "";

    return db.prepare(`SELECT v.acc_code, v.acc_name, v.account_type, v.nature,
      COALESCE(SUM(v.debit), 0) as total_debit, COALESCE(SUM(v.credit), 0) as total_credit,
      CASE WHEN v.nature = 'credit' THEN COALESCE(SUM(v.credit), 0) - COALESCE(SUM(v.debit), 0)
        ELSE COALESCE(SUM(v.debit), 0) - COALESCE(SUM(v.credit), 0) END as amount
    FROM vw_income_data v${wheres}
    GROUP BY v.acc_code ORDER BY v.acc_code`).all(...params) as Record<string, unknown>[];
  }

  const rows = fetchPeriod(fiscalYearId, from, to);
  const compareRows = (type === "compare" && compareFrom && compareTo) ? fetchPeriod(null, compareFrom, compareTo) : [];

  function summarize(data: Record<string, unknown>[]) {
    const revenue = data.filter(r => r.account_type === "revenue").reduce((s, r) => s + (r.amount as number), 0);
    const expenses = data.filter(r => r.account_type === "expense").reduce((s, r) => s + (r.amount as number), 0);
    return { revenue, expenses, net: revenue - expenses };
  }

  const period = summarize(rows);
  const compare = summarize(compareRows);

  const merged = rows.map(r => {
    const match = compareRows.find(c => c.acc_code === r.acc_code);
    const compAmount = match ? match.amount as number : 0;
    const diff = (r.amount as number) - compAmount;
    return {
      ...r, compare_amount: compAmount,
      diff, diff_pct: compAmount !== 0 ? ((diff / compAmount) * 100).toFixed(1) : null,
    };
  });

  return NextResponse.json({ rows: merged, totals: { period, compare } });
}
