import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activity_id");
  const activityIds = searchParams.get("activity_ids");
  const fiscalYearId = searchParams.get("fiscal_year_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const costCenterId = searchParams.get("cost_center_id");
  const db = getDb();

  // Role-based activity restriction
  const userActIds = user.role === "accountant" ? (db.prepare("SELECT activity_id FROM user_activities WHERE user_id = ?").all(user.id) as { activity_id: string }[]).map(a => a.activity_id) : null;

  const hasDetailFilters = fiscalYearId || from || to || costCenterId;

  let params: unknown[] = [];
  let fromClause: string;
  let joins = "";
  let wheres = "";

  if (hasDetailFilters) {
    fromClause = "chart_of_accounts a";
    joins = "LEFT JOIN journal_entry_lines jl ON jl.account_id = a.id LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'";
    const w: string[] = [];
    if (fiscalYearId) { w.push("je.fiscal_year_id = ?"); params.push(fiscalYearId); }
    if (from) { w.push("je.entry_date >= ?"); params.push(from); }
    if (to) { w.push("je.entry_date <= ?"); params.push(to); }
    if (costCenterId) { w.push("jl.cost_center_id = ?"); params.push(costCenterId); }
    if (w.length > 0) wheres = " AND " + w.join(" AND ");
  } else {
    fromClause = "vw_account_balances v";
  }

  let resolvedActIds: string[] | null = null;
  if (activityIds) {
    resolvedActIds = activityIds.split(",");
  } else if (activityId) {
    resolvedActIds = [activityId];
  }
  if (userActIds) {
    if (resolvedActIds) {
      resolvedActIds = resolvedActIds.filter(id => userActIds.includes(id));
    } else {
      resolvedActIds = userActIds;
    }
  }

  let actFilter = "";
  if (resolvedActIds) {
    const col = hasDetailFilters ? "a.activity_id" : "v.activity_id";
    actFilter = ` AND ${col} IN (${resolvedActIds.map(() => "?").join(",")})`;
    params = [...resolvedActIds, ...params];
  }

  let query: string;
  if (hasDetailFilters) {
    query = `SELECT a.id as account_id, a.code, a.name_ar, a.account_type, a.nature, a.level,
      COALESCE(SUM(jl.debit), 0) as total_debit, COALESCE(SUM(jl.credit), 0) as total_credit,
      CASE WHEN a.nature = 'debit' THEN COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)
        ELSE COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0) END as balance
    FROM ${fromClause} ${joins}
    WHERE 1=1${actFilter}${wheres}
    GROUP BY a.id ORDER BY a.code`;
  } else {
    query = `SELECT v.account_id, v.code, v.name_ar, v.account_type, v.nature, v.level,
      v.total_debit, v.total_credit, v.balance
    FROM ${fromClause}
    WHERE 1=1${actFilter}${wheres}
    ORDER BY v.code`;
  }

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  const totals = rows.reduce((acc: { debit: number; credit: number }, r) => ({
    debit: acc.debit + (r.total_debit as number),
    credit: acc.credit + (r.total_credit as number),
  }), { debit: 0, credit: 0 });

  return NextResponse.json({ rows, totals });
}
