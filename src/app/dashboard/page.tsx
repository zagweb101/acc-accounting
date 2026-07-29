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

const ACCENT = "#818cf8";
const ACCENT_OPTS = ["#818cf8", "#6366f1", "#a5b4fc", "#4f46e5"];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="card px-4 py-3 text-sm">
      <p className="text-gray-600 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-gray-900" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()} د.ك
        </p>
      ))}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: KPI }) {
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-accent-subtle text-accent" style={{ backgroundColor: "rgba(129,140,248,0.15)", color: "#818cf8" }}>{kpi.icon}</div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${kpi.change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {kpi.change >= 0 ? "↑" : "↓"} {Math.abs(kpi.change)}%
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
    <div className="flex flex-col px-8 py-16 gap-8" dir="rtl">
      <section className="w-full">
        <GlassCard className="flex flex-col items-center text-center p-10 gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-500">المؤشرات المالية الرئيسية — نظرة شاملة على الأداء</p>
        </GlassCard>
      </section>

      <section className="w-full">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={filterActivity} onChange={e => { setFilterActivity(e.target.value); setFilterFY(""); }} className="input-field max-w-[220px] cursor-pointer">
              <option value="">كل الأنشطة</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
            <select value={filterFY} onChange={e => setFilterFY(e.target.value)} className="input-field max-w-[180px] cursor-pointer">
              <option value="">كل السنوات</option>
              {fiscalYears.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input-field max-w-[160px]" placeholder="من" />
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input-field max-w-[160px]" placeholder="إلى" />
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </GlassCard>
      </section>

      {data && (
        <>
          <section className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
            {data.kpis.map((kpi, i) => <KpiCard key={i} kpi={kpi} />)}
          </section>

          <section className="w-full grid lg:grid-cols-3 gap-6">
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">إيرادات حسب النشاط</h2>
              {data.revenueByActivity.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات</p>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">الإيرادات الشهرية</h2>
              {data.monthlyComparison.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.monthlyComparison} barCategoryGap="20%">
                    <CartesianGrid stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
                    <Legend formatter={(value: string) => <span className="text-gray-500 text-xs">{value}</span>} />
                    {activities.filter(a => !filterActivity || a.id === filterActivity).map((a, i) => (
                      <Bar key={a.id} dataKey={a.name} name={a.name} fill={ACCENT_OPTS[i % ACCENT_OPTS.length]} radius={[6, 6, 0, 0]} maxBarSize={40} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </section>

          <section className="w-full">
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">أعمار الديون (AR)</h2>
              {data.agingBuckets.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">لا توجد ديون مستحقة</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.agingBuckets} barCategoryGap="30%">
                    <CartesianGrid stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
                    <Bar dataKey="value" name="المستحق" radius={[8, 8, 0, 0]} maxBarSize={60}>
                      {data.agingBuckets.map((b, i) => (
                        <Cell key={i} fill={[ACCENT, "#6366f1", "#a5b4fc", "#4f46e5"][i]} />
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
