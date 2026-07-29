"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";

type Activity = { id: string; name: string; code: string; type: string; vat_number: string | null };
type Contact = { id: string; name: string; type: string; tax_number: string | null };
type CostCenter = { id: string; name: string; code: string };
type Item = { id: string; name: string; sku: string | null; sale_price: number; cost_price: number; type: string; vat_rate: number };

type FiscalYear = { id: string; activity_id: string; name: string; start_date: string; end_date: string };

type InvLine = {
  _key: number; item_id: string; item_name: string; description: string;
  quantity: number; unit_price: number; discount: number; vat_rate: number;
};

type Invoice = {
  id: string; invoice_number: string; type: string; activity_id: string;
  contact_id: string; contact_name: string; cost_center_id: string | null;
  invoice_date: string; due_date: string; subtotal: number;
  discount_total: number; vat_amount: number; total_amount: number;
  paid_amount: number; status: string; zatca_uuid: string | null;
  zatca_qr: string | null; notes: string | null; journal_entry_id: string | null;
  lines?: InvLineRow[];
};

type InvLineRow = { id: string; item_id: string | null; item_name: string | null; description: string | null; quantity: number; unit_price: number; discount: number; vat_rate: number; total: number };

let keyCounter = 0;
function newLine(): InvLine { return { _key: ++keyCounter, item_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, discount: 0, vat_rate: 15 }; }

function calcLine(line: InvLine) {
  const lineTotal = line.quantity * line.unit_price;
  const discount = line.discount || 0;
  const taxable = lineTotal - discount;
  const vat = Math.round(taxable * line.vat_rate) / 100;
  return { lineTotal, discount, taxable, vat, total: taxable + vat };
}

export default function InvoicesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeActivity, setActiveActivity] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);

  const [tab, setTab] = useState<"sales" | "purchase">("sales");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [formContact, setFormContact] = useState("");
  const [formCC, setFormCC] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDue, setFormDue] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formLines, setFormLines] = useState<InvLine[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [posting, setPosting] = useState(false);
  const [postedResult, setPostedResult] = useState<{ zatca_qr_image: string; zatca_uuid: string; journal_entry_id: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);

  useEffect(() => {
    fetch("/api/activities").then(r => r.json()).then(d => {
      setActivities(d.activities);
      if (d.activities.length > 0) setActiveActivity(d.activities[0].id);
    }).catch(() => setError("Failed to load activities"));
  }, []);

  useEffect(() => {
    if (!activeActivity) return;
    fetch(`/api/contacts?activity_id=${activeActivity}`).then(r => r.json()).then(d => setContacts(d.contacts || [])).catch(() => {});
    fetch(`/api/cost-centers?activity_id=${activeActivity}`).then(r => r.json()).then(d => setCostCenters(d.centers || [])).catch(() => {});
    fetch(`/api/items?activity_id=${activeActivity}`).then(r => r.json()).then(d => setItems(d.items || [])).catch(() => {});
    fetch(`/api/fiscal-years?activity_id=${activeActivity}`).then(r => r.json()).then(d => setFiscalYears(d.fiscal_years || [])).catch(() => {});
  }, [activeActivity]);

  useEffect(() => {
    if (!activeActivity) return;
    let cancelled = false;
    const params = new URLSearchParams({ type: tab, activity_id: activeActivity });
    if (filterStatus) params.set("status", filterStatus);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);

    fetch(`/api/invoices?${params}`)
      .then(r => r.json()).then(d => { if (!cancelled) { setInvoices(d.invoices); setError(""); } })
      .catch(() => { if (!cancelled) setError("Failed to load invoices"); });
    return () => { cancelled = true; };
  }, [activeActivity, tab, refreshKey, filterStatus, filterFrom, filterTo]);

  const contactFiltered = contacts.filter(c => tab === "sales" ? (c.type === "customer" || c.type === "both") : (c.type === "supplier" || c.type === "both"));
  const itemFiltered = items;

  function openAdd() {
    setEditTarget(null);
    setFormContact(""); setFormCC(""); setFormDate(new Date().toISOString().split("T")[0]);
    setFormDue(""); setFormNotes(""); setFormLines([newLine()]);
    setShowForm(true);
  }

  function openEdit(inv: Invoice) {
    setEditTarget(inv);
    setFormContact(inv.contact_id); setFormCC(inv.cost_center_id || "");
    setFormDate(inv.invoice_date); setFormDue(inv.due_date); setFormNotes(inv.notes || "");
    if (inv.lines && inv.lines.length > 0) {
      setFormLines(inv.lines.map(l => ({ _key: ++keyCounter, item_id: l.item_id || "", item_name: l.item_name || "", description: l.description || "", quantity: l.quantity, unit_price: l.unit_price, discount: l.discount, vat_rate: l.vat_rate })));
    } else { setFormLines([newLine()]); }
    setShowForm(true);
  }

  function openView(inv: Invoice) {
    fetch(`/api/invoices/${inv.id}`).then(r => r.json()).then(d => setViewInvoice(d.invoice)).catch(() => setError("Failed to load invoice"));
  }

  function updateLine(key: number, field: keyof InvLine, value: unknown) {
    setFormLines(prev => prev.map(l => l._key === key ? { ...l, [field]: value } : l));
  }

  function updateLineItem(key: number, itemId: string) {
    const item = items.find(i => i.id === itemId);
    setFormLines(prev => prev.map(l => l._key === key ? {
      ...l, item_id: itemId, item_name: item ? item.name : "",
      unit_price: item ? item.sale_price : 0, vat_rate: item ? item.vat_rate : 15,
    } : l));
  }

  const totals = formLines.reduce((acc, l) => {
    const c = calcLine(l);
    return { sub: acc.sub + c.taxable, disc: acc.disc + c.discount, vat: acc.vat + c.vat, total: acc.total + c.total };
  }, { sub: 0, disc: 0, vat: 0, total: 0 });

  async function saveInvoice() {
    if (!formContact || !formDate || !formDue) { setError("Fill required fields"); return; }
    if (formLines.some(l => !l.unit_price || l.quantity <= 0)) { setError("Each line needs qty and price"); return; }
    setSaving(true);
    const url = editTarget ? `/api/invoices/${editTarget.id}` : "/api/invoices";
    const method = editTarget ? "PUT" : "POST";
    try {
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab, activity_id: activeActivity, contact_id: formContact,
          cost_center_id: formCC || null, invoice_date: formDate, due_date: formDue,
          notes: formNotes || null,
          lines: formLines.map(l => ({ item_id: l.item_id || null, description: l.description || null, quantity: l.quantity, unit_price: l.unit_price, discount: l.discount, vat_rate: l.vat_rate })),
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setShowForm(false); setEditTarget(null); setError(""); refetch();
    } catch { setError("Failed to save invoice"); }
    setSaving(false);
  }

  async function postInvoice(invId: string) {
    setPosting(true);
    try {
      const r = await fetch(`/api/invoices/${invId}/post`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post" }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setPostedResult({ zatca_qr_image: d.zatca_qr_image, zatca_uuid: d.zatca_uuid, journal_entry_id: d.journal_entry_id });
      setError(""); refetch();
      setViewInvoice(null);
    } catch { setError("Failed to post invoice"); }
    setPosting(false);
  }

  async function deleteInvoice(inv: Invoice) {
    try {
      const r = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setDeleteConfirm(null); setError(""); refetch();
    } catch { setError("Failed to delete"); }
  }

  function printInvoice() {
    if (!printRef.current) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html dir="rtl"><head><title>ÙØ§ØªÙˆØ±Ø©</title><style>
      body { font-family: 'Segoe UI', sans-serif; padding: 40px; direction: rtl; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #ccc; padding: 10px; text-align: right; }
      th { background: #f5f5f5; }
      .header { display: flex; justify-content: space-between; align-items: start; }
      .qr { margin-top: 20px; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-8" dir="rtl">
      <section className="max-w-6xl w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Ø§Ù„ÙÙˆØ§ØªÙŠØ±</h1>
          <p className="text-gray-600">Ø¥Ø¯Ø§Ø±Ø© ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª ÙˆØ§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª Ù…Ø¹ Ø§Ù„ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠ Ùˆ QR</p>
        </GlassCard>
      </section>

      <section className="max-w-6xl w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="input-field max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <div className="flex items-center gap-1 bg-black/20 rounded-2xl p-1">
              <button onClick={() => setTab("sales")} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === "sales" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>Ù…Ø¨ÙŠØ¹Ø§Øª</button>
              <button onClick={() => setTab("purchase")} className={`px-5 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === "purchase" ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>Ù…Ø´ØªØ±ÙŠØ§Øª</button>
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field max-w-[140px] cursor-pointer">
              <option value="">ÙƒÙ„ Ø§Ù„Ø­Ø§Ù„Ø§Øª</option>
              <option value="draft">Ù…Ø³ÙˆØ¯Ø©</option>
              <option value="unpaid">ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹Ø©</option>
              <option value="paid">Ù…Ø¯ÙÙˆØ¹Ø©</option>
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input-field max-w-[170px]" />
            <span className="text-gray-300">â€“</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input-field max-w-[170px]" />
            <GlassButton onClick={openAdd}>+ {tab === "sales" ? "ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª" : "ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª"}</GlassButton>
          </div>

          {error && <div className="card mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          {invoices.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Ù„Ø§ ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ±</p>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 backdrop-blur-xl">
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø±Ù‚Ù…</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø¹Ù…ÙŠÙ„ / Ø§Ù„Ù…ÙˆØ±Ø¯</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ø³ØªØ­Ù‚Ø§Ù‚</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ØµØ§ÙÙŠ</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø¶Ø±ÙŠØ¨Ø©</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv.id} className={i < invoices.length - 1 ? "border-b border-gray-200" : ""}>
                      <td className="px-4 py-3 text-gray-900 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-700">{inv.contact_name}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{inv.invoice_date}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{inv.due_date}</td>
                      <td className="px-4 py-3 text-gray-800 font-mono text-xs">{inv.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-amber-700 font-mono text-xs">{inv.vat_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-emerald-700 font-mono text-xs font-medium">{inv.total_amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          inv.status === "draft" ? "text-amber-700 bg-amber-500/15 border-amber-500/20" :
                          inv.status === "paid" ? "text-emerald-700 bg-emerald-500/15 border-emerald-500/20" :
                          "text-blue-700 bg-blue-500/15 border-blue-500/20"
                        }`}>
                          {inv.status === "draft" ? "Ù…Ø³ÙˆØ¯Ø©" : inv.status === "paid" ? "Ù…Ø¯ÙÙˆØ¹Ø©" : "ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹Ø©"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openView(inv)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all text-xs" title="Ø¹Ø±Ø¶">ðŸ‘</button>
                          {inv.status === "draft" && (
                            <>
                              <button onClick={() => { setPostedResult(null); postInvoice(inv.id); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-700 transition-all text-xs" title="ØªØ±Ø­ÙŠÙ„">âœ“</button>
                              <button onClick={() => openEdit(inv)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all text-xs" title="ØªØ¹Ø¯ÙŠÙ„">âš™</button>
                              <button onClick={() => setDeleteConfirm(inv)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-red-500/20 text-gray-600 hover:text-red-300 transition-all text-xs" title="Ø­Ø°Ù">âœ•</button>
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
          <GlassCard className="p-8 w-full max-w-5xl mx-4 my-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editTarget ? `ØªØ¹Ø¯ÙŠÙ„ ${editTarget.invoice_number}` : `ÙØ§ØªÙˆØ±Ø© ${tab === "sales" ? "Ù…Ø¨ÙŠØ¹Ø§Øª" : "Ù…Ø´ØªØ±ÙŠØ§Øª"} Ø¬Ø¯ÙŠØ¯Ø©`}
            </h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">* {tab === "sales" ? "Ø§Ù„Ø¹Ù…ÙŠÙ„" : "Ø§Ù„Ù…ÙˆØ±Ø¯"}</label>
                  <select value={formContact} onChange={e => setFormContact(e.target.value)} className="input-field cursor-pointer">
                    <option value="">-- Ø§Ø®ØªØ± --</option>
                    {contactFiltered.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">* ØªØ§Ø±ÙŠØ® Ø§Ù„ÙØ§ØªÙˆØ±Ø©</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="input-field" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">* ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚</label>
                  <input type="date" value={formDue} onChange={e => setFormDue(e.target.value)} className="input-field" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">Ù…Ø±ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ©</label>
                  <select value={formCC} onChange={e => setFormCC(e.target.value)} className="input-field cursor-pointer">
                    <option value="">â€”</option>
                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label>
                <GlassInput value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="..." />
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-800 text-sm font-medium">Ø¨Ù†ÙˆØ¯ Ø§Ù„ÙØ§ØªÙˆØ±Ø©</h3>
                  <GlassButton onClick={() => setFormLines(p => [...p, newLine()])} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10 text-xs !px-3 !py-1">+ Ø¨Ù†Ø¯</GlassButton>
                </div>
                <div className="overflow-x-auto rounded-2xl bg-black/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 backdrop-blur-xl">
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø§Ù„ØµÙ†Ù</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø§Ù„ÙˆØµÙ</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø§Ù„ÙƒÙ…ÙŠØ©</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø§Ù„Ø®ØµÙ…</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø¶Ø±ÙŠØ¨Ø© %</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium text-xs">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formLines.map(line => {
                        const c = calcLine(line);
                        return (
                          <tr key={line._key} className="border-b border-gray-200">
                            <td className="px-3 py-1.5">
                              <select value={line.item_id} onChange={e => updateLineItem(line._key, e.target.value)} className="input-field text-xs cursor-pointer max-w-[180px]">
                                <option value="">--</option>
                                {itemFiltered.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <GlassInput value={line.description} onChange={e => updateLine(line._key, "description", e.target.value)} className="text-xs min-w-[100px]" placeholder="..." />
                            </td>
                            <td className="px-3 py-1.5">
                              <input type="number" step="1" min="0" value={line.quantity || ""} onChange={e => updateLine(line._key, "quantity", parseFloat(e.target.value) || 0)} className="input-field text-xs w-[70px]" />
                            </td>
                            <td className="px-3 py-1.5">
                              <input type="number" step="0.01" min="0" value={line.unit_price || ""} onChange={e => updateLine(line._key, "unit_price", parseFloat(e.target.value) || 0)} className="input-field text-xs w-[100px]" />
                            </td>
                            <td className="px-3 py-1.5">
                              <input type="number" step="0.01" min="0" value={line.discount || ""} onChange={e => updateLine(line._key, "discount", parseFloat(e.target.value) || 0)} className="input-field text-xs w-[90px]" />
                            </td>
                            <td className="px-3 py-1.5">
                              <input type="number" step="1" min="0" max="100" value={line.vat_rate} onChange={e => updateLine(line._key, "vat_rate", parseFloat(e.target.value) || 0)} className="input-field text-xs w-[70px]" />
                            </td>
                            <td className="px-3 py-1.5 text-gray-800 font-mono text-xs">{c.total.toFixed(2)}</td>
                            <td className="px-3 py-1.5">
                              {formLines.length > 1 && (
                                <button onClick={() => setFormLines(p => p.filter(l => l._key !== line._key))} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-50 hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-all text-xs">âœ•</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="px-3 py-2 text-gray-600 text-xs font-medium">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
                        <td className="px-3 py-2 text-gray-400 font-mono text-xs">{totals.disc > 0 ? totals.disc.toFixed(2) : "â€”"}</td>
                        <td className="px-3 py-2 text-amber-700 font-mono text-xs">{totals.vat.toFixed(2)}</td>
                        <td className="px-3 py-2 text-emerald-700 font-mono text-xs font-medium">{totals.total.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="flex items-center justify-end gap-6 mt-3 text-sm">
                  <div><span className="text-gray-400">Ø§Ù„ØµØ§ÙÙŠ: </span><span className="text-gray-800 font-mono">{totals.sub.toFixed(2)}</span></div>
                  <div><span className="text-gray-400">Ø§Ù„Ø¶Ø±ÙŠØ¨Ø©: </span><span className="text-amber-700 font-mono">{totals.vat.toFixed(2)}</span></div>
                  <div><span className="text-gray-600 font-medium">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: </span><span className="text-emerald-700 font-mono font-semibold text-lg">{totals.total.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <GlassButton onClick={saveInvoice} disabled={saving || !formContact || !formDate || !formDue || formLines.some(l => l.quantity <= 0)}>
                  {saving ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : editTarget ? "Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª" : "Ø­ÙØ¸ Ù…Ø³ÙˆØ¯Ø©"}
                </GlassButton>
                <GlassButton onClick={() => { setShowForm(false); setEditTarget(null); }} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {viewInvoice && !postedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
          <GlassCard className="p-8 w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">ÙØ§ØªÙˆØ±Ø©: {viewInvoice.invoice_number}</h2>
              <button onClick={() => setViewInvoice(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all">âœ•</button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div><span className="text-gray-400">{tab === "sales" ? "Ø§Ù„Ø¹Ù…ÙŠÙ„" : "Ø§Ù„Ù…ÙˆØ±Ø¯"}:</span> <span className="text-gray-800">{viewInvoice.contact_name}</span></div>
              <div><span className="text-gray-400">Ø§Ù„ØªØ§Ø±ÙŠØ®:</span> <span className="text-gray-800">{viewInvoice.invoice_date}</span></div>
              <div><span className="text-gray-400">Ø§Ø³ØªØ­Ù‚Ø§Ù‚:</span> <span className="text-gray-800">{viewInvoice.due_date}</span></div>
              <div><span className="text-gray-400">Ø§Ù„Ø­Ø§Ù„Ø©:</span> <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                viewInvoice.status === "draft" ? "text-amber-700 bg-amber-500/15 border-amber-500/20" :
                viewInvoice.status === "paid" ? "text-emerald-700 bg-emerald-500/15 border-emerald-500/20" : "text-blue-700 bg-blue-500/15 border-blue-500/20"
              }`}>{viewInvoice.status === "draft" ? "Ù…Ø³ÙˆØ¯Ø©" : viewInvoice.status === "paid" ? "Ù…Ø¯ÙÙˆØ¹Ø©" : "ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹Ø©"}</span></div>
              {viewInvoice.zatca_uuid && <div className="col-span-2"><span className="text-gray-400">ZATCA UUID:</span> <span className="text-gray-500 text-xs font-mono">{viewInvoice.zatca_uuid}</span></div>}
              {viewInvoice.notes && <div className="col-span-3"><span className="text-gray-400">Ù…Ù„Ø§Ø­Ø¸Ø§Øª:</span> <span className="text-gray-700">{viewInvoice.notes}</span></div>}
            </div>
            <div className="overflow-hidden rounded-2xl bg-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 backdrop-blur-xl">
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ØµÙ†Ù</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ÙƒÙ…ÙŠØ©</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø®ØµÙ…</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø¶Ø±ÙŠØ¨Ø©</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewInvoice.lines || []).map((line, i) => (
                    <tr key={line.id || i} className={i < (viewInvoice.lines?.length || 0) - 1 ? "border-b border-gray-200" : ""}>
                      <td className="px-4 py-3 text-gray-800">{line.item_name || "â€”"}</td>
                      <td className="px-4 py-3 text-gray-600">{line.quantity}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">{line.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{line.discount > 0 ? line.discount.toFixed(2) : "â€”"}</td>
                      <td className="px-4 py-3 text-amber-700 font-mono text-xs">%{line.vat_rate}</td>
                      <td className="px-4 py-3 text-emerald-700 font-mono text-xs">{line.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-3 text-gray-600 text-xs font-medium">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{viewInvoice.discount_total > 0 ? viewInvoice.discount_total.toFixed(2) : "â€”"}</td>
                    <td className="px-4 py-3 text-amber-700 font-mono text-xs">{viewInvoice.vat_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-emerald-700 font-mono text-xs font-medium">{viewInvoice.total_amount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <GlassButton onClick={() => setViewInvoice(null)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥ØºÙ„Ø§Ù‚</GlassButton>
              {viewInvoice.status === "draft" && (
                <GlassButton onClick={() => postInvoice(viewInvoice.id)} disabled={posting}>{posting ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ±Ø­ÙŠÙ„..." : "ØªØ±Ø­ÙŠÙ„ Ø§Ù„ÙØ§ØªÙˆØ±Ø©"}</GlassButton>
              )}
              {viewInvoice.status !== "draft" && viewInvoice.zatca_qr && (
                <GlassButton onClick={() => { setPostedResult({ zatca_qr_image: "", zatca_uuid: viewInvoice.zatca_uuid || "", journal_entry_id: viewInvoice.journal_entry_id || "" }); setTimeout(() => printInvoice(), 100); }}>Ø·Ø¨Ø§Ø¹Ø©</GlassButton>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {postedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-md mx-4 text-center">
            <div ref={printRef}>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">ØªÙ… ØªØ±Ø­ÙŠÙ„ Ø§Ù„ÙØ§ØªÙˆØ±Ø©</h2>
              <p className="text-emerald-700 text-sm mb-6">âœ“ ØªÙ… Ø§Ù„ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠ Ø¨Ù†Ø¬Ø§Ø­</p>
              <div className="flex flex-col gap-2 text-right text-sm mb-6">
                <div><span className="text-gray-400">ZATCA UUID:</span> <span className="text-gray-600 text-xs font-mono">{postedResult.zatca_uuid}</span></div>
                <div><span className="text-gray-400">Ø±Ù‚Ù… Ø§Ù„Ù‚ÙŠØ¯:</span> <span className="text-gray-600 text-xs font-mono">{postedResult.journal_entry_id}</span></div>
              </div>
              {postedResult.zatca_qr_image && (
                <div className="flex justify-center mb-4">
                  <img src={postedResult.zatca_qr_image} alt="ZATCA QR" className="w-32 h-32" />
                </div>
              )}
              <div className="text-xs text-gray-300">ÙØ§ØªÙˆØ±Ø© Ø¶Ø±ÙŠØ¨ÙŠØ© Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù…ØªØ·Ù„Ø¨Ø§Øª Ù‡ÙŠØ¦Ø© Ø§Ù„Ø²ÙƒØ§Ø© ÙˆØ§Ù„Ø¶Ø±ÙŠØ¨Ø© ÙˆØ§Ù„Ø¬Ù…Ø§Ø±Ùƒ</div>
            </div>
            <div className="flex items-center justify-center gap-3 mt-6">
              {postedResult.zatca_qr_image && <GlassButton onClick={printInvoice}>Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø©</GlassButton>}
              <GlassButton onClick={() => setPostedResult(null)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥ØºÙ„Ø§Ù‚</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-md mx-4 text-center">
            <p className="text-gray-900 text-lg mb-2">Ø­Ø°Ù Ø§Ù„ÙØ§ØªÙˆØ±Ø©</p>
            <p className="text-gray-600 mb-6">{`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù "${deleteConfirm.invoice_number}"ØŸ`}</p>
            <div className="flex items-center justify-center gap-3">
              <GlassButton onClick={() => deleteInvoice(deleteConfirm)} className="bg-red-500/20 hover:bg-red-500/30">ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù</GlassButton>
              <GlassButton onClick={() => setDeleteConfirm(null)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
