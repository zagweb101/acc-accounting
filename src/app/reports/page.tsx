"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";

type Activity = { id: string; name: string; code: string };
type FiscalYear = { id: string; name: string; start_date: string; end_date: string };
type CostCenter = { id: string; name: string; code: string };
type TBRow = { account_id: string; code: string; name_ar: string; account_type: string; nature: string; level: number; total_debit: number; total_credit: number; balance: number };
type ISRow = { acc_code: string; acc_name: string; account_type: string; nature: string; total_debit: number; total_credit: number; amount: number; compare_amount: number; diff: number; diff_pct: string | null };
type CCPRow = { id: string; name: string; code: string; revenue: number; expense: number; profit: number };

function exportCSV(rows: Record<string, unknown>[], filename: string, columns: { key: string; label: string }[]) {
  const bom = "\uFEFF";
  const header = columns.map(c => c.label).join(",");
  const body = rows.map(r => columns.map(c => {
    const v = r[c.key];
    return typeof v === "string" && (v.includes(",") || v.includes('"')) ? `"${v}"` : v ?? "";
  }).join(",")).join("\n");
  const blob = new Blob([bom + header + "\n" + body], { type: "text/csv;charset=utf-8;encoding:utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState("trial");

  const [activities, setActivities] = useState<Activity[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  // Trial Balance filters
  const [tbActivityMode, setTbActivityMode] = useState<"single" | "all">("single");
  const [tbActivity, setTbActivity] = useState("");
  const [tbFY, setTbFY] = useState("");
  const [tbFrom, setTbFrom] = useState("");
  const [tbTo, setTbTo] = useState("");
  const [tbCC, setTbCC] = useState("");
  const [tbRows, setTbRows] = useState<TBRow[]>([]);
  const [tbTotals, setTbTotals] = useState({ debit: 0, credit: 0 });

  // Income Statement filters
  const [isType, setIsType] = useState("single");
  const [isActivity, setIsActivity] = useState("");
  const [isFY, setIsFY] = useState("");
  const [isFrom, setIsFrom] = useState("");
  const [isTo, setIsTo] = useState("");
  const [isCFrom, setisCFrom] = useState("");
  const [isCTo, setisCTo] = useState("");
  const [isRows, setIsRows] = useState<ISRow[]>([]);
  const [isTotals, setIsTotals] = useState({ period: { revenue: 0, expenses: 0, net: 0 }, compare: { revenue: 0, expenses: 0, net: 0 } });

  // Cost Center Profitability filters
  const [ccActivity, setCcActivity] = useState("");
  const [ccFrom, setCcFrom] = useState("");
  const [ccTo, setCcTo] = useState("");
  const [ccRows, setCcRows] = useState<CCPRow[]>([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/activities").then(r => r.json()).then(d => {
      setActivities(d.activities);
      if (d.activities.length > 0) { setTbActivity(d.activities[0].id); setIsActivity(d.activities[0].id); setCcActivity(d.activities[0].id); }
    }).catch(() => setError("Failed to load activities"));
  }, []);

  useEffect(() => {
    const act = tab === "trial" ? tbActivity : tab === "income" ? isActivity : ccActivity;
    if (!act) return;
    fetch(`/api/fiscal-years?activity_id=${act}`).then(r => r.json()).then(d => setFiscalYears(d.fiscal_years || [])).catch(() => {});
    fetch(`/api/cost-centers?activity_id=${act}`).then(r => r.json()).then(d => setCostCenters(d.centers || [])).catch(() => {});
  }, [tab, tbActivity, isActivity, ccActivity]);

  async function loadTB() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (tbActivityMode === "all") {
        params.set("activity_ids", activities.map(a => a.id).join(","));
      } else {
        params.set("activity_id", tbActivity);
      }
      if (tbFY) params.set("fiscal_year_id", tbFY);
      if (tbFrom) params.set("from", tbFrom);
      if (tbTo) params.set("to", tbTo);
      if (tbCC) params.set("cost_center_id", tbCC);
      const r = await fetch(`/api/reports/trial-balance?${params}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setTbRows(d.rows); setTbTotals(d.totals);
    } catch { setError("Failed to load trial balance"); }
    setLoading(false);
  }

  async function loadIS() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ type: isType, activity_id: isActivity });
      if (isFY) params.set("fiscal_year_id", isFY);
      if (isFrom) params.set("from", isFrom);
      if (isTo) params.set("to", isTo);
      if (isType === "compare" && isCFrom) params.set("compare_from", isCFrom);
      if (isType === "compare" && isCTo) params.set("compare_to", isCTo);
      const r = await fetch(`/api/reports/income-statement?${params}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setIsRows(d.rows); setIsTotals(d.totals);
    } catch { setError("Failed to load income statement"); }
    setLoading(false);
  }

  async function loadCC() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ activity_id: ccActivity });
      if (ccFrom) params.set("from", ccFrom);
      if (ccTo) params.set("to", ccTo);
      const r = await fetch(`/api/cost-centers/profitability?${params}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setCcRows(d.rows);
    } catch { setError("Failed to load cost center profitability"); }
    setLoading(false);
  }

  const filteredTB = tbRows.filter(r => r.level > 1);

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-8" dir="rtl">
      <section className="max-w-7xl w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ù…Ø§Ù„ÙŠØ©</h1>
          <p className="text-gray-600">ØªÙ‚Ø§Ø±ÙŠØ± Ù…ØªÙ‚Ø¯Ù…Ø© â€” Ù…ÙŠØ²Ø§Ù† Ù…Ø±Ø§Ø¬Ø¹Ø©ØŒ Ù‚Ø§Ø¦Ù…Ø© Ø¯Ø®Ù„ Ù…Ù‚Ø§Ø±Ù†Ø©ØŒ Ø±Ø¨Ø­ÙŠØ© Ù…Ø±Ø§ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ©</p>
        </GlassCard>
      </section>

      <section className="max-w-7xl w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-1 bg-black/20 rounded-2xl p-1 mb-6 w-fit">
            <button onClick={() => setTab("trial")} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === "trial" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>Ù…ÙŠØ²Ø§Ù† Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©</button>
            <button onClick={() => setTab("income")} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === "income" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¯Ø®Ù„</button>
            <button onClick={() => setTab("cc")} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === "cc" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>Ø±Ø¨Ø­ÙŠØ© Ù…Ø±Ø§ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ©</button>
          </div>

          {error && <div className="card mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          {/* ====== Trial Balance ====== */}
          {tab === "trial" && (
            <div>
              <div className="flex items-center gap-4 flex-wrap mb-6">
                <div className="flex items-center gap-1 bg-black/20 rounded-2xl p-1">
                  <button onClick={() => setTbActivityMode("single")} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${tbActivityMode === "single" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>Ù†Ø´Ø§Ø· ÙˆØ§Ø­Ø¯</button>
                  <button onClick={() => setTbActivityMode("all")} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${tbActivityMode === "all" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>ÙƒÙ„ Ø§Ù„Ø£Ù†Ø´Ø·Ø©</button>
                </div>
                {tbActivityMode === "single" && (
                  <select value={tbActivity} onChange={e => setTbActivity(e.target.value)} className="input-field max-w-[200px] cursor-pointer">
                    {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                  </select>
                )}
                <select value={tbFY} onChange={e => setTbFY(e.target.value)} className="input-field max-w-[200px] cursor-pointer">
                  <option value="">ÙƒÙ„ Ø§Ù„Ø³Ù†ÙˆØ§Øª</option>
                  {fiscalYears.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <input type="date" value={tbFrom} onChange={e => setTbFrom(e.target.value)} className="input-field max-w-[160px]" placeholder="Ù…Ù†" />
                <input type="date" value={tbTo} onChange={e => setTbTo(e.target.value)} className="input-field max-w-[160px]" placeholder="Ø¥Ù„Ù‰" />
                <select value={tbCC} onChange={e => setTbCC(e.target.value)} className="input-field max-w-[200px] cursor-pointer">
                  <option value="">ÙƒÙ„ Ø§Ù„Ù…Ø±Ø§ÙƒØ²</option>
                  {costCenters.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
                <GlassButton onClick={loadTB} disabled={loading}>{loading ? "..." : "ØªØ´ØºÙŠÙ„ Ø§Ù„ØªÙ‚Ø±ÙŠØ±"}</GlassButton>
              </div>

              {tbRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <GlassButton onClick={() => exportCSV(filteredTB, "mizan-murajaa.csv", [
                      { key: "code", label: "Ø§Ù„ÙƒÙˆØ¯" }, { key: "name_ar", label: "Ø§Ù„Ø­Ø³Ø§Ø¨" },
                      { key: "total_debit", label: "Ù…Ø¯ÙŠÙ†" }, { key: "total_credit", label: "Ø¯Ø§Ø¦Ù†" },
                      { key: "balance", label: "Ø§Ù„Ø±ØµÙŠØ¯" },
                    ])} className="text-xs">ØªØµØ¯ÙŠØ± Excel</GlassButton>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-gray-600">Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©: <span className="text-red-300 font-mono font-semibold">{tbTotals.debit.toFixed(2)}</span></span>
                      <span className="text-gray-600">Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø£Ø±ØµØ¯Ø© Ø§Ù„Ø¯Ø§Ø¦Ù†Ø©: <span className="text-emerald-700 font-mono font-semibold">{tbTotals.credit.toFixed(2)}</span></span>
                      <span className={`font-mono font-semibold ${tbTotals.debit === tbTotals.credit ? "text-emerald-700" : "text-red-300"}`}>
                        {tbTotals.debit === tbTotals.credit ? "âœ“ Ù…ØªÙˆØ§Ø²Ù†" : "âœ• ØºÙŠØ± Ù…ØªÙˆØ§Ø²Ù†"}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-2xl bg-black/10 max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr className="bg-gray-100 backdrop-blur-xl">
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ÙƒÙˆØ¯</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø­Ø³Ø§Ø¨</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ù†ÙˆØ¹</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Ù…Ø¯ÙŠÙ†</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø¯Ø§Ø¦Ù†</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø±ØµÙŠØ¯</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTB.map((r, i) => (
                          <tr key={r.account_id} className={`${i < filteredTB.length - 1 ? "border-b border-gray-200" : ""} ${r.level === 2 ? "" : "bg-gray-50"}`}>
                            <td className={`px-4 py-2.5 font-mono text-xs ${r.level > 2 ? "pr-8" : "text-gray-800"}`}>{r.code}</td>
                            <td className={`px-4 py-2.5 ${r.level > 2 ? "text-gray-700 pr-8" : "text-gray-900 font-medium"}`}>{r.name_ar}</td>
                            <td className={`px-4 py-2.5 text-xs ${r.account_type === "asset" ? "text-blue-700" : r.account_type === "liability" ? "text-amber-700" : r.account_type === "equity" ? "text-violet-700" : r.account_type === "revenue" ? "text-emerald-700" : "text-red-300"}`}>
                              {r.account_type === "asset" ? "Ø£ØµÙ„" : r.account_type === "liability" ? "Ø®ØµÙ…" : r.account_type === "equity" ? "Ø­Ù‚ Ù…Ù„ÙƒÙŠØ©" : r.account_type === "revenue" ? "Ø¥ÙŠØ±Ø§Ø¯" : "Ù…ØµØ±ÙˆÙ"}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-red-300/80">{r.total_debit > 0 ? r.total_debit.toFixed(2) : "â€”"}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-emerald-700/80">{r.total_credit > 0 ? r.total_credit.toFixed(2) : "â€”"}</td>
                            <td className={`px-4 py-2.5 font-mono text-xs font-semibold text-left ${r.balance >= 0 ? "text-emerald-700" : "text-red-300"}`}>{r.balance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== Income Statement ====== */}
          {tab === "income" && (
            <div>
              <div className="flex items-center gap-4 flex-wrap mb-6">
                <div className="flex items-center gap-1 bg-black/20 rounded-2xl p-1">
                  <button onClick={() => setIsType("single")} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${isType === "single" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>ÙØªØ±Ø© ÙˆØ§Ø­Ø¯Ø©</button>
                  <button onClick={() => setIsType("compare")} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${isType === "compare" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>Ù…Ù‚Ø§Ø±Ù†Ø©</button>
                </div>
                <select value={isActivity} onChange={e => setIsActivity(e.target.value)} className="input-field max-w-[200px] cursor-pointer">
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                </select>
                <select value={isFY} onChange={e => setIsFY(e.target.value)} className="input-field max-w-[200px] cursor-pointer">
                  <option value="">ÙƒÙ„ Ø§Ù„Ø³Ù†ÙˆØ§Øª</option>
                  {fiscalYears.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <input type="date" value={isFrom} onChange={e => setIsFrom(e.target.value)} className="input-field max-w-[160px]" placeholder="Ù…Ù†" />
                <input type="date" value={isTo} onChange={e => setIsTo(e.target.value)} className="input-field max-w-[160px]" placeholder="Ø¥Ù„Ù‰" />
                {isType === "compare" && (
                  <>
                    <span className="text-gray-400 text-xs">Ù…Ù‚Ø§Ø±Ù†Ø©:</span>
                    <input type="date" value={isCFrom} onChange={e => setisCFrom(e.target.value)} className="input-field max-w-[160px]" placeholder="Ù…Ù†" />
                    <input type="date" value={isCTo} onChange={e => setisCTo(e.target.value)} className="input-field max-w-[160px]" placeholder="Ø¥Ù„Ù‰" />
                  </>
                )}
                <GlassButton onClick={loadIS} disabled={loading}>{loading ? "..." : "ØªØ´ØºÙŠÙ„ Ø§Ù„ØªÙ‚Ø±ÙŠØ±"}</GlassButton>
              </div>

              {isRows.length > 0 && (
                <div>
                  {isType === "compare" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <GlassCard className="p-5">
                        <h3 className="text-gray-800 font-semibold mb-3">Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©</h3>
                        <p className="text-2xl font-mono text-emerald-700 font-semibold">{isTotals.period.net.toFixed(2)}</p>
                        <p className="text-xs text-gray-400 mt-1">ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Ø¥ÙŠØ±Ø§Ø¯Ø§Øª: <span className="text-emerald-700">{isTotals.period.revenue.toFixed(2)}</span></span>
                          <span>Ù…ØµØ±ÙˆÙØ§Øª: <span className="text-red-300">{isTotals.period.expenses.toFixed(2)}</span></span>
                        </div>
                      </GlassCard>
                      <GlassCard className="p-5">
                        <h3 className="text-gray-800 font-semibold mb-3">Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ù…Ù‚Ø§Ø±Ù†Ø©</h3>
                        <p className="text-2xl font-mono text-emerald-700 font-semibold">{isTotals.compare.net.toFixed(2)}</p>
                        <p className="text-xs text-gray-400 mt-1">ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Ø¥ÙŠØ±Ø§Ø¯Ø§Øª: <span className="text-emerald-700">{isTotals.compare.revenue.toFixed(2)}</span></span>
                          <span>Ù…ØµØ±ÙˆÙØ§Øª: <span className="text-red-300">{isTotals.compare.expenses.toFixed(2)}</span></span>
                        </div>
                      </GlassCard>
                    </div>
                  ) : (
                    <div className="flex gap-6 mb-6 px-2">
                      <div><span className="text-gray-600 text-sm">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª: </span><span className="text-emerald-700 font-mono font-semibold">{isTotals.period.revenue.toFixed(2)}</span></div>
                      <div><span className="text-gray-600 text-sm">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª: </span><span className="text-red-300 font-mono font-semibold">{isTotals.period.expenses.toFixed(2)}</span></div>
                      <div><span className="text-gray-600 text-sm">ØµØ§ÙÙŠ Ø§Ù„Ø¯Ø®Ù„: </span><span className={`font-mono font-semibold ${isTotals.period.net >= 0 ? "text-emerald-700" : "text-red-300"}`}>{isTotals.period.net.toFixed(2)}</span></div>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-2xl bg-black/10 max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr className="bg-gray-100 backdrop-blur-xl">
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ÙƒÙˆØ¯</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø­Ø³Ø§Ø¨</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ù†ÙˆØ¹</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ù…Ø¨Ù„Øº</th>
                          {isType === "compare" && <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ù…Ù‚Ø§Ø±Ù†Ø©</th>}
                          {isType === "compare" && <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ÙØ±Ù‚</th>}
                          {isType === "compare" && <th className="text-right px-4 py-3 text-gray-600 font-medium">%</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {isRows.map((r, i) => (
                          <tr key={r.acc_code} className={i < isRows.length - 1 ? "border-b border-gray-200" : ""}>
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.acc_code}</td>
                            <td className="px-4 py-2.5 text-gray-800">{r.acc_name}</td>
                            <td className="px-4 py-2.5 text-xs">
                              <span className={`${r.account_type === "revenue" ? "text-emerald-700" : "text-red-300"}`}>
                                {r.account_type === "revenue" ? "Ø¥ÙŠØ±Ø§Ø¯" : "Ù…ØµØ±ÙˆÙ"}
                              </span>
                            </td>
                            <td className={`px-4 py-2.5 font-mono text-xs font-semibold ${r.account_type === "revenue" ? "text-emerald-700" : "text-red-300"}`}>{r.amount.toFixed(2)}</td>
                            {isType === "compare" && <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.compare_amount.toFixed(2)}</td>}
                            {isType === "compare" && (
                              <td className={`px-4 py-2.5 font-mono text-xs ${r.diff >= 0 ? "text-emerald-700" : "text-red-300"}`}>{r.diff.toFixed(2)}</td>
                            )}
                            {isType === "compare" && (
                              <td className={`px-4 py-2.5 font-mono text-xs ${r.diff_pct !== null ? (parseFloat(r.diff_pct) >= 0 ? "text-emerald-700" : "text-red-300") : "text-gray-400"}`}>
                                {r.diff_pct !== null ? `${r.diff_pct}%` : "â€”"}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== Cost Center Profitability ====== */}
          {tab === "cc" && (
            <div>
              <div className="flex items-center gap-4 flex-wrap mb-6">
                <select value={ccActivity} onChange={e => setCcActivity(e.target.value)} className="input-field max-w-[200px] cursor-pointer">
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                </select>
                <input type="date" value={ccFrom} onChange={e => setCcFrom(e.target.value)} className="input-field max-w-[160px]" placeholder="Ù…Ù†" />
                <input type="date" value={ccTo} onChange={e => setCcTo(e.target.value)} className="input-field max-w-[160px]" placeholder="Ø¥Ù„Ù‰" />
                <GlassButton onClick={loadCC} disabled={loading}>{loading ? "..." : "ØªØ´ØºÙŠÙ„ Ø§Ù„ØªÙ‚Ø±ÙŠØ±"}</GlassButton>
              </div>

              {ccRows.length > 0 && (
                <div className="grid gap-4">
                  {ccRows.map(cc => {
                    const margin = cc.revenue > 0 ? (cc.profit / cc.revenue * 100) : 0;
                    return (
                      <GlassCard key={cc.id} className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-gray-900 font-semibold">{cc.name}</h3>
                          <span className="text-gray-400 font-mono text-xs">{cc.code}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-gray-400 text-xs">Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</p>
                            <p className="text-emerald-700 font-mono font-semibold text-lg">{cc.revenue.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</p>
                            <p className="text-red-300 font-mono font-semibold text-lg">{cc.expense.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">ØµØ§ÙÙŠ Ø§Ù„Ø±Ø¨Ø­</p>
                            <p className={`font-mono font-semibold text-lg ${cc.profit >= 0 ? "text-emerald-700" : "text-red-300"}`}>{cc.profit.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Ø§Ù„Ù‡Ø§Ù…Ø´</p>
                            <p className={`font-mono font-semibold text-lg ${margin >= 0 ? "text-emerald-700" : "text-red-300"}`}>{margin.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="mt-4 w-full h-2 rounded-full bg-black/20 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${margin >= 0 ? "bg-gradient-to-l from-emerald-500 to-emerald-400" : "bg-gradient-to-l from-red-500 to-red-400"}`}
                            style={{ width: `${Math.min(Math.abs(margin), 100)}%` }} />
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </section>
    </div>
  );
}
