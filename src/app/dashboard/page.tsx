"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Activity = { id: string; name: string; code: string; type: string };
type FiscalYear = { id: string; name: string };

type KPI = { label: string; icon: string; value: number; change: number; color: string };
type ChartData = { name: string; value: number };
type MonthlyData = Record<string, string | number>;
type AgingBucket = { name: string; value: number };

type DashData = {
  activities: Activity[];
  kpis: KPI[];
  revenueByActivity: ChartData[];
  monthlyComparison: MonthlyData[];
  agingBuckets: AgingBucket[];
};

const ACCENT = "#6366f1";
const ACCENT_OPTS = ["#6366f1", "#818cf8", "#a5b4fc", "#4f46e5"];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="card px-4 py-3 text-sm shadow-lg">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-gray-900" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()} Ø¯.Ùƒ
        </p>
      ))}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: KPI }) {
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{kpi.icon}</div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${kpi.change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {kpi.change >= 0 ? "â†‘" : "â†“"} {Math.abs(kpi.change)}%
        </span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{kpi.value.toLocaleString()}</p>
      <p className="text-gray-500 text-sm mt-1">{kpi.label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [filterActivity, setFilterActivity] = useState("");
  const [filterFY, setFilterFY] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [error, setError] = useState("");

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/activities").then(r => r.json()).then(d => {
      setActivities(d.activities);
      if (d.activities.length > 0) setFilterActivity(d.activities[0].id);
      setInitialized(true);
    }).catch(() => setError("Failed to load activities"));
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (filterActivity) params.set("activity_id", filterActivity);
    if (filterFY) params.set("fiscal_year_id", filterFY);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    fetch(`/api/dashboard?${params}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { setData(d); setError(""); }).catch(() => setError("Failed to load data"));
    if (filterActivity) fetch(`/api/fiscal-years?activity_id=${filterActivity}`).then(r => r.json()).then(d => setFiscalYears(d.fiscal_years || [])).catch(() => {});
  }, [initialized, filterActivity, filterFY, filterFrom, filterTo]);

  return (
    <div className="flex flex-col px-8 py-8 gap-6" dir="rtl">
      <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…</h1>
        <p className="text-gray-500">Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© â€” Ù†Ø¸Ø±Ø© Ø´Ø§Ù…Ù„Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø¯Ø§Ø¡</p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterActivity} onChange={e => { setFilterActivity(e.target.value); setFilterFY(""); }} className="input-field max-w-[220px] cursor-pointer">
            <option value="">ÙƒÙ„ Ø§Ù„Ø£Ù†Ø´Ø·Ø©</option>
            {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
          </select>
          <select value={filterFY} onChange={e => setFilterFY(e.target.value)} className="input-field max-w-[180px] cursor-pointer">
            <option value="">ÙƒÙ„ Ø§Ù„Ø³Ù†ÙˆØ§Øª</option>
            {fiscalYears.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input-field max-w-[160px]" placeholder="Ù…Ù†" />
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input-field max-w-[160px]" placeholder="Ø¥Ù„Ù‰" />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </GlassCard>

      {data && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {data.kpis.map((kpi, i) => <KpiCard key={i} kpi={kpi} />)}
          </section>

          <section className="grid lg:grid-cols-3 gap-6">
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø­Ø³Ø¨ Ø§Ù„Ù†Ø´Ø§Ø·</h2>
              {data.revenueByActivity.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.revenueByActivity} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value" nameKey="name">
                      {data.revenueByActivity.map((_, i) => <Cell key={i} fill={ACCENT_OPTS[i % ACCENT_OPTS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value: string) => <span className="text-gray-500 text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </GlassCard>

            <GlassCard className="p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„Ø´Ù‡Ø±ÙŠØ©</h2>
              {data.monthlyComparison.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.monthlyComparison} barCategoryGap="20%">
                    <CartesianGrid stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
                    <Legend formatter={(value: string) => <span className="text-gray-500 text-xs">{value}</span>} />
                    {activities.filter(a => !filterActivity || a.id === filterActivity).map((a, i) => (
                      <Bar key={a.id} dataKey={a.name} name={a.name} fill={ACCENT_OPTS[i % ACCENT_OPTS.length]} radius={[6, 6, 0, 0]} maxBarSize={40} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </section>

          <section>
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ† (AR)</h2>
              {data.agingBuckets.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¯ÙŠÙˆÙ† Ù…Ø³ØªØ­Ù‚Ø©</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.agingBuckets} barCategoryGap="30%">
                    <CartesianGrid stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
                    <Bar dataKey="value" name="Ø§Ù„Ù…Ø³ØªØ­Ù‚" radius={[8, 8, 0, 0]} maxBarSize={60}>
                      {data.agingBuckets.map((b, i) => (
                        <Cell key={i} fill={[ACCENT, "#818cf8", "#a5b4fc", "#4f46e5"][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </section>
        </>
      )}
    </div>
  );
}
