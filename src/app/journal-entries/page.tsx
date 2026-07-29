"use client";

import { useEffect, useState, useCallback } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";

type Activity = { id: string; name: string; code: string };
type FiscalYear = { id: string; activity_id: string; name: string; start_date: string; end_date: string };
type Account = { id: string; code: string; name_ar: string; account_type: string; is_postable: number };
type CostCenter = { id: string; name: string; code: string };

type Line = {
  _key: number;
  account_id: string;
  account_name: string;
  cost_center_id: string;
  cost_center_name: string;
  contact_id: string;
  item_id: string;
  debit: number;
  credit: number;
  description: string;
  due_date: string;
};

type Entry = {
  id: string;
  entry_number: string;
  activity_id: string;
  fiscal_year_id: string;
  fiscal_year_name: string;
  entry_date: string;
  description: string | null;
  total_debit: number;
  total_credit: number;
  status: string;
  created_at: string;
  lines?: EntryLine[];
};

type EntryLine = {
  id: string;
  account_id: string;
  account_name: string;
  cost_center_id: string | null;
  cost_center_name: string | null;
  contact_id: string | null;
  debit: number;
  credit: number;
  description: string | null;
  due_date: string | null;
};

const statusColors: Record<string, string> = {
  draft: "text-amber-700 bg-amber-500/15 border-amber-500/20",
  posted: "text-emerald-700 bg-emerald-500/15 border-emerald-500/20",
  reversed: "text-red-300 bg-red-500/15 border-red-500/20",
};
const statusLabels: Record<string, string> = { draft: "Ù…Ø³ÙˆØ¯Ø©", posted: "Ù…Ø±Ø­Ù‘Ù„", reversed: "Ù…Ø¹ÙƒÙˆØ³" };

let lineKeyCounter = 0;
function newLine(): Line { return { _key: ++lineKeyCounter, account_id: "", account_name: "", cost_center_id: "", cost_center_name: "", contact_id: "", item_id: "", debit: 0, credit: 0, description: "", due_date: "" }; }

export default function JournalEntriesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [activeActivity, setActiveActivity] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formFY, setFormFY] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLines, setFormLines] = useState<Line[]>([newLine(), newLine()]);
  const [saving, setSaving] = useState(false);

  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const [actionLoading, setActionLoading] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<Entry | null>(null);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    fetch("/api/activities").then(r => r.json()).then(d => {
      setActivities(d.activities);
      if (d.activities.length > 0) setActiveActivity(d.activities[0].id);
    }).catch(() => setError("Failed to load activities"));
  }, []);

  useEffect(() => {
    if (!activeActivity) return;
    fetch(`/api/fiscal-years?activity_id=${activeActivity}`).then(r => r.json()).then(d => {
      setFiscalYears(d.fiscal_years || []);
      const fys = d.fiscal_years || [];
      if (fys.length > 0 && !formFY) setFormFY(fys[0].id);
    }).catch(() => {});
  }, [activeActivity, showForm]);

  useEffect(() => {
    if (!activeActivity) return;
    fetch(`/api/accounts?activity_id=${activeActivity}`).then(r => r.json()).then(d => setAccounts(d.accounts || [])).catch(() => {});
    fetch(`/api/cost-centers?activity_id=${activeActivity}`).then(r => r.json()).then(d => setCostCenters(d.centers || [])).catch(() => {});
  }, [activeActivity]);

  useEffect(() => {
    if (!activeActivity) return;
    let cancelled = false;
    const params = new URLSearchParams({ activity_id: activeActivity });
    if (filterStatus) params.set("status", filterStatus);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (filterSearch) params.set("search", filterSearch);

    fetch(`/api/journal-entries?${params}`)
      .then(r => r.json()).then(d => { if (!cancelled) { setEntries(d.entries); setError(""); } })
      .catch(() => { if (!cancelled) setError("Failed to load entries"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeActivity, refreshKey, filterStatus, filterFrom, filterTo, filterSearch]);

  const totals = formLines.reduce((acc, l) => ({ debit: acc.debit + (l.debit || 0), credit: acc.credit + (l.credit || 0) }), { debit: 0, credit: 0 });
  const balanced = Math.abs(totals.debit - totals.credit) < 0.001;

  async function saveEntry() {
    if (!activeActivity || !formFY || !formDate) { setError("Fill required fields"); return; }
    if (!balanced) { setError("Debit must equal credit"); return; }
    if (formLines.some(l => !l.account_id)) { setError("Each line needs an account"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activeActivity,
          fiscal_year_id: formFY,
          entry_date: formDate,
          description: formDesc || null,
          lines: formLines.map(l => ({
            account_id: l.account_id,
            cost_center_id: l.cost_center_id || null,
            contact_id: l.contact_id || null,
            item_id: l.item_id || null,
            debit: l.debit || 0,
            credit: l.credit || 0,
            description: l.description || null,
            due_date: l.due_date || null,
          })),
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setShowForm(false); setError(""); refetch();
      setFormLines([newLine(), newLine()]); setFormDate(new Date().toISOString().split("T")[0]); setFormDesc(""); setFormFY("");
    } catch { setError("Failed to save entry"); }
    setSaving(false);
  }

  async function changeStatus(entry: Entry, action: string) {
    setActionLoading(entry.id);
    try {
      const r = await fetch(`/api/journal-entries/${entry.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setError(""); refetch();
    } catch { setError(`Failed to ${action} entry`); }
    setActionLoading("");
  }

  async function deleteEntry(entry: Entry) {
    setActionLoading(entry.id);
    try {
      const r = await fetch(`/api/journal-entries/${entry.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setConfirmDelete(null); setError(""); refetch();
    } catch { setError("Failed to delete entry"); }
    setActionLoading("");
  }

  function openView(entry: Entry) {
    fetch(`/api/journal-entries/${entry.id}`).then(r => r.json()).then(d => setViewEntry(d.entry)).catch(() => setError("Failed to load entry details"));
  }

  function updateLine(key: number, field: keyof Line, value: unknown) {
    setFormLines(prev => prev.map(l => l._key === key ? { ...l, [field]: value } : l));
  }

  function addLine() { setFormLines(prev => [...prev, newLine()]); }

  function removeLine(key: number) {
    if (formLines.length <= 2) return;
    setFormLines(prev => prev.filter(l => l._key !== key));
  }

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-8" dir="rtl">
      <section className="max-w-6xl w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Ù‚ÙŠÙˆØ¯ Ø§Ù„ÙŠÙˆÙ…ÙŠØ©</h1>
          <p className="text-gray-600">Ø¥Ø¯Ø§Ø±Ø© Ù‚ÙŠÙˆØ¯ Ø§Ù„ÙŠÙˆÙ…ÙŠØ© â€” ØªØ³Ø¬ÙŠÙ„ ÙˆØ¹Ø±Ø¶ ÙˆØªØ±Ø­ÙŠÙ„ Ø§Ù„Ù‚ÙŠÙˆØ¯ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠØ©</p>
        </GlassCard>
      </section>

      <section className="max-w-6xl w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="input-field max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field max-w-[140px] cursor-pointer">
              <option value="">ÙƒÙ„ Ø§Ù„Ø­Ø§Ù„Ø§Øª</option>
              <option value="draft">Ù…Ø³ÙˆØ¯Ø©</option>
              <option value="posted">Ù…Ø±Ø­Ù‘Ù„</option>
              <option value="reversed">Ù…Ø¹ÙƒÙˆØ³</option>
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input-field max-w-[170px]" />
            <span className="text-gray-300">â€“</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input-field max-w-[170px]" />
            <div className="flex-1 min-w-[180px]"><GlassInput placeholder="Ø¨Ø­Ø« Ø¨Ø±Ù‚Ù… Ø§Ù„Ù‚ÙŠØ¯ Ø£Ùˆ Ø§Ù„ÙˆØµÙ..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} /></div>
            <GlassButton onClick={() => { setFormLines([newLine(), newLine()]); setFormDate(new Date().toISOString().split("T")[0]); setFormDesc(""); setFormFY(fiscalYears[0]?.id || ""); setShowForm(true); }}>+ Ù‚ÙŠØ¯ Ø¬Ø¯ÙŠØ¯</GlassButton>
          </div>

          {error && <div className="card mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          {loading ? (
            <p className="text-gray-400 text-center py-12">Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</p>
          ) : entries.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚ÙŠÙˆØ¯. Ø£Ø¶Ù Ù‚ÙŠØ¯Ø§Ù‹ Ø¬Ø¯ÙŠØ¯Ø§Ù‹ Ù„Ù„Ø¨Ø¯Ø¡</p>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 backdrop-blur-xl">
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø±Ù‚Ù… Ø§Ù„Ù‚ÙŠØ¯</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ÙˆØµÙ</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ù…Ø¯ÙŠÙ†</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø¯Ø§Ø¦Ù†</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ©</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={entry.id} className={i < entries.length - 1 ? "border-b border-gray-200" : ""}>
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs">{entry.entry_number}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{entry.entry_date}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{entry.description || "â€”"}</td>
                      <td className="px-4 py-3 text-amber-700 font-mono text-xs">{entry.total_debit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-amber-700 font-mono text-xs">{entry.total_credit.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusColors[entry.status] || ""}`}>
                          {statusLabels[entry.status] || entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{entry.fiscal_year_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openView(entry)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all text-xs" title="Ø¹Ø±Ø¶">ðŸ‘</button>
                          {entry.status === "draft" && (
                            <>
                              <button onClick={() => changeStatus(entry, "post")} disabled={actionLoading === entry.id} className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-700 transition-all text-xs" title="ØªØ±Ø­ÙŠÙ„">âœ“</button>
                              <button onClick={() => setConfirmDelete(entry)} disabled={actionLoading === entry.id} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-red-500/20 text-gray-600 hover:text-red-300 transition-all text-xs" title="Ø­Ø°Ù">âœ•</button>
                            </>
                          )}
                          {entry.status === "posted" && (
                            <>
                              <button onClick={() => changeStatus(entry, "unpost")} disabled={actionLoading === entry.id} className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/10 hover:bg-amber-500/25 text-amber-700 transition-all text-xs" title="Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ØªØ±Ø­ÙŠÙ„">â†©</button>
                              <button onClick={() => changeStatus(entry, "reverse")} disabled={actionLoading === entry.id} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500/25 text-red-300 transition-all text-xs" title="Ø¹ÙƒØ³">âŸ³</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
          <GlassCard className="p-8 w-full max-w-4xl mx-4 my-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Ø¥Ø¶Ø§ÙØ© Ù‚ÙŠØ¯ ÙŠÙˆÙ…ÙŠØ© Ø¬Ø¯ÙŠØ¯</h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">Ø§Ù„ØªØ§Ø±ÙŠØ®</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="input-field" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ©</label>
                  <select value={formFY} onChange={e => setFormFY(e.target.value)} className="input-field cursor-pointer">
                    {fiscalYears.map(fy => <option key={fy.id} value={fy.id}>{fy.name} ({fy.start_date} ~ {fy.end_date})</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">Ø§Ù„ÙˆØµÙ</label>
                  <GlassInput value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="ÙˆØµÙ Ø§Ù„Ù‚ÙŠØ¯" />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-800 text-sm font-medium">Ø¨Ù†ÙˆØ¯ Ø§Ù„Ù‚ÙŠØ¯</h3>
                  <GlassButton onClick={addLine} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10 text-xs !px-3 !py-1">+ Ø¥Ø¶Ø§ÙØ© Ø¨Ù†Ø¯</GlassButton>
                </div>
                <div className="overflow-x-auto rounded-2xl bg-black/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 backdrop-blur-xl">
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø§Ù„Ø­Ø³Ø§Ø¨</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ù…Ø±ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ©</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ù…Ø¯ÙŠÙ†</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø¯Ø§Ø¦Ù†</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø§Ù„ÙˆØµÙ</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formLines.map(line => (
                        <tr key={line._key} className="border-b border-gray-200">
                          <td className="px-3 py-1.5">
                            <select value={line.account_id} onChange={e => {
                              const acc = accounts.find(a => a.id === e.target.value);
                              updateLine(line._key, "account_id", e.target.value);
                              updateLine(line._key, "account_name", acc ? `${acc.code} - ${acc.name_ar}` : "");
                            }} className="input-field text-xs cursor-pointer max-w-[200px]">
                              <option value="">-- Ø§Ø®ØªØ± --</option>
                              {accounts.filter(a => a.is_postable !== 0).map(a => (
                                <option key={a.id} value={a.id}>{a.code} - {a.name_ar}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <select value={line.cost_center_id} onChange={e => {
                              const cc = costCenters.find(c => c.id === e.target.value);
                              updateLine(line._key, "cost_center_id", e.target.value);
                              updateLine(line._key, "cost_center_name", cc ? cc.name : "");
                            }} className="input-field text-xs cursor-pointer max-w-[160px]">
                              <option value="">â€”</option>
                              {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" step="0.001" min="0" value={line.debit || ""} onChange={e => { updateLine(line._key, "debit", parseFloat(e.target.value) || 0); updateLine(line._key, "credit", 0); }} className="input-field text-xs w-[110px]" placeholder="0" />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" step="0.001" min="0" value={line.credit || ""} onChange={e => { updateLine(line._key, "credit", parseFloat(e.target.value) || 0); updateLine(line._key, "debit", 0); }} className="input-field text-xs w-[110px]" placeholder="0" />
                          </td>
                          <td className="px-3 py-1.5">
                            <GlassInput value={line.description} onChange={e => updateLine(line._key, "description", e.target.value)} className="text-xs" placeholder="..." />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="date" value={line.due_date} onChange={e => updateLine(line._key, "due_date", e.target.value)} className="input-field text-xs w-[130px]" />
                          </td>
                          <td className="px-3 py-1.5">
                            {formLines.length > 2 && (
                              <button onClick={() => removeLine(line._key)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-50 hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-all text-xs">âœ•</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td className="px-3 py-2 text-gray-600 text-xs font-medium">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
                        <td></td>
                        <td className={`px-3 py-2 font-mono text-xs font-medium ${totals.debit > 0 ? "text-amber-700" : "text-gray-400"}`}>{totals.debit.toFixed(3)}</td>
                        <td className={`px-3 py-2 font-mono text-xs font-medium ${totals.credit > 0 ? "text-amber-700" : "text-gray-400"}`}>{totals.credit.toFixed(3)}</td>
                        <td colSpan={3} className="px-3 py-2">
                          {totals.debit > 0 || totals.credit > 0 ? (
                            <span className={`text-xs ${balanced ? "text-emerald-700" : "text-red-300"}`}>
                              {balanced ? "âœ“ Ù…ØªÙˆØ§Ø²Ù†" : `âœ— ØºÙŠØ± Ù…ØªÙˆØ§Ø²Ù† (Ø§Ù„ÙØ§Ø±Ù‚ ${Math.abs(totals.debit - totals.credit).toFixed(3)})`}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">Ø£Ø¯Ø®Ù„ Ø§Ù„Ù…Ø¨Ø§Ù„Øº</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <GlassButton onClick={saveEntry} disabled={!balanced || saving || formLines.some(l => !l.account_id)}>
                  {saving ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Ø­ÙØ¸ Ø§Ù„Ù‚ÙŠØ¯"}
                </GlassButton>
                <GlassButton onClick={() => setShowForm(false)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {viewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Ù‚ÙŠØ¯: {viewEntry.entry_number}</h2>
              <button onClick={() => setViewEntry(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all">âœ•</button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div><span className="text-gray-400">Ø§Ù„ØªØ§Ø±ÙŠØ®:</span> <span className="text-gray-800">{viewEntry.entry_date}</span></div>
              <div><span className="text-gray-400">Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ©:</span> <span className="text-gray-800">{viewEntry.fiscal_year_name}</span></div>
              <div>
                <span className="text-gray-400">Ø§Ù„Ø­Ø§Ù„Ø©:</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border mr-2 ${statusColors[viewEntry.status] || ""}`}>
                  {statusLabels[viewEntry.status] || viewEntry.status}
                </span>
              </div>
              {viewEntry.description && <div className="col-span-3"><span className="text-gray-400">Ø§Ù„ÙˆØµÙ:</span> <span className="text-gray-800">{viewEntry.description}</span></div>}
            </div>
            <div className="overflow-hidden rounded-2xl bg-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 backdrop-blur-xl">
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø­Ø³Ø§Ø¨</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ù…Ø±ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ©</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ù…Ø¯ÙŠÙ†</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø¯Ø§Ø¦Ù†</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ÙˆØµÙ</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewEntry.lines || []).map((line, i) => (
                    <tr key={line.id || i} className={i < (viewEntry.lines?.length || 0) - 1 ? "border-b border-gray-200" : ""}>
                      <td className="px-4 py-3 text-gray-800">{line.account_name || "â€”"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{line.cost_center_name || "â€”"}</td>
                      <td className="px-4 py-3 text-amber-700 font-mono text-xs">{line.debit > 0 ? line.debit.toFixed(3) : "â€”"}</td>
                      <td className="px-4 py-3 text-amber-700 font-mono text-xs">{line.credit > 0 ? line.credit.toFixed(3) : "â€”"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{line.description || "â€”"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 text-xs font-medium">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
                    <td></td>
                    <td className="px-4 py-3 text-amber-700 font-mono text-xs font-medium">{viewEntry.total_debit.toFixed(3)}</td>
                    <td className="px-4 py-3 text-amber-700 font-mono text-xs font-medium">{viewEntry.total_credit.toFixed(3)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <GlassButton onClick={() => { setViewEntry(null); }} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥ØºÙ„Ø§Ù‚</GlassButton>
              {viewEntry.status === "draft" && (
                <GlassButton onClick={() => { changeStatus(viewEntry, "post"); setViewEntry(null); }}>ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ù‚ÙŠØ¯</GlassButton>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-md mx-4 text-center">
            <p className="text-gray-900 text-lg mb-2">Ø­Ø°Ù Ø§Ù„Ù‚ÙŠØ¯</p>
            <p className="text-gray-600 mb-6">{`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ø§Ù„Ù‚ÙŠØ¯ "${confirmDelete.entry_number}"ØŸ`}</p>
            <div className="flex items-center justify-center gap-3">
              <GlassButton onClick={() => deleteEntry(confirmDelete)} disabled={actionLoading === confirmDelete.id} className="bg-red-500/20 hover:bg-red-500/30">ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù</GlassButton>
              <GlassButton onClick={() => setConfirmDelete(null)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
