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
      <p className="text-white/40">{error || "جاري التحميل..."}</p>
    </div>
  );

  const typeLabel = contact.type === "customer" ? "عميل" : contact.type === "supplier" ? "مورد" : "عميل ومورد";
  const typeColor = contact.type === "customer" ? "bg-emerald-500/15 text-emerald-300" : contact.type === "supplier" ? "bg-amber-500/15 text-amber-300" : "bg-violet-500/15 text-violet-300";

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-8" dir="rtl">
      <section className="max-w-6xl w-full">
        <GlassCard className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white/90">{contact.name as string}</h1>
              <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>{typeLabel}</span>
            </div>
            <GlassButton onClick={() => setShowPayment(true)}>+ تسديد</GlassButton>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6">
            <div>
              <p className="text-white/40 text-xs">الرصيد المستحق</p>
              <p className="text-2xl font-mono font-semibold text-amber-300">{contact.outstanding as number > 0 ? `(${(contact.outstanding as number).toFixed(2)})` : (contact.outstanding as number).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">الحد الائتماني</p>
              <p className="text-2xl font-mono font-semibold text-white/80">{(contact.credit_limit as number).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">الرقم الضريبي</p>
              <p className="text-white/60 font-mono">{contact.tax_number || "—"}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">رقم الجوال</p>
              <p className="text-white/60">{contact.phone || "—"}</p>
            </div>
          </div>
        </GlassCard>
      </section>

      {error && <div className="max-w-6xl w-full glass px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

      <section className="max-w-6xl w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-1 bg-black/20 rounded-2xl p-1 mb-6 w-fit">
            {[
              { k: "statement", l: "كشف حساب" },
              { k: "invoices", l: "الفواتير" },
              { k: "payments", l: "المدفوعات" },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === t.k ? "bg-white/10 text-white/90 shadow-sm" : "text-white/40 hover:text-white/70"}`}>{t.l}</button>
            ))}
          </div>

          {tab === "statement" && (
            <div>
              {statement.length === 0 ? (
                <p className="text-white/40 text-center py-12">لا توجد حركات سابقة</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl bg-black/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.05]">
                        <th className="text-right px-4 py-3 text-white/60 font-medium">التاريخ</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">البيان</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">رقم القيد</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">مدين</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">دائن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.map((s, i) => (
                        <tr key={i} className={i < statement.length - 1 ? "border-b border-white/[0.06]" : ""}>
                          <td className="px-4 py-3 text-white/70 font-mono text-xs">{s.date}</td>
                          <td className="px-4 py-3 text-white/90">{s.description}{s.line_desc ? ` — ${s.line_desc}` : ""}</td>
                          <td className="px-4 py-3 text-white/50 font-mono text-xs">{s.entry_number}</td>
                          <td className="px-4 py-3 text-red-300 font-mono text-xs">{s.debit > 0 ? s.debit.toFixed(2) : "—"}</td>
                          <td className="px-4 py-3 text-emerald-300 font-mono text-xs">{s.credit > 0 ? s.credit.toFixed(2) : "—"}</td>
                        </tr>
                      ))}
                      <tr className="bg-white/[0.03]">
                        <td colSpan={3} className="px-4 py-3 text-white/80 font-medium">المجموع</td>
                        <td className="px-4 py-3 text-red-300 font-mono font-semibold">{accTotal.debit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-emerald-300 font-mono font-semibold">{accTotal.credit.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-white/[0.03] text-left border-t border-white/[0.06]">
                    <span className="text-white/60 text-sm">الرصيد: </span>
                    <span className={`font-mono font-semibold ${balance >= 0 ? "text-emerald-300" : "text-red-300"}`}>{balance.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "invoices" && (
            <div>
              {invoices.length === 0 ? (
                <p className="text-white/40 text-center py-12">لا توجد فواتير لهذه الجهة</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl bg-black/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.05]">
                        <th className="text-right px-4 py-3 text-white/60 font-medium">الرقم</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">النوع</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">التاريخ</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">استحقاق</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">الإجمالي</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">المدفوع</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv, i) => (
                        <tr key={inv.id as string} className={i < invoices.length - 1 ? "border-b border-white/[0.06]" : ""}>
                          <td className="px-4 py-3 text-white/90 font-mono text-xs">{inv.invoice_number as string}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${inv.type === "sales" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                              {inv.type === "sales" ? "مبيعات" : "مشتريات"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/60 font-mono text-xs">{inv.invoice_date as string}</td>
                          <td className="px-4 py-3 text-white/60 font-mono text-xs">{inv.due_date as string}</td>
                          <td className="px-4 py-3 text-white/80 font-mono text-xs">{(inv.total_amount as number).toFixed(2)}</td>
                          <td className="px-4 py-3 text-white/60 font-mono text-xs">{(inv.paid_amount as number).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${inv.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : inv.status === "unpaid" ? "bg-amber-500/15 text-amber-300" : "bg-white/10 text-white/60"}`}>
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
                <p className="text-white/40 text-center py-12">لا توجد مدفوعات مسجلة</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl bg-black/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.05]">
                        <th className="text-right px-4 py-3 text-white/60 font-medium">التاريخ</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">الفاتورة</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">المبلغ</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">طريقة الدفع</th>
                        <th className="text-right px-4 py-3 text-white/60 font-medium">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, i) => (
                        <tr key={p.id as string} className={i < payments.length - 1 ? "border-b border-white/[0.06]" : ""}>
                          <td className="px-4 py-3 text-white/70 font-mono text-xs">{p.payment_date as string}</td>
                          <td className="px-4 py-3 text-white/90 font-mono text-xs">{p.invoice_number as string || "—"}</td>
                          <td className="px-4 py-3 text-emerald-300 font-mono font-semibold text-xs">{(p.amount as number).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${p.method === "cash" ? "bg-blue-500/15 text-blue-300" : p.method === "bank" ? "bg-violet-500/15 text-violet-300" : "bg-cyan-500/15 text-cyan-300"}`}>
                              {p.method === "cash" ? "نقداً" : p.method === "bank" ? "تحويل بنكي" : "حوالة"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs">{p.notes as string || "—"}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-white/90 mb-6">تسديد دفعة</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-sm">الفاتورة (اختياري للدفعات العامة)</label>
                <select value={payInvoice} onChange={e => setPayInvoice(e.target.value)} className="glass-input cursor-pointer">
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
                  <label className="text-white/60 text-sm">المبلغ</label>
                  <input type="number" step="0.01" min="0" value={payAmount || ""} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)} className="glass-input" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-white/60 text-sm">التاريخ</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="glass-input" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-sm">طريقة الدفع</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="glass-input cursor-pointer">
                  <option value="cash">نقداً</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="transfer">حوالة</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-sm">ملاحظات</label>
                <GlassInput value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="اختياري" />
              </div>
              <div className="text-xs text-white/40">سيتم إنشاء قيد محاسبي تلقائي من حـ/ الصندوق إلى حـ/ العميل</div>
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={handlePayment} disabled={paying || !payAmount || payAmount <= 0}>{paying ? "جاري التنفيذ..." : "تأكيد الدفع"}</GlassButton>
                <GlassButton onClick={() => setShowPayment(false)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">إلغاء</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
