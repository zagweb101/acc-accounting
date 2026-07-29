import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, buildActivityFilterCol } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const selActivityId = searchParams.get("activity_id");
  const fiscalYearId = searchParams.get("fiscal_year_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const db = getDb();

  const actF = buildActivityFilterCol(user, selActivityId, "i.activity_id");

  const actIds = user.role === "accountant" ? (db.prepare("SELECT activity_id FROM user_activities WHERE user_id = ?").all(user.id) as { activity_id: string }[]).map(a => a.activity_id) : null;

  const activities = (actIds
    ? db.prepare(`SELECT id, name, code, type FROM activities WHERE is_active = 1 AND id IN (${actIds.map(() => "?").join(",")})`).all(...actIds)
    : db.prepare("SELECT id, name, code, type FROM activities WHERE is_active = 1").all()) as { id: string; name: string; code: string; type: string }[];

  function getKPIs(dateFrom: string | null, dateTo: string | null, fyId: string | null) {
    const p: unknown[] = [...actF.params];
    const w: string[] = [actF.clause];
    if (fyId && !dateFrom) { w.push("i.fiscal_year_id = ?"); p.push(fyId); }
    if (dateFrom) { w.push("i.invoice_date >= ?"); p.push(dateFrom); }
    if (dateTo) { w.push("i.invoice_date <= ?"); p.push(dateTo); }
    const wheres = w.length > 0 ? " AND " + w.join(" AND ") : "";
    const row = db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN i.type = 'sales' THEN i.total_amount ELSE 0 END), 0) as total_sales,
      COALESCE(SUM(CASE WHEN i.type = 'sales' THEN i.total_amount - i.paid_amount ELSE 0 END), 0) as total_receivable,
      COALESCE(SUM(CASE WHEN i.type = 'purchase' THEN i.total_amount - i.paid_amount ELSE 0 END), 0) as total_payable,
      COALESCE(SUM(CASE WHEN i.type = 'sales' THEN i.total_amount - (i.total_amount - i.paid_amount) ELSE 0 END), 0) as total_collected,
      COALESCE(SUM(CASE WHEN i.type = 'sales' THEN (SELECT COALESCE(SUM(jl.credit - jl.debit), 0) FROM journal_entry_lines jl JOIN journal_entries je ON je.id = jl.journal_entry_id WHERE jl.account_id IN (SELECT id FROM chart_of_accounts WHERE account_type = 'revenue') AND je.activity_id = i.activity_id AND je.entry_date BETWEEN COALESCE(?, '2000-01-01') AND COALESCE(?, '2099-12-31')) ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN i.type = 'sales' THEN (SELECT COALESCE(SUM(jl.debit - jl.credit), 0) FROM journal_entry_lines jl JOIN journal_entries je ON je.id = jl.journal_entry_id WHERE jl.account_id IN (SELECT id FROM chart_of_accounts WHERE account_type = 'expense') AND je.activity_id = i.activity_id AND je.entry_date BETWEEN COALESCE(?, '2000-01-01') AND COALESCE(?, '2099-12-31')) ELSE 0 END), 0) as total_expenses
    FROM invoices i WHERE 1=1${wheres}`).get(...p, dateFrom || "2000-01-01", dateTo || "2099-12-31", dateFrom || "2000-01-01", dateTo || "2099-12-31") as Record<string, number>;
    return row;
  }

  const current = getKPIs(from, to, fiscalYearId);

  let prevFrom: string | null = null;
  let prevTo: string | null = null;
  if (from && to) {
    const diff = new Date(to).getTime() - new Date(from).getTime();
    prevFrom = new Date(new Date(from).getTime() - diff).toISOString().split("T")[0];
    prevTo = new Date(new Date(from).getTime() - 86400000).toISOString().split("T")[0];
  } else if (fiscalYearId) {
    const fy = db.prepare("SELECT start_date, end_date FROM fiscal_years WHERE id = ?").get(fiscalYearId) as { start_date: string; end_date: string } | undefined;
    if (fy) {
      const prevYear = parseInt(fy.start_date.split("-")[0]) - 1;
      prevFrom = `${prevYear}-${fy.start_date.split("-").slice(1).join("-")}`;
      prevTo = `${prevYear}-${fy.end_date.split("-").slice(1).join("-")}`;
    }
  }

  const prevPeriod = prevFrom && prevTo ? getKPIs(prevFrom, prevTo, null) : null;

  function pctChange(cur: number, prev: number | undefined): number {
    if (!prev || prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 1000) / 10;
  }

  const kpis = [
    { label: "إجمالي المبيعات", icon: "💰", value: current.total_sales, change: pctChange(current.total_sales, prevPeriod?.total_sales), color: "violet" },
    { label: "الذمم المدينة", icon: "📋", value: current.total_receivable, change: pctChange(current.total_receivable, prevPeriod?.total_receivable), color: "blue" },
    { label: "الذمم الدائنة", icon: "📊", value: current.total_payable, change: pctChange(current.total_payable, prevPeriod?.total_payable), color: "amber" },
    { label: "صافي الدخل", icon: "📈", value: Math.max(0, current.total_revenue - current.total_expenses), change: pctChange(Math.max(0, current.total_revenue - current.total_expenses), prevPeriod ? Math.max(0, (prevPeriod.total_revenue || 0) - (prevPeriod.total_expenses || 0)) : undefined), color: "emerald" },
  ];

  const actIdsSet = actIds ? actIds : (selActivityId ? [selActivityId] : null);

  const revByAct: { name: string; value: number }[] = [];
  for (const a of activities) {
    if (actIdsSet && !actIdsSet.includes(a.id)) continue;
    if (selActivityId && a.id !== selActivityId) continue;
    const r = db.prepare(`SELECT COALESCE(SUM(CASE WHEN a.account_type = 'revenue' THEN jl.credit - jl.debit ELSE 0 END), 0) as val
      FROM journal_entry_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
      JOIN chart_of_accounts a ON a.id = jl.account_id
      WHERE je.activity_id = ? AND je.entry_date BETWEEN COALESCE(?, '2000-01-01') AND COALESCE(?, '2099-12-31')`).get(a.id, from || "2000-01-01", to || "2099-12-31") as { val: number };
    if (r.val > 0) revByAct.push({ name: a.name, value: r.val });
  }

  const actFilterParams: string[] = actIdsSet || [];
  const actFilterMonthly = actIdsSet ? `AND je.activity_id IN (${actIdsSet.map(() => "?").join(",")})` : selActivityId ? "AND je.activity_id = ?" : "";
  const monthlyParams: string[] = [...(actIdsSet || (selActivityId ? [selActivityId] : []))];

  const monthlyRevenue = db.prepare(`SELECT strftime('%Y-%m', je.entry_date) as month,
    je.activity_id, COALESCE(SUM(jl.credit - jl.debit), 0) as amount
    FROM journal_entry_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
    JOIN chart_of_accounts a ON a.id = jl.account_id AND a.account_type = 'revenue'
    WHERE je.entry_date >= date('now', '-12 months') ${actFilterMonthly}
    GROUP BY month, je.activity_id ORDER BY month`).all(...monthlyParams) as { month: string; activity_id: string; amount: number }[];

  const monthlyMap: Record<string, Record<string, number>> = {};
  const actNames: Record<string, string> = {};
  for (const a of activities) actNames[a.id] = a.name;
  for (const r of monthlyRevenue) {
    if (!monthlyMap[r.month]) monthlyMap[r.month] = {};
    monthlyMap[r.month][actNames[r.activity_id] || r.activity_id] = (monthlyMap[r.month][actNames[r.activity_id] || r.activity_id] || 0) + r.amount;
  }
  interface MonthlyWithLabel { month: string; [key: string]: string | number };
  const monthlyComparison: MonthlyWithLabel[] = Object.entries(monthlyMap).map(([m, vals]) => ({ month: m, ...vals })).sort((a, b) => a.month.localeCompare(b.month));

  const agingActFilter = actIdsSet ? `AND i.activity_id IN (${actIdsSet.map(() => "?").join(",")})` : selActivityId ? "AND i.activity_id = ?" : "";
  const agingParams: string[] = [...(actIdsSet || (selActivityId ? [selActivityId] : []))];
  const agingBuckets = db.prepare(`SELECT
    CASE WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 0 AND 30 THEN '0-30'
      WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 31 AND 60 THEN '31-60'
      WHEN CAST(julianday('now') - julianday(i.due_date) AS INTEGER) BETWEEN 61 AND 90 THEN '61-90'
      ELSE '90+' END as name,
    COALESCE(SUM(i.total_amount - i.paid_amount), 0) as value
    FROM invoices i WHERE i.type = 'sales' AND i.status != 'paid' AND (i.total_amount - i.paid_amount) > 0 ${agingActFilter}
    GROUP BY name ORDER BY CASE name WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 ELSE 4 END`).all(...agingParams);

  return NextResponse.json({ activities, kpis, revenueByActivity: revByAct, monthlyComparison, agingBuckets });
}
