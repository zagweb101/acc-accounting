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
          <h1 className="text-4xl font-semibold tracking-tight text-white/90">شجرة الحسابات</h1>
          <p className="text-white/60">إدارة دليل الحسابات المحاسبي — عرض هرمي مع إضافة وتعديل وحذف ونسخ</p>
        </GlassCard>
      </section>

      <section className="max-w-6xl w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="glass-input max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <div className="flex-1 min-w-[200px]"><GlassInput placeholder="بحث بالكود أو الاسم..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <GlassButton onClick={openAddRoot}>+ حساب رئيسي</GlassButton>
            <GlassButton onClick={() => setShowCopy(true)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">نسخ الشجرة</GlassButton>
          </div>

          {error && <div className="glass mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          {loading ? (
            <p className="text-white/40 text-center py-12">جاري التحميل...</p>
          ) : accounts.length === 0 ? (
            <p className="text-white/40 text-center py-12">لا توجد حسابات. أضف حساباً رئيسياً للبدء</p>
          ) : (
            <AccountTreeView accounts={accounts} onAddChild={openAddChild} onEdit={openEdit} onDelete={setDeleteConfirm} search={search} />
          )}
        </GlassCard>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-white/90 mb-6">{editTarget ? "تعديل حساب" : parentTarget ? `إضافة حساب فرعي لـ ${parentTarget.name_ar}` : "إضافة حساب رئيسي"}</h2>
            <div className="flex flex-col gap-4">
              {!editTarget && (
                <div className="grid grid-cols-2 gap-4">
                  {!parentTarget && (
                    <div className="flex flex-col gap-2">
                      <label className="text-white/60 text-sm">الكود</label>
                      <GlassInput value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="مثال: 5000" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="text-white/60 text-sm">نوع الحساب</label>
                    <select value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })} className="glass-input cursor-pointer">
                      <option value="asset">أصل</option><option value="liability">خصم</option><option value="equity">حق ملكية</option><option value="revenue">إيراد</option><option value="expense">مصروف</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-white/60 text-sm">طبيعة الرصيد</label>
                    <select value={form.nature} onChange={e => setForm({ ...form, nature: e.target.value })} className="glass-input cursor-pointer">
                      <option value="debit">مدين</option><option value="credit">دائن</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-sm">الاسم (عربي)</label>
                <GlassInput value={form.name_ar || ""} onChange={e => setForm({ ...form, name_ar: e.target.value })} placeholder="اسم الحساب بالعربية" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-sm">الاسم (إنجليزي)</label>
                <GlassInput value={form.name_en || ""} onChange={e => setForm({ ...form, name_en: e.target.value })} placeholder="Account name in English" />
              </div>
              {editTarget && (
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.is_postable === 1} onChange={e => setForm({ ...form, is_postable: e.target.checked ? 1 : 0 })} className="accent-violet-500" /> قابل للترحيل
                  </label>
                  <label className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.is_active === 1} onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} className="accent-violet-500" /> نشط
                  </label>
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={saveAccount}>{editTarget ? "حفظ التعديلات" : "إضافة"}</GlassButton>
                <GlassButton onClick={() => { setShowForm(false); setEditTarget(null); setParentTarget(null); setForm(defaultAccount()); }} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">إلغاء</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-md mx-4 text-center">
            <p className="text-white/90 text-lg mb-2">حذف الحساب</p>
              <p className="text-white/60 mb-6">{`هل أنت متأكد من حذف "${deleteConfirm.name_ar}" (${deleteConfirm.code})؟`}</p>
            <div className="flex items-center justify-center gap-3">
              <GlassButton onClick={() => deleteAccount(deleteConfirm.id)} className="bg-red-500/20 hover:bg-red-500/30">تأكيد الحذف</GlassButton>
              <GlassButton onClick={() => setDeleteConfirm(null)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">إلغاء</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {showCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold text-white/90 mb-6">نسخ شجرة الحسابات</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-sm">من نشاط (المصدر)</label>
                <select value={copySource} onChange={e => setCopySource(e.target.value)} className="glass-input cursor-pointer">
                  <option value="">-- اختر --</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-sm">إلى نشاط (الهدف)</label>
                <select value={copyTarget} onChange={e => setCopyTarget(e.target.value)} className="glass-input cursor-pointer">
                  <option value="">-- اختر --</option>
                  {activities.filter(a => a.id !== copySource).map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={copyTree} disabled={!copySource || !copyTarget || copying}>{copying ? "جاري النسخ..." : "نسخ"}</GlassButton>
                <GlassButton onClick={() => setShowCopy(false)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">إلغاء</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
