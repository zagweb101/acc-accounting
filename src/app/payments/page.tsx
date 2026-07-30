"use client";

import { useEffect, useState, useCallback } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";

type Activity = { id: string; name: string; code: string };
type Payment = {
  id: string; activity_id: string; invoice_id: string | null;
  contact_id: string; contact_name: string; invoice_number: string | null;
  amount: number; payment_date: string; method: string;
  journal_entry_id: string | null; notes: string | null;
};
type Contact = { id: string; name: string; type: string };
type Invoice = { id: string; invoice_number: string; total_amount: number; paid_amount: number; status: string; contact_id: string };

export default function PaymentsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeActivity, setActiveActivity] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  const [showForm, setShowForm] = useState(false);
  const [formContact, setFormContact] = useState("");
  const [formInvoice, setFormInvoice] = useState("");
  const [formAmount, setFormAmount] = useState(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formMethod, setFormMethod] = useState("cash");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/activities").then(r => r.json()).then(d => {
      setActivities(d.activities);
      if (d.activities.length > 0) setActiveActivity(d.activities[0].id);
    }).catch(() => setError("Failed to load activities"));
  }, []);

  useEffect(() => {
    if (!activeActivity) return;
    fetch(`/api/contacts?activity_id=${activeActivity}`).then(r => r.json()).then(d => setContacts(d.contacts || [])).catch(() => {});
    fetch(`/api/invoices?activity_id=${activeActivity}&status=unpaid`).then(r => r.json()).then(d => setInvoices(d.invoices || [])).catch(() => {});
  }, [activeActivity]);

  useEffect(() => {
    if (!activeActivity) return;
    let cancelled = false;
    fetch(`/api/payments?activity_id=${activeActivity}`)
      .then(r => r.json()).then(d => { if (!cancelled) { setPayments(d.payments); setError(""); } })
      .catch(() => { if (!cancelled) setError("Failed to load payments"); });
    return () => { cancelled = true; };
  }, [activeActivity, refreshKey]);

  function openAdd() {
    setFormContact(""); setFormInvoice(""); setFormAmount(0);
    setFormDate(new Date().toISOString().split("T")[0]); setFormMethod("cash"); setFormNotes("");
    setShowForm(true);
  }

  async function savePayment() {
    if (!formContact || !formAmount || formAmount <= 0 || !formDate) { setError("Fill required fields"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: activeActivity, contact_id: formContact, invoice_id: formInvoice || null, amount: formAmount, payment_date: formDate, method: formMethod, notes: formNotes || null }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setShowForm(false); setError(""); refetch();
    } catch { setError("Failed to save payment"); }
    setSaving(false);
  }

  const filteredContacts = contacts.filter(c => c.type === "customer" || c.type === "both");

  return (
    <div className="flex flex-col px-8 py-16 gap-8" dir="rtl">
      <section className="w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">المدفوعات</h1>
          <p className="text-gray-600">تسجيل دفعات العملاء — مع قيد محاسبي تلقائي</p>
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="input-field max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <div className="flex-1" />
            <GlassButton onClick={openAdd}>+ دفعة جديدة</GlassButton>
          </div>

          {error && <div className="card mb-4 px-4 py-3 text-sm text-red-600 border-red-500/20">{error}</div>}

          {payments.length === 0 ? (
            <p className="text-gray-400 text-center py-12">لا توجد مدفوعات. سجل دفعة جديدة</p>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-gray-50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">التاريخ</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">العميل</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">الفاتورة</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">المبلغ</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">طريقة الدفع</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id} className={i < payments.length - 1 ? "border-b border-gray-200" : ""}>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">{p.payment_date}</td>
                      <td className="px-4 py-3 text-gray-900">{p.contact_name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.invoice_number || "—"}</td>
                      <td className="px-4 py-3 text-emerald-700 font-mono font-semibold text-xs">{p.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${p.method === "cash" ? "bg-blue-50 text-blue-700" : p.method === "bank" ? "bg-blue-50 text-blue-700" : "bg-cyan-500/15 text-cyan-300"}`}>
                          {p.method === "cash" ? "نقداً" : p.method === "bank" ? "تحويل بنكي" : "حوالة"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <GlassCard className="p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">تسديد دفعة جديدة</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">العميل</label>
                <select value={formContact} onChange={e => { setFormContact(e.target.value); setFormInvoice(""); }} className="input-field cursor-pointer">
                  <option value="">اختر عميلاً</option>
                  {filteredContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">الفاتورة (اختياري)</label>
                <select value={formInvoice} onChange={e => setFormInvoice(e.target.value)} className="input-field cursor-pointer">
                  <option value="">— دفعة عامة —</option>
                  {invoices.filter(i => i.contact_id === formContact).map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — المتبقي: {(inv.total_amount - inv.paid_amount).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">المبلغ</label>
                  <input type="number" step="0.01" min="0" value={formAmount || ""} onChange={e => setFormAmount(parseFloat(e.target.value) || 0)} className="input-field" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">التاريخ</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="input-field" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">طريقة الدفع</label>
                <select value={formMethod} onChange={e => setFormMethod(e.target.value)} className="input-field cursor-pointer">
                  <option value="cash">نقداً</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="transfer">حوالة</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">ملاحظات</label>
                <GlassInput value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="اختياري" />
              </div>
              <div className="text-xs text-gray-400">سيتم إنشاء قيد محاسبي تلقائي من حـ/ الصندوق (1100) إلى حـ/ الذمم المدينة (1200)</div>
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={savePayment} disabled={saving || !formContact || !formAmount || formAmount <= 0}>{saving ? "جاري التنفيذ..." : "تأكيد الدفع"}</GlassButton>
                <GlassButton onClick={() => setShowForm(false)} className="">إلغاء</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
