"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import AccountTreeView from "@/components/AccountTreeView";

type Activity = { id: string; name: string; code: string };
type Account = {
  id: string; activity_id: string; code: string; name_ar: string; name_en: string | null;
  account_type: string; parent_id: string | null; level: number; nature: string;
  is_postable: number; is_active: number; balance: number;
};

const defaultAccount = (): Partial<Account> => ({ name_ar: "", name_en: "", account_type: "asset", nature: "debit", is_postable: 1, is_active: 1 });

export default function AccountsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeActivity, setActiveActivity] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [parentTarget, setParentTarget] = useState<Account | null>(null);
  const [form, setForm] = useState<Partial<Account>>(defaultAccount());

  const [showCopy, setShowCopy] = useState(false);
  const [copySource, setCopySource] = useState("");
  const [copyTarget, setCopyTarget] = useState("");
  const [copying, setCopying] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<Account | null>(null);

  useEffect(() => { fetch("/api/activities").then(r => r.json()).then(d => { setActivities(d.activities); if (d.activities.length > 0) setActiveActivity(d.activities[0].id); }).catch(() => setError("Failed to load activities")); }, []);

  function refetch() { setRefreshKey(k => k + 1); }

  useEffect(() => {
    if (!activeActivity) return;
    let cancelled = false;
    fetch(`/api/accounts?activity_id=${activeActivity}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setAccounts(d.accounts); setError(""); } })
      .catch(() => { if (!cancelled) setError("Failed to load accounts"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeActivity, refreshKey]);

  async function saveAccount() {
    const url = editTarget ? `/api/accounts/${editTarget.id}` : "/api/accounts";
    const method = editTarget ? "PUT" : "POST";
    const body = editTarget
      ? { name_ar: form.name_ar, name_en: form.name_en, is_postable: form.is_postable, is_active: form.is_active }
      : { activity_id: activeActivity, parent_id: parentTarget?.id || null, name_ar: form.name_ar, name_en: form.name_en, account_type: form.account_type, nature: form.nature, code: form.code || undefined, is_postable: form.is_postable };
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setShowForm(false); setEditTarget(null); setParentTarget(null); setForm(defaultAccount()); setError("");
      refetch();
    } catch { setError("Failed to save account"); }
  }

  async function deleteAccount(id: string) {
    try {
      const r = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setDeleteConfirm(null); setError("");
      refetch();
    } catch { setError("Failed to delete account"); }
  }

  async function copyTree() {
    if (!copySource || !copyTarget) return;
    setCopying(true);
    try {
      const r = await fetch("/api/accounts/copy-tree", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source_activity_id: copySource, target_activity_id: copyTarget }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error); } else { setShowCopy(false); setCopySource(""); setCopyTarget(""); setError(""); }
    } catch { setError("Failed to copy tree"); }
    setCopying(false);
  }

  function openAddChild(parent: Account) { setParentTarget(parent); setEditTarget(null); setForm(defaultAccount()); setShowForm(true); }

  function openEdit(account: Account) { setEditTarget(account); setParentTarget(null); setForm({ name_ar: account.name_ar, name_en: account.name_en || "", is_postable: account.is_postable, is_active: account.is_active }); setShowForm(true); }

  function openAddRoot() { setParentTarget(null); setEditTarget(null); setForm({ ...defaultAccount(), code: "" }); setShowForm(true); }

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-8" dir="rtl">
      <section className="max-w-6xl w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Ø´Ø¬Ø±Ø© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª</h1>
          <p className="text-gray-600">Ø¥Ø¯Ø§Ø±Ø© Ø¯Ù„ÙŠÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ÙŠ â€” Ø¹Ø±Ø¶ Ù‡Ø±Ù…ÙŠ Ù…Ø¹ Ø¥Ø¶Ø§ÙØ© ÙˆØªØ¹Ø¯ÙŠÙ„ ÙˆØ­Ø°Ù ÙˆÙ†Ø³Ø®</p>
        </GlassCard>
      </section>

      <section className="max-w-6xl w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="input-field max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <div className="flex-1 min-w-[200px]"><GlassInput placeholder="Ø¨Ø­Ø« Ø¨Ø§Ù„ÙƒÙˆØ¯ Ø£Ùˆ Ø§Ù„Ø§Ø³Ù…..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <GlassButton onClick={openAddRoot}>+ Ø­Ø³Ø§Ø¨ Ø±Ø¦ÙŠØ³ÙŠ</GlassButton>
            <GlassButton onClick={() => setShowCopy(true)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ù†Ø³Ø® Ø§Ù„Ø´Ø¬Ø±Ø©</GlassButton>
          </div>

          {error && <div className="card mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          {loading ? (
            <p className="text-gray-400 text-center py-12">Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</p>
          ) : accounts.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø³Ø§Ø¨Ø§Øª. Ø£Ø¶Ù Ø­Ø³Ø§Ø¨Ø§Ù‹ Ø±Ø¦ÙŠØ³ÙŠØ§Ù‹ Ù„Ù„Ø¨Ø¯Ø¡</p>
          ) : (
            <AccountTreeView accounts={accounts} onAddChild={openAddChild} onEdit={openEdit} onDelete={setDeleteConfirm} search={search} />
          )}
        </GlassCard>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{editTarget ? "ØªØ¹Ø¯ÙŠÙ„ Ø­Ø³Ø§Ø¨" : parentTarget ? `Ø¥Ø¶Ø§ÙØ© Ø­Ø³Ø§Ø¨ ÙØ±Ø¹ÙŠ Ù„Ù€ ${parentTarget.name_ar}` : "Ø¥Ø¶Ø§ÙØ© Ø­Ø³Ø§Ø¨ Ø±Ø¦ÙŠØ³ÙŠ"}</h2>
            <div className="flex flex-col gap-4">
              {!editTarget && (
                <div className="grid grid-cols-2 gap-4">
                  {!parentTarget && (
                    <div className="flex flex-col gap-2">
                      <label className="text-gray-600 text-sm">Ø§Ù„ÙƒÙˆØ¯</label>
                      <GlassInput value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Ù…Ø«Ø§Ù„: 5000" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-600 text-sm">Ù†ÙˆØ¹ Ø§Ù„Ø­Ø³Ø§Ø¨</label>
                    <select value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })} className="input-field cursor-pointer">
                      <option value="asset">Ø£ØµÙ„</option><option value="liability">Ø®ØµÙ…</option><option value="equity">Ø­Ù‚ Ù…Ù„ÙƒÙŠØ©</option><option value="revenue">Ø¥ÙŠØ±Ø§Ø¯</option><option value="expense">Ù…ØµØ±ÙˆÙ</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-600 text-sm">Ø·Ø¨ÙŠØ¹Ø© Ø§Ù„Ø±ØµÙŠØ¯</label>
                    <select value={form.nature} onChange={e => setForm({ ...form, nature: e.target.value })} className="input-field cursor-pointer">
                      <option value="debit">Ù…Ø¯ÙŠÙ†</option><option value="credit">Ø¯Ø§Ø¦Ù†</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">Ø§Ù„Ø§Ø³Ù… (Ø¹Ø±Ø¨ÙŠ)</label>
                <GlassInput value={form.name_ar || ""} onChange={e => setForm({ ...form, name_ar: e.target.value })} placeholder="Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">Ø§Ù„Ø§Ø³Ù… (Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ)</label>
                <GlassInput value={form.name_en || ""} onChange={e => setForm({ ...form, name_en: e.target.value })} placeholder="Account name in English" />
              </div>
              {editTarget && (
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-gray-600 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.is_postable === 1} onChange={e => setForm({ ...form, is_postable: e.target.checked ? 1 : 0 })} className="accent-violet-500" /> Ù‚Ø§Ø¨Ù„ Ù„Ù„ØªØ±Ø­ÙŠÙ„
                  </label>
                  <label className="flex items-center gap-2 text-gray-600 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.is_active === 1} onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} className="accent-violet-500" /> Ù†Ø´Ø·
                  </label>
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={saveAccount}>{editTarget ? "Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª" : "Ø¥Ø¶Ø§ÙØ©"}</GlassButton>
                <GlassButton onClick={() => { setShowForm(false); setEditTarget(null); setParentTarget(null); setForm(defaultAccount()); }} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-md mx-4 text-center">
            <p className="text-gray-900 text-lg mb-2">Ø­Ø°Ù Ø§Ù„Ø­Ø³Ø§Ø¨</p>
              <p className="text-gray-600 mb-6">{`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù "${deleteConfirm.name_ar}" (${deleteConfirm.code})ØŸ`}</p>
            <div className="flex items-center justify-center gap-3">
              <GlassButton onClick={() => deleteAccount(deleteConfirm.id)} className="bg-red-500/20 hover:bg-red-500/30">ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù</GlassButton>
              <GlassButton onClick={() => setDeleteConfirm(null)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {showCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Ù†Ø³Ø® Ø´Ø¬Ø±Ø© Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">Ù…Ù† Ù†Ø´Ø§Ø· (Ø§Ù„Ù…ØµØ¯Ø±)</label>
                <select value={copySource} onChange={e => setCopySource(e.target.value)} className="input-field cursor-pointer">
                  <option value="">-- Ø§Ø®ØªØ± --</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">Ø¥Ù„Ù‰ Ù†Ø´Ø§Ø· (Ø§Ù„Ù‡Ø¯Ù)</label>
                <select value={copyTarget} onChange={e => setCopyTarget(e.target.value)} className="input-field cursor-pointer">
                  <option value="">-- Ø§Ø®ØªØ± --</option>
                  {activities.filter(a => a.id !== copySource).map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={copyTree} disabled={!copySource || !copyTarget || copying}>{copying ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù†Ø³Ø®..." : "Ù†Ø³Ø®"}</GlassButton>
                <GlassButton onClick={() => setShowCopy(false)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
