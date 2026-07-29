"use client";

import { useEffect, useState, useCallback } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";

type Activity = { id: string; name: string; code: string };
type Contact = { id: string; name: string; type: string };
type AgingRow = {
  id: string; invoice_number: string; contact_name: string; contact_id: string;
  due_date: string; total_amount: number; paid_amount: number;
  outstanding: number; days_overdue: number; bucket: string; invoice_date: string;
};
type BucketSummary = { bucket: string; count: number; total: number };

const bucketColors: Record<string, string> = {
  "0-30": "bg-white/10",
  "31-60": "bg-amber-50 border-amber-200 text-amber-700",
  "61-90": "bg-orange-500/15 border-orange-500/20 text-orange-300",
  "90+": "bg-red-50 border-red-200 text-red-600",
};

export default function AgingPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeActivity, setActiveActivity] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [aging, setAging] = useState<AgingRow[]>([]);
  const [buckets, setBuckets] = useState<BucketSummary[]>([]);
  const [tab, setTab] = useState<"sales" | "purchase">("sales");
  const [filterContact, setFilterContact] = useState("");
  const [filterBucket, setFilterBucket] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/activities").then(r => r.json()).then(d => {
      setActivities(d.activities);
      if (d.activities.length > 0) setActiveActivity(d.activities[0].id);
    }).catch(() => setError("Failed to load activities"));
  }, []);

  useEffect(() => {
    if (!activeActivity) return;
    fetch(`/api/contacts?activity_id=${activeActivity}`).then(r => r.json()).then(d => setContacts(d.contacts || [])).catch(() => {});
  }, [activeActivity]);

  useEffect(() => {
    if (!activeActivity) return;
    let cancelled = false;
    const params = new URLSearchParams({ type: tab, activity_id: activeActivity });
    if (filterContact) params.set("contact_id", filterContact);
    if (filterBucket) params.set("bucket", filterBucket);

    fetch(`/api/aging?${params}`)
      .then(r => r.json()).then(d => { if (!cancelled) { setAging(d.aging); setBuckets(d.buckets); setError(""); } })
      .catch(() => { if (!cancelled) setError("Failed to load aging"); });
    return () => { cancelled = true; };
  }, [activeActivity, tab, filterContact, filterBucket]);

  const grandTotal = buckets.reduce((s, b) => s + b.total, 0);
  const label = tab === "sales" ? "ذمم عملاء (AR)" : "ذمم موردين (AP)";

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-8" dir="rtl">
      <section className="w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">تقرير أعمار الديون</h1>
          <p className="text-gray-600">تحليل الذمم المدينة والدائنة حسب فترات الاستحقاق</p>
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="input-field max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <div className="flex items-center gap-1 bg-black/20 rounded-2xl p-1">
              <button onClick={() => { setTab("sales"); setFilterBucket(""); }} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === "sales" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>ذمم عملاء (AR)</button>
              <button onClick={() => { setTab("purchase"); setFilterBucket(""); }} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === "purchase" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>ذمم موردين (AP)</button>
            </div>
            <select value={filterContact} onChange={e => setFilterContact(e.target.value)} className="input-field max-w-[200px] cursor-pointer">
              <option value="">كل العملاء</option>
              {contacts.filter(c => tab === "sales" ? ["customer", "both"].includes(c.type) : ["supplier", "both"].includes(c.type)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={filterBucket} onChange={e => setFilterBucket(e.target.value)} className="input-field max-w-[150px] cursor-pointer">
              <option value="">كل البوكيتات</option>
              <option value="0-30">0-30 يوم</option>
              <option value="31-60">31-60 يوم</option>
              <option value="61-90">61-90 يوم</option>
              <option value="90+">90+ يوم</option>
            </select>
          </div>

          {error && <div className="card mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {["0-30", "31-60", "61-90", "90+"].map(b => {
              const bs = buckets.find(bk => bk.bucket === b);
              return (
                <div key={b} className={`card rounded-2xl p-4 border ${bucketColors[b] || "border-white/10"}`}>
                  <p className="text-xs text-gray-500">{b === "90+" ? `${b} يوم` : `${b} يوم`}</p>
                  <p className={`text-2xl font-mono font-semibold mt-1 ${b === "0-30" ? "text-gray-800" : b === "31-60" ? "text-amber-700" : b === "61-90" ? "text-orange-300" : "text-red-300"}`}>
                    {bs ? bs.total.toFixed(2) : "0.00"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{bs ? `${bs.count} فاتورة` : "0 فواتير"}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-4 px-2">
            <p className="text-gray-700 text-sm font-medium">{label}</p>
            <p className="text-gray-800 font-mono font-semibold">الإجمالي: {grandTotal.toFixed(2)}</p>
          </div>

          {aging.length === 0 ? (
            <p className="text-gray-400 text-center py-12">لا توجد فواتير مستحقة</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">العميل</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">رقم الفاتورة</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">تاريخ الفاتورة</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">تاريخ الاستحقاق</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">متأخر (يوم)</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">المبلغ</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">المدفوع</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">المتبقي</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">البوكيت</th>
                  </tr>
                </thead>
                <tbody>
                  {aging.map((row, i) => (
                    <tr key={row.id} className={`${i < aging.length - 1 ? "border-b border-gray-200" : ""} ${bucketColors[row.bucket] || ""}`}>
                      <td className="px-4 py-3 text-gray-900">
                        <a href={`/contacts/${row.contact_id}`} className="text-gray-900 hover:text-white underline underline-offset-2 decoration-white/20">{row.contact_name}</a>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.invoice_number}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.invoice_date}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.due_date}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" dir="ltr">
                        <span className={`${row.days_overdue > 90 ? "text-red-300" : row.days_overdue > 60 ? "text-orange-300" : row.days_overdue > 30 ? "text-amber-700" : "text-gray-700"}`}>
                          {row.days_overdue}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-800">{row.total_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.paid_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-amber-700">{row.outstanding.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${row.bucket === "0-30" ? "bg-white/10 text-gray-700" : row.bucket === "31-60" ? "bg-amber-50 text-amber-700" : row.bucket === "61-90" ? "bg-orange-500/20 text-orange-300" : "bg-red-50 text-red-600"}`}>
                          {row.bucket}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </section>
    </div>
  );
}
