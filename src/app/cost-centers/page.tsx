"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";

type Activity = { id: string; name: string; code: string };
type CostCenter = { id: string; activity_id: string; activity_name: string; name: string; code: string; parent_id: string | null; level: number; is_active: number };

type ProfitRow = { id: string; name: string; code: string; level: number; revenue: number; expense: number; profit: number };
type TreeNode = CostCenter & { children: TreeNode[] };

function buildTree(items: CostCenter[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const item of items) map.set(item.id, { ...item, children: [] });
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) map.get(item.parent_id)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export default function CostCentersPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeActivity, setActiveActivity] = useState("");
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [profitRows, setProfitRows] = useState<ProfitRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CostCenter | null>(null);
  const [parentTarget, setParentTarget] = useState<CostCenter | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<CostCenter | null>(null);

  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-12-31");

  useEffect(() => {
    fetch("/api/activities").then(r => r.json()).then(d => {
      setActivities(d.activities);
      if (d.activities.length > 0) setActiveActivity(d.activities[0].id);
    }).catch(() => setError("Failed to load activities"));
  }, []);

  useEffect(() => {
    if (!activeActivity) return;
    let cancelled = false;
    fetch(`/api/cost-centers?activity_id=${activeActivity}`)
      .then(r => r.json()).then(d => { if (!cancelled) setCenters(d.centers); })
      .catch(() => { if (!cancelled) setError("Failed to load cost centers"); });
    return () => { cancelled = true; };
  }, [activeActivity, refreshKey]);

  function loadProfit() {
    if (!activeActivity) return;
    fetch(`/api/cost-centers/profitability?activity_id=${activeActivity}&from=${dateFrom}&to=${dateTo}`)
      .then(r => r.json()).then(d => setProfitRows(d.rows))
      .catch(() => setError("Failed to load profitability"));
  }

  useEffect(() => {
    if (!activeActivity) return;
    let cancelled = false;
    fetch(`/api/cost-centers/profitability?activity_id=${activeActivity}&from=${dateFrom}&to=${dateTo}`)
      .then(r => r.json()).then(d => { if (!cancelled) setProfitRows(d.rows); })
      .catch(() => { if (!cancelled) setError("Failed to load profitability"); });
    return () => { cancelled = true; };
  }, [activeActivity, dateFrom, dateTo, refreshKey]);

  async function save() {
    const url = editTarget ? `/api/cost-centers/${editTarget.id}` : "/api/cost-centers";
    const method = editTarget ? "PUT" : "POST";
    const body = editTarget
      ? { name: formName, is_active: editTarget.is_active }
      : { activity_id: activeActivity, parent_id: parentTarget?.id || null, name: formName, code: formCode || undefined };
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setShowForm(false); setEditTarget(null); setParentTarget(null); setFormName(""); setFormCode(""); setError("");
      setRefreshKey(k => k + 1);
    } catch { setError("Failed to save"); }
  }

  async function remove(id: string) {
    try {
      const r = await fetch(`/api/cost-centers/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { setError(d.error); return; }
      setDeleteConfirm(null); setError("");
      setRefreshKey(k => k + 1);
    } catch { setError("Failed to delete"); }
  }

  function openAddChild(parent: CostCenter) { setParentTarget(parent); setEditTarget(null); setFormName(""); setFormCode(""); setShowForm(true); }
  function openEdit(c: CostCenter) { setEditTarget(c); setParentTarget(null); setFormName(c.name); setFormCode(""); setShowForm(true); }
  function openAddRoot() { setParentTarget(null); setEditTarget(null); setFormName(""); setFormCode(""); setShowForm(true); }

  const tree = buildTree(centers);

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const matches = search ? node.code.includes(search) || node.name.includes(search) : true;
    const childMatches = search ? node.children.some(c => c.code.includes(search) || c.name.includes(search)) : true;
    if (search && !matches && !childMatches) return <></>;

    return (
      <div key={node.id}>
        <div className={`card flex items-center gap-3 px-4 py-2.5 text-sm`} style={{ marginInlineStart: `${depth * 24}px` }}>
          <span className="font-mono text-gray-900 text-xs w-20 shrink-0">{node.code}</span>
          <span className="text-gray-900 font-medium flex-1 truncate">{node.name}</span>
          {depth === 0 && <span className="text-gray-400 text-xs w-24 truncate">{node.activity_name}</span>}
          <span className="text-gray-400 text-xs w-8">{depth + 1}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${node.is_active ? "text-emerald-700 bg-emerald-500/15 border-emerald-500/20" : "text-red-300 bg-red-500/15 border-red-500/20"}`}>
            {node.is_active ? "Ù†Ø´Ø·" : "ØºÙŠØ± Ù†Ø´Ø·"}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => openAddChild(node)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all text-sm" title="Ø¥Ø¶Ø§ÙØ© ÙØ±Ø¹ÙŠ">+</button>
            <button onClick={() => openEdit(node)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all text-sm" title="ØªØ¹Ø¯ÙŠÙ„">âš™</button>
            <button onClick={() => setDeleteConfirm(node)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 hover:bg-red-500/20 text-gray-600 hover:text-red-300 transition-all text-sm" title="Ø­Ø°Ù">âœ•</button>
          </div>
        </div>
        {node.children.map(ch => renderNode(ch, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-8" dir="rtl">
      <section className="w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Ù…Ø±Ø§ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ©</h1>
          <p className="text-gray-600">Ø¥Ø¯Ø§Ø±Ø© Ù…Ø±Ø§ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ© â€” Ù‡ÙŠÙƒÙ„ Ù‡Ø±Ù…ÙŠ Ù…Ø¹ ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ø±Ø¨Ø­ÙŠØ©</p>
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <select value={activeActivity} onChange={e => setActiveActivity(e.target.value)} className="input-field max-w-[250px] cursor-pointer">
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <div className="flex-1 min-w-[200px]"><GlassInput placeholder="Ø¨Ø­Ø« Ø¨Ø§Ù„ÙƒÙˆØ¯ Ø£Ùˆ Ø§Ù„Ø§Ø³Ù…..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <GlassButton onClick={openAddRoot}>+ Ù…Ø±ÙƒØ² Ø¬Ø¯ÙŠØ¯</GlassButton>
          </div>

          {error && <div className="card mb-4 px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div>}

          {centers.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø±Ø§ÙƒØ² ØªÙƒÙ„ÙØ©. Ø£Ø¶Ù ÙˆØ§Ø­Ø¯Ø§Ù‹ Ù„Ù„Ø¨Ø¯Ø¡</p>
          ) : (
            <div className="flex flex-col gap-1">
              {tree.map(node => renderNode(node, 0))}
            </div>
          )}
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ØªÙ‚Ø±ÙŠØ± Ø±Ø¨Ø­ÙŠØ© Ù…Ø±Ø§ÙƒØ² Ø§Ù„ØªÙƒÙ„ÙØ©</h2>
          <div className="flex items-center gap-4 flex-wrap mb-6">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Ù…Ù† ØªØ§Ø±ÙŠØ®</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field max-w-[180px]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ®</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field max-w-[180px]" />
            </div>
            <GlassButton onClick={loadProfit} className="mt-5">ØªØ­Ø¯ÙŠØ«</GlassButton>
          </div>
          {profitRows.length === 0 ? (
            <p className="text-gray-400 text-sm">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„ÙØªØ±Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©</p>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 backdrop-blur-xl">
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„ÙƒÙˆØ¯</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ù…Ø±ÙƒØ²</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Ø§Ù„Ø±Ø¨Ø­ / Ø§Ù„Ø®Ø³Ø§Ø±Ø©</th>
                  </tr>
                </thead>
                <tbody>
                  {profitRows.map((row, i) => {
                    const isProfit = row.profit >= 0;
                    return (
                      <tr key={row.id} className={i < profitRows.length - 1 ? "border-b border-gray-200" : ""}>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{row.code}</td>
                        <td className="px-4 py-3 text-gray-900">{row.name}</td>
                        <td className="px-4 py-3 text-emerald-700 font-mono">{row.revenue.toLocaleString()} Ø¯.Ùƒ</td>
                        <td className="px-4 py-3 text-red-300 font-mono">{row.expense.toLocaleString()} Ø¯.Ùƒ</td>
                        <td className={`px-4 py-3 font-mono font-medium ${isProfit ? "text-emerald-700" : "text-red-300"}`}>
                          {isProfit ? "+" : ""}{row.profit.toLocaleString()} Ø¯.Ùƒ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editTarget ? `ØªØ¹Ø¯ÙŠÙ„ ${editTarget.name}` : parentTarget ? `Ø¥Ø¶Ø§ÙØ© ÙØ±Ø¹ÙŠ Ù„Ù€ ${parentTarget.name}` : "Ø¥Ø¶Ø§ÙØ© Ù…Ø±ÙƒØ² ØªÙƒÙ„ÙØ©"}
            </h2>
            <div className="flex flex-col gap-4">
              {!editTarget && !parentTarget && (
                <div className="flex flex-col gap-2">
                  <label className="text-gray-600 text-sm">Ø§Ù„ÙƒÙˆØ¯</label>
                  <GlassInput value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="Ù…Ø«Ø§Ù„: CC-100" dir="ltr" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-gray-600 text-sm">Ø§Ù„Ø§Ø³Ù…</label>
                <GlassInput value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ø§Ø³Ù… Ø§Ù„Ù…Ø±ÙƒØ²" />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <GlassButton onClick={save}>{editTarget ? "Ø­ÙØ¸" : "Ø¥Ø¶Ø§ÙØ©"}</GlassButton>
                <GlassButton onClick={() => { setShowForm(false); setEditTarget(null); setParentTarget(null); setFormName(""); setFormCode(""); }} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-8 w-full max-w-md mx-4 text-center">
            <p className="text-gray-900 text-lg mb-2">Ø­Ø°Ù Ù…Ø±ÙƒØ² ØªÙƒÙ„ÙØ©</p>
            <p className="text-gray-600 mb-6">{`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù "${deleteConfirm.name}" (${deleteConfirm.code})ØŸ`}</p>
            <div className="flex items-center justify-center gap-3">
              <GlassButton onClick={() => remove(deleteConfirm.id)} className="bg-red-500/20 hover:bg-red-500/30">ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù</GlassButton>
              <GlassButton onClick={() => setDeleteConfirm(null)} className="from-white/5 to-white/5 hover:from-white/10 hover:to-white/10">Ø¥Ù„ØºØ§Ø¡</GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
