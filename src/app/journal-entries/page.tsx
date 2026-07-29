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
  draft: "text-amber-300 bg-amber-500/15 border-amber-500/20",
  posted: "text-emerald-300 bg-emerald-500/15 border-emerald-500/20",
  reversed: "text-red-300 bg-red-500/15 border-red-500/20",
};
const statusLabels: Record<string, string> = { draft: "مسودة", posted: "مرحّل", reversed: "معكوس" };

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
          <h1 className="text-4xl font-semibold tracking-tight text-white/90">قيود اليومية</h1>
          <p className="text-white/60">إدارة قيود اليومية — تسجيل وعرض وترحيل القيود المحاسبية</p>
        </GlassCard>
      </section>

      <section className="max-w-6xl w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="glass-input max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="glass-input max-w-[140px] cursor-pointer">
              <option value="">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="posted">مرحّل</option>
              <option value="reversed">معكوس</option>
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="glass-input max-w-[170px]" />
            <span className="text-white/30">–</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="glass-input max-w-[170px]" />
            <div className="flex-1 min-w-[180px]"><GlassInput placeholder="بحث برقم القيد أو الوصف..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} /></div>
            <GlassButton onClick={() => { setFormLines([newLine(), newLine()]); setFormDate(new Date().toISOString().split("T")[0]); setFormDesc(""); setFormFY(fiscalYears[0]?.id || ""); setShowForm(true); }}>+ قيد جديد</GlassButton>
          </div>

          {error && <div className="glass mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          {loading ? (
            <p className="text-white/40 text-center py-12">جاري التحميل...</p>
          ) : entries.length === 0 ? (
            <p className="text-white/40 text-center py-12">لا توجد قيود. أضف قيداً جديداً للبدء</p>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.05] backdrop-blur-xl">
                    <th className="text-right px-4 py-3 text-white/60 font-medium">رقم القيد</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">التاريخ</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">الوصف</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">مدين</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">دائن</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">السنة المالية</th>
                    <th className="text-center px-4 py-3 text-white/60 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={entry.id} className={i < entries.length - 1 ? "border-b border-white/[0.06]" : ""}>
                      <td className="px-4 py-3 text-white/90 font-mono text-xs">{entry.entry_number}</td>
                      <td className="px-4 py-3 text-white/70 text-xs">{entry.entry_date}</td>
                      <td className="px-4 py-3 text-white/70 max-w-[200px] truncate">{entry.description || "—"}</td>
                      <td className="px-4 py-3 text-amber-300 font-mono text-xs">{entry.total_debit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-amber-300 font-mono text-xs">{entry.total_credit.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusColors[entry.status] || ""}`}>
                          {statusLabels[entry.status] || entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">{entry.fiscal_year_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openView(entry)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white/90 transition-all text-xs" title="عرض">👁</button>
                          {entry.status === "draft" && (
                            <>
                              <button onClick={() => changeStatus(entry, "post")} disabled={actionLoading === entry.id} className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 transition-all text-xs" title="ترحيل">✓</button>
                              <button onClick={() => setConfirmDelete(entry)} disabled={actionLoading === entry.id} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-red-500/20 text-white/60 hover:text-red-300 transition-all text-xs" title="حذف">✕</button>
                            </>
                          )}
                          {entry.status === "posted" && (
                            <>
                              <button onClick={() => changeStatus(entry, "unpost")} disabled={actionLoading === entry.id} className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 transition-all text-xs" title="إلغاء الترحيل">↩</button>
                              <button onClick={() => changeStatus(entry, "reverse")} disabled={actionLoading === entry.id} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500/25 text-red-300 transition-all text-xs" title="عكس">⟳</button>
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
            <h2 className="text-xl font-semibold text-white/90 mb-6">إضافة قيد يومية جديد</h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-white/60 text-sm">التاريخ</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="glass-input" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-white/60 text-sm">السنة المالية</label>
                  <select value={formFY} onChange={e => setFormFY(e.target.value)} className="glass-input cursor-pointer">
                    {fiscalYears.map(fy => <option key={fy.id} value={fy.id}>{fy.name} ({fy.start_date} ~ {fy.end_date})</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-white/60 text-sm">الوصف</label>
                  <GlassInput value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="وصف القيد" />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white/80 text-sm font-medium">بنود القيد</h3>
                  <GlassButton onClick={addLine} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10 text-xs !px-3 !py-1">+ إضافة بند</GlassButton>
                </div>
                <div className="overflow-x-auto rounded-2xl bg-black/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.05] backdrop-blur-xl">
                        <th className="text-right px-3 py-2 text-white/60 font-medium text-xs">الحساب</th>
                        <th className="text-right px-3 py-2 text-white/60 font-medium text-xs">مركز التكلفة</th>
                        <th className="text-right px-3 py-2 text-white/60 font-medium text-xs">مدين</th>
                        <th className="text-right px-3 py-2 text-white/60 font-medium text-xs">دائن</th>
                        <th className="text-right px-3 py-2 text-white/60 font-medium text-xs">الوصف</th>
                        <th className="text-right px-3 py-2 text-white/60 font-medium text-xs">تاريخ الاستحقاق</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formLines.map(line => (
                        <tr key={line._key} className="border-b border-white/[0.06]">
                          <td className="px-3 py-1.5">
                            <select value={line.account_id} onChange={e => {
                              const acc = accounts.find(a => a.id === e.target.value);
                              updateLine(line._key, "account_id", e.target.value);
                              updateLine(line._key, "account_name", acc ? `${acc.code} - ${acc.name_ar}` : "");
                            }} className="glass-input text-xs cursor-pointer max-w-[200px]">
                              <option value="">-- اختر --</option>
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
                            }} className="glass-input text-xs cursor-pointer max-w-[160px]">
                              <option value="">—</option>
                              {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" step="0.001" min="0" value={line.debit || ""} onChange={e => { updateLine(line._key, "debit", parseFloat(e.target.value) || 0); updateLine(line._key, "credit", 0); }} className="glass-input text-xs w-[110px]" placeholder="0" />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" step="0.001" min="0" value={line.credit || ""} onChange={e => { updateLine(line._key, "credit", parseFloat(e.target.value) || 0); updateLine(line._key, "debit", 0); }} className="glass-input text-xs w-[110px]" placeholder="0" />
                          </td>
                          <td className="px-3 py-1.5">
                            <GlassInput value={line.description} onChange={e => updateLine(line._key, "description", e.target.value)} className="text-xs" placeholder="..." />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="date" value={line.due_date} onChange={e => updateLine(line._key, "due_date", e.target.value)} className="glass-input text-xs w-[130px]" />
                          </td>
                          <td className="px-3 py-1.5">
                            {formLines.length > 2 && (
                              <button onClick={() => removeLine(line._key)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-red-500/20 text-white/40 hover:text-red-300 transition-all text-xs">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white/[0.03]">
                        <td className="px-3 py-2 text-white/60 text-xs font-medium">الإجمالي</td>
                        <td></td>
                        <td className={`px-3 py-2 font-mono text-xs font-medium ${totals.debit > 0 ? "text-amber-300" : "text-white/40"}`}>{totals.debit.toFixed(3)}</td>
                        <td className={`px-3 py-2 font-mono text-xs font-medium ${totals.credit > 0 ? "text-amber-300" : "text-white/40"}`}>{totals.credit.toFixed(3)}</td>
                        <td colSpan={3} className="px-3 py-2">
                          {totals.debit > 0 || totals.credit > 0 ? (
                            <span className={`text-xs ${balanced ? "text-emerald-300" : "text-red-300"}`}>
                              {balanced ? "✓ متوازن" : `✗ غير متوازن (الفارق ${Math.abs(totals.debit - totals.credit).toFixed(3)})`}
                            </span>
                          ) : (
                            <span className="text-white/30 text-xs">أدخل المبالغ</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <GlassButton onClick={saveEntry} disabled={!balanced || saving || formLines.some(l => !l.account_id)}>
                  {saving ? "جاري الحفظ..." : "حفظ القيد"}
                </GlassButton>
                <GlassButton onClick={() => setShowForm(false)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">إلغاء</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {viewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white/90">قيد: {viewEntry.entry_number}</h2>
              <button onClick={() => setViewEntry(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white/90 transition-all">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div><span className="text-white/40">التاريخ:</span> <span className="text-white/80">{viewEntry.entry_date}</span></div>
              <div><span className="text-white/40">السنة المالية:</span> <span className="text-white/80">{viewEntry.fiscal_year_name}</span></div>
              <div>
                <span className="text-white/40">الحالة:</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border mr-2 ${statusColors[viewEntry.status] || ""}`}>
                  {statusLabels[viewEntry.status] || viewEntry.status}
                </span>
              </div>
              {viewEntry.description && <div className="col-span-3"><span className="text-white/40">الوصف:</span> <span className="text-white/80">{viewEntry.description}</span></div>}
            </div>
            <div className="overflow-hidden rounded-2xl bg-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.05] backdrop-blur-xl">
                    <th className="text-right px-4 py-3 text-white/60 font-medium">الحساب</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">مركز التكلفة</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">مدين</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">دائن</th>
                    <th className="text-right px-4 py-3 text-white/60 font-medium">الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewEntry.lines || []).map((line, i) => (
                    <tr key={line.id || i} className={i < (viewEntry.lines?.length || 0) - 1 ? "border-b border-white/[0.06]" : ""}>
                      <td className="px-4 py-3 text-white/80">{line.account_name || "—"}</td>
                      <td className="px-4 py-3 text-white/60 text-xs">{line.cost_center_name || "—"}</td>
                      <td className="px-4 py-3 text-amber-300 font-mono text-xs">{line.debit > 0 ? line.debit.toFixed(3) : "—"}</td>
                      <td className="px-4 py-3 text-amber-300 font-mono text-xs">{line.credit > 0 ? line.credit.toFixed(3) : "—"}</td>
                      <td className="px-4 py-3 text-white/60 text-xs">{line.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-white/[0.03]">
                    <td className="px-4 py-3 text-white/60 text-xs font-medium">الإجمالي</td>
                    <td></td>
                    <td className="px-4 py-3 text-amber-300 font-mono text-xs font-medium">{viewEntry.total_debit.toFixed(3)}</td>
                    <td className="px-4 py-3 text-amber-300 font-mono text-xs font-medium">{viewEntry.total_credit.toFixed(3)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <GlassButton onClick={() => { setViewEntry(null); }} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">إغلاق</GlassButton>
              {viewEntry.status === "draft" && (
                <GlassButton onClick={() => { changeStatus(viewEntry, "post"); setViewEntry(null); }}>ترحيل القيد</GlassButton>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-md mx-4 text-center">
            <p className="text-white/90 text-lg mb-2">حذف القيد</p>
            <p className="text-white/60 mb-6">{`هل أنت متأكد من حذف القيد "${confirmDelete.entry_number}"؟`}</p>
            <div className="flex items-center justify-center gap-3">
              <GlassButton onClick={() => deleteEntry(confirmDelete)} disabled={actionLoading === confirmDelete.id} className="bg-red-500/20 hover:bg-red-500/30">تأكيد الحذف</GlassButton>
              <GlassButton onClick={() => setConfirmDelete(null)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">إلغاء</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
