"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";

type ContactDetail = {
  id: string; activity_id: string; type: string; name: string;
  tax_number: string | null; phone: string | null; balance: number;
  credit_limit: number; outstanding: number;
};
type InvRow = { id: string; invoice_number: string; type: string; invoice_date: string; due_date: string; total_amount: number; paid_amount: number; status: string; contact_id: string };
type PayRow = { id: string; payment_date: string; invoice_number: string | null; amount: number; method: string; notes: string | null };
type StatementRow = { date: string; description: string; entry_number: string; debit: number; credit: number; line_desc: string | null };

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [invoices, setInvoices] = useState<InvRow[]>([]);
  const [payments, setPayments] = useState<PayRow[]>([]);
  const [statement, setStatement] = useState<StatementRow[]>([]);
  const [tab, setTab] = useState("statement");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  const [showPayment, setShowPayment] = useState(false);
  const [payInvoice, setPayInvoice] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts/${id}`).then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); return; }
      setContact(d.contact); setInvoices(d.invoices); setPayments(d.payments);
      setStatement(d.statement); setError("");
    }).catch(() => setError("Failed to load contact"));
  }, [id, refreshKey]);

  async function handlePayment() {
    if (!payAmount || payAmount <= 0 || !payDate) { setError("Fill required fields"); return; }
    setPaying(true);
    try {
      const r = await fetch("/api/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: contact?.activity_id, invoice_id: payInvoice || null, contact_id: id, amount: payAmount, payment_date: payDate, method: payMethod, notes: payNotes || null }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setShowPayment(false); setPayInvoice(""); setPayAmount(0); setPayDate(new Date().toISOString().split("T")[0]); setPayMethod("cash"); setPayNotes(""); setError(""); refetch();
    } catch { setError("Failed to process payment"); }
    setPaying(false);
  }

  const accTotal = statement.reduce((acc, s) => ({ debit: acc.debit + (s.debit || 0), credit: acc.credit + (s.credit || 0) }), { debit: 0, credit: 0 });
  const balance = accTotal.debit - accTotal.credit;

  if (!contact) return (
    <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
      <p className="text-gray-400">{error || "جاري التحميل..."}</p>
    </div>
  );

  const typeLabel = contact.type === "customer" ? "عميل" : contact.type === "supplier" ? "مورد" : "عميل ومورد";
  const typeColor = contact.type === "customer" ? "bg-emerald-50 text-emerald-700" : contact.type === "supplier" ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700";

  return (
    <div className="flex flex-col px-8 py-16 gap-8" dir="rtl">
      <section className="w-full">
        <GlassCard className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{contact.name as string}</h1>
              <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>{typeLabel}</span>
            </div>
            <GlassButton onClick={() => setShowPayment(true)}>+ تسديد</GlassButton>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6">
            <div>
              <p className="text-gray-400 text-xs">الرصيد المستحق</p>
              <p className="text-2xl font-mono font-semibold text-amber-700">{contact.outstanding as number > 0 ? `(${(contact.outstanding as number).toFixed(2)})` : (contact.outstanding as number).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">الحد الائتماني</p>
              <p className="text-2xl font-mono font-semibold text-gray-800">{(contact.credit_limit as number).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">الرقم الضريبي</p>
              <p className="text-gray-600 font-mono">{contact.tax_number || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">رقم الجوال</p>
              <p className="text-gray-600">{contact.phone || "—"}</p>
            </div>
          </div>
        </GlassCard>
      </section>

      {error && <div className="w-full card px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

      <section className="w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-1 bg-black/20 rounded-2xl p-1 mb-6 w-fit">
            {[
              { k: "statement", l: "كشف حساب" },
              { k: "invoices", l: "الفواتير" },
              { k: "payments", l: "المدفوعات" },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === t.k ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>{t.l}</button>
            ))}
          </div>

          {tab === "statement" && (
            <div>
              {statement.length === 0 ? (
                <p className="text-gray-400 text-center py-12">لا توجد حركات سابقة</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl bg-black/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">التاريخ</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">البيان</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">رقم القيد</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">مدين</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">دائن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.map((s, i) => (
                        <tr key={i} className={i < statement.length - 1 ? "border-b border-gray-200" : ""}>
                          <td className="px-4 py-3 text-gray-700 font-mono text-xs">{s.date}</td>
                          <td className="px-4 py-3 text-gray-900">{s.description}{s.line_desc ? ` — ${s.line_desc}` : ""}</td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.entry_number}</td>
                          <td className="px-4 py-3 text-red-300 font-mono text-xs">{s.debit > 0 ? s.debit.toFixed(2) : "—"}</td>
                          <td className="px-4 py-3 text-emerald-700 font-mono text-xs">{s.credit > 0 ? s.credit.toFixed(2) : "—"}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-4 py-3 text-gray-800 font-medium">المجموع</td>
                        <td className="px-4 py-3 text-red-300 font-mono font-semibold">{accTotal.debit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-emerald-700 font-mono font-semibold">{accTotal.credit.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-gray-50 text-left border-t border-gray-200">
                    <span className="text-gray-600 text-sm">الرصيد: </span>
                    <span className={`font-mono font-semibold ${balance >= 0 ? "text-emerald-700" : "text-red-300"}`}>{balance.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "invoices" && (
            <div>
              {invoices.length === 0 ? (
                <p className="text-gray-400 text-center py-12">لا توجد فواتير لهذه الجهة</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl bg-black/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">الرقم</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">النوع</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">التاريخ</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">استحقاق</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">الإجمالي</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">المدفوع</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv, i) => (
                        <tr key={inv.id as string} className={i < invoices.length - 1 ? "border-b border-gray-200" : ""}>
                          <td className="px-4 py-3 text-gray-900 font-mono text-xs">{inv.invoice_number as string}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${inv.type === "sales" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {inv.type === "sales" ? "مبيعات" : "مشتريات"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{inv.invoice_date as string}</td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{inv.due_date as string}</td>
                          <td className="px-4 py-3 text-gray-800 font-mono text-xs">{(inv.total_amount as number).toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{(inv.paid_amount as number).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${inv.status === "paid" ? "bg-emerald-50 text-emerald-700" : inv.status === "unpaid" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                              {inv.status === "paid" ? "مدفوعة" : inv.status === "unpaid" ? "غير مدفوعة" : "مسودة"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "payments" && (
            <div>
              {payments.length === 0 ? (
                <p className="text-gray-400 text-center py-12">لا توجد مدفوعات مسجلة</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl bg-black/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">التاريخ</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">الفاتورة</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">المبلغ</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">طريقة الدفع</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-medium">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, i) => (
                        <tr key={p.id as string} className={i < payments.length - 1 ? "border-b border-gray-200" : ""}>
                          <td className="px-4 py-3 text-gray-700 font-mono text-xs">{p.payment_date as string}</td>
                          <td className="px-4 py-3 text-gray-900 font-mono text-xs">{p.invoice_number as string || "—"}</td>
                          <td className="px-4 py-3 text-emerald-700 font-mono font-semibold text-xs">{(p.amount as number).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${p.method === "cash" ? "bg-blue-50 text-blue-700" : p.method === "bank" ? "bg-violet-50 text-violet-700" : "bg-cyan-500/15 text-cyan-300"}`}>
                              {p.method === "cash" ? "نقداً" : p.method === "bank" ? "تحويل بنكي" : "حوالة"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{p.notes as string || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </section>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <GlassCard className="p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">تسديد دفعة</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">الفاتورة (اختياري للدفعات العامة)</label>
                <select value={payInvoice} onChange={e => setPayInvoice(e.target.value)} className="input-field cursor-pointer">
                  <option value="">— دفعة عامة بدون فاتورة —</option>
                  {invoices.filter(i => i.status as string !== "paid").map(inv => (
                    <option key={inv.id as string} value={inv.id as string}>
                      {inv.invoice_number as string} — المتبقي: {((inv.total_amount as number) - (inv.paid_amount as number)).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">المبلغ</label>
                  <input type="number" step="0.01" min="0" value={payAmount || ""} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)} className="input-field" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">التاريخ</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="input-field" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">طريقة الدفع</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="input-field cursor-pointer">
                  <option value="cash">نقداً</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="transfer">حوالة</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">ملاحظات</label>
                <GlassInput value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="اختياري" />
              </div>
              <div className="text-xs text-gray-400">سيتم إنشاء قيد محاسبي تلقائي من حـ/ الصندوق إلى حـ/ العميل</div>
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={handlePayment} disabled={paying || !payAmount || payAmount <= 0}>{paying ? "جاري التنفيذ..." : "تأكيد الدفع"}</GlassButton>
                <GlassButton onClick={() => setShowPayment(false)} className="">إلغاء</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
