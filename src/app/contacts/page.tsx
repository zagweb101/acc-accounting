"use client";

import { useEffect, useState, useCallback } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";

type Activity = { id: string; name: string; code: string; type: string };
type Contact = {
  id: string; activity_id: string; type: string; name: string;
  tax_number: string | null; phone: string | null; balance: number;
  credit_limit: number; outstanding: number;
};

export default function ContactsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeActivity, setActiveActivity] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [formType, setFormType] = useState("customer");
  const [formName, setFormName] = useState("");
  const [formTax, setFormTax] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCredit, setFormCredit] = useState(0);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null);

  useEffect(() => {
    fetch("/api/activities").then(r => r.json()).then(d => {
      setActivities(d.activities);
      if (d.activities.length > 0) setActiveActivity(d.activities[0].id);
    }).catch(() => setError("Failed to load activities"));
  }, []);

  useEffect(() => {
    if (!activeActivity) return;
    let cancelled = false;
    fetch(`/api/contacts?activity_id=${activeActivity}`)
      .then(r => r.json()).then(d => { if (!cancelled) { setContacts(d.contacts); setError(""); } })
      .catch(() => { if (!cancelled) setError("Failed to load contacts"); });
    return () => { cancelled = true; };
  }, [activeActivity, refreshKey]);

  function openAdd() {
    setEditTarget(null); setFormType("customer"); setFormName(""); setFormTax(""); setFormPhone(""); setFormCredit(0); setShowForm(true);
  }

  function openEdit(c: Contact) {
    setEditTarget(c); setFormType(c.type); setFormName(c.name); setFormTax(c.tax_number || ""); setFormPhone(c.phone || ""); setFormCredit(c.credit_limit); setShowForm(true);
  }

  async function save() {
    if (!formName) { setError("Name is required"); return; }
    setSaving(true);
    const url = editTarget ? `/api/contacts/${editTarget.id}` : "/api/contacts";
    const method = editTarget ? "PUT" : "POST";
    try {
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_id: activeActivity, type: formType, name: formName, tax_number: formTax || null, phone: formPhone || null, credit_limit: formCredit }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setShowForm(false); setEditTarget(null); setError(""); refetch();
    } catch { setError("Failed to save"); }
    setSaving(false);
  }

  async function deleteContact(id: string) {
    try {
      const r = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setDeleteConfirm(null); setError(""); refetch();
    } catch { setError("Failed to delete"); }
  }

  const filtered = contacts.filter(c => {
    if (filter !== "all" && c.type !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.includes(q) || (c.tax_number && c.tax_number.includes(q)) || (c.phone && c.phone.includes(q));
  });

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-8" dir="rtl">
      <section className="max-w-6xl w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Ø¬Ù‡Ø§Øª Ø§Ù„Ø§ØªØµØ§Ù„</h1>
          <p className="text-gray-600">Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ ÙˆØ§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ† â€” Ø§Ù„Ø£Ø±ØµØ¯Ø© ÙˆØ§Ù„Ø­Ø¯ÙˆØ¯ Ø§Ù„Ø§Ø¦ØªÙ…Ø§Ù†ÙŠØ©</p>
        </GlassCard>
      </section>

      <section className="max-w-6xl w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="input-field max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <div className="flex items-center gap-1 bg-black/20 rounded-2xl p-1">
              {["all", "customer", "supplier", "both"].map(t => (
                <button key={t} onClick={() => setFilter(t)} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${filter === t ? "bg-white/10 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}>
                  {t === "all" ? "Ø§Ù„ÙƒÙ„" : t === "customer" ? "Ø¹Ù…Ù„Ø§Ø¡" : t === "supplier" ? "Ù…ÙˆØ±Ø¯ÙŠÙ†" : "Ø§Ù„Ø§Ø«Ù†ÙŠÙ†"}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[180px]"><GlassInput placeholder="Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ø¶Ø±ÙŠØ¨ÙŠ..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <GlassButton onClick={openAdd}>+ Ø¬Ù‡Ø© Ø§ØªØµØ§Ù„</GlassButton>
          </div>

          {error && <div className="card mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          {filtered.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù‡Ø§Øª Ø§ØªØµØ§Ù„. Ø£Ø¶Ù ÙˆØ§Ø­Ø¯Ø© Ù„Ù„Ø¨Ø¯Ø£</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => {
                const overdue = c.outstanding > 0;
                const overLimit = c.credit_limit > 0 && c.outstanding > c.credit_limit;
                return (
                  <a key={c.id} href={`/contacts/${c.id}`} className="block card glass-hover p-5 rounded-2xl transition-all no-underline">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-gray-900 font-semibold text-base">{c.name}</h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.type === "customer" ? "bg-emerald-50 text-emerald-700" : c.type === "supplier" ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"}`}>
                          {c.type === "customer" ? "Ø¹Ù…ÙŠÙ„" : c.type === "supplier" ? "Ù…ÙˆØ±Ø¯" : "Ø¹Ù…ÙŠÙ„ ÙˆÙ…ÙˆØ±Ø¯"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={e => { e.preventDefault(); e.stopPropagation(); openEdit(c); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all text-xs">âš™</button>
                        <button onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(c); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-red-500/20 text-gray-600 hover:text-red-300 transition-all text-xs">âœ•</button>
                      </div>
                    </div>
                    {c.tax_number && <p className="text-gray-400 text-xs font-mono mb-1">Ø¶Ø±ÙŠØ¨ÙŠ: {c.tax_number}</p>}
                    {c.phone && <p className="text-gray-400 text-xs mb-3">{c.phone}</p>}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-gray-400 text-xs">Ø§Ù„Ù…Ø³ØªØ­Ù‚</p>
                        <p className={`font-mono text-sm font-semibold ${overLimit ? "text-red-300" : overdue ? "text-amber-700" : "text-emerald-700"}`}>
                          {c.outstanding.toFixed(2)}
                        </p>
                      </div>
                      {c.credit_limit > 0 && (
                        <div className="text-left">
                          <p className="text-gray-400 text-xs">Ø§Ù„Ø­Ø¯ Ø§Ù„Ø§Ø¦ØªÙ…Ø§Ù†ÙŠ</p>
                          <p className="font-mono text-sm text-gray-700">{c.credit_limit.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    {overLimit && <p className="text-red-300/70 text-xs mt-2">ØªØ¬Ø§ÙˆØ² Ø§Ù„Ø­Ø¯ Ø§Ù„Ø§Ø¦ØªÙ…Ø§Ù†ÙŠ</p>}
                  </a>
                );
              })}
            </div>
          )}
        </GlassCard>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{editTarget ? `ØªØ¹Ø¯ÙŠÙ„ ${editTarget.name}` : "Ø¥Ø¶Ø§ÙØ© Ø¬Ù‡Ø© Ø§ØªØµØ§Ù„"}</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">Ø§Ù„Ø§Ø³Ù…</label>
                <GlassInput value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ø§Ø³Ù… Ø¬Ù‡Ø© Ø§Ù„Ø§ØªØµØ§Ù„" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">Ø§Ù„Ù†ÙˆØ¹</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="input-field cursor-pointer">
                  <option value="customer">Ø¹Ù…ÙŠÙ„</option>
                  <option value="supplier">Ù…ÙˆØ±Ø¯</option>
                  <option value="both">Ø¹Ù…ÙŠÙ„ ÙˆÙ…ÙˆØ±Ø¯</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ø¶Ø±ÙŠØ¨ÙŠ</label>
                  <GlassInput value={formTax} onChange={e => setFormTax(e.target.value)} placeholder="123456789" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„</label>
                  <GlassInput value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="0555123456" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">Ø§Ù„Ø­Ø¯ Ø§Ù„Ø§Ø¦ØªÙ…Ø§Ù†ÙŠ</label>
                <input type="number" step="0.01" min="0" value={formCredit} onChange={e => setFormCredit(parseFloat(e.target.value) || 0)} className="input-field" />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={save} disabled={saving || !formName}>{saving ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : editTarget ? "Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª" : "Ø¥Ø¶Ø§ÙØ©"}</GlassButton>
                <GlassButton onClick={() => { setShowForm(false); setEditTarget(null); }} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-md mx-4 text-center">
            <p className="text-gray-900 text-lg mb-2">Ø­Ø°Ù Ø¬Ù‡Ø© Ø§ØªØµØ§Ù„</p>
            <p className="text-gray-600 mb-6">{`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù "${deleteConfirm.name}"ØŸ`}</p>
            <div className="flex items-center justify-center gap-3">
              <GlassButton onClick={() => deleteContact(deleteConfirm.id)} className="bg-red-500/20 hover:bg-red-500/30">ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù</GlassButton>
              <GlassButton onClick={() => setDeleteConfirm(null)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
