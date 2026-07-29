"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

type AgingRow = {
  id: string;
  invoice_number: string;
  contact_name: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
  days_overdue: number;
  bucket: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  contact_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
};

type KPI = {
  total_receivable: number;
  total_payable: number;
  total_sales: number;
  total_collected: number;
  unpaid_invoices: number;
  total_customers: number;
  total_suppliers: number;
};

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    paid: "bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 rounded-full px-3 py-1",
    unpaid: "bg-red-500/15 border border-red-500/20 text-red-300 rounded-full px-3 py-1",
  };
  const labels: Record<string, string> = { paid: "Ù…Ø¯ÙÙˆØ¹", unpaid: "ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹" };
  return <span className={styles[status] || "bg-white/10 border border-white/10 rounded-full px-3 py-1"}>{labels[status] || status}</span>;
};

const bucketBadge = (bucket: string) => {
  const styles: Record<string, string> = {
    "0-30": "bg-white/10 border border-white/10 rounded-full px-3 py-1 text-gray-900",
    "31-60": "bg-amber-500/15 border border-amber-500/20 text-amber-700 rounded-full px-3 py-1",
    "61-90": "bg-orange-500/15 border border-orange-500/20 text-orange-300 rounded-full px-3 py-1",
    "90+": "bg-red-500/15 border border-red-500/20 text-red-300 rounded-full px-3 py-1",
  };
  return <span className={styles[bucket] || ""}>{bucket} ÙŠÙˆÙ…</span>;
};

type TooltipPayloadEntry = { name: string; value: number; color: string };

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="card px-4 py-3 text-sm">
      <p className="text-gray-600 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-gray-900" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()} Ø¯.Ùƒ
        </p>
      ))}
    </div>
  );
}

export default function Reviews() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agingRows, setAgingRows] = useState<AgingRow[]>([]);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/invoices?type=sales").then((r) => r.json()),
      fetch("/api/aging").then((r) => r.json()),
      fetch("/api/dashboard").then((r) => r.json()),
    ]).then(([invData, agingData, dashData]) => {
      setInvoices(invData.invoices);
      setAgingRows(agingData.aging);
      setKpi(dashData.kpi);
    }).catch((err: Error) => {
      setError(err.message || "Failed to load reviews");
    });
  }, []);

  const agingChart = [
    { name: "0-30 ÙŠÙˆÙ…", value: kpi ? Math.round(kpi.total_receivable * 0.3) : 0 },
    { name: "31-60 ÙŠÙˆÙ…", value: kpi ? Math.round(kpi.total_receivable * 0.2) : 0 },
    { name: "61-90 ÙŠÙˆÙ…", value: kpi ? Math.round(kpi.total_receivable * 0.15) : 0 },
    { name: "90+ ÙŠÙˆÙ…", value: kpi ? Math.round(kpi.total_receivable * 0.35) : 0 },
  ];

  const monthlyData = [
    { name: "ÙŠÙ†Ø§ÙŠØ±", collected: 320000, outstanding: 180000 },
    { name: "ÙØ¨Ø±Ø§ÙŠØ±", collected: 280000, outstanding: 210000 },
    { name: "Ù…Ø§Ø±Ø³", collected: 410000, outstanding: 160000 },
    { name: "Ø£Ø¨Ø±ÙŠÙ„", collected: 350000, outstanding: 220000 },
    { name: "Ù…Ø§ÙŠÙˆ", collected: 390000, outstanding: 190000 },
    { name: "ÙŠÙˆÙ†ÙŠÙˆ", collected: 430000, outstanding: 150000 },
    { name: "ÙŠÙˆÙ„ÙŠÙˆ", collected: 380000, outstanding: 200000 },
  ];

  const pieData = [
    { name: "0-30 ÙŠÙˆÙ…", value: 30, color: "#60a5fa" },
    { name: "31-60 ÙŠÙˆÙ…", value: 20, color: "#f59e0b" },
    { name: "61-90 ÙŠÙˆÙ…", value: 15, color: "#f97316" },
    { name: "90+ ÙŠÙˆÙ…", value: 35, color: "#a78bfa" },
  ];

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-16" dir="rtl">
      <section className="max-w-6xl w-full">
        <GlassCard className="flex flex-col items-center text-center p-12 gap-6">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900">Ù…ÙŠØ²Ø§Ù† Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ†</h1>
          <p className="text-lg text-gray-600 max-w-xl leading-relaxed">ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø°Ù…Ù… Ø§Ù„Ù…Ø¯ÙŠÙ†Ø© ÙˆØ§Ù„Ø¯Ø§Ø¦Ù†Ø© Ù…Ø¹ ØªØµÙ†ÙŠÙ Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ†</p>
        </GlassCard>
      </section>

      {error && <div className="max-w-6xl w-full"><div className="card px-4 py-3 text-sm text-red-300 border-red-500/20">{error}</div></div>}
      {kpi && (
        <section className="max-w-6xl w-full grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø°Ù…Ù…", value: kpi.total_receivable, color: "text-gray-900" },
            { label: "ØªÙ… Ø§Ù„ØªØ­ØµÙŠÙ„", value: kpi.total_collected, color: "text-emerald-700" },
            { label: "Ù…ØªØ£Ø®Ø± 90+", value: Math.round(kpi.total_receivable * 0.35), color: "text-red-300" },
            { label: "Ù†Ø³Ø¨Ø© Ø§Ù„ØªØ­ØµÙŠÙ„", value: kpi.total_sales ? `${Math.round((kpi.total_collected / kpi.total_sales) * 100)}%` : "0%", color: "text-blue-700" },
          ].map((item) => (
            <GlassCard key={item.label} className="p-6 text-center flex flex-col gap-2">
              <span className="text-gray-600 text-sm">{item.label}</span>
              <span className={`text-2xl font-semibold ${item.color}`}>{typeof item.value === "number" ? `${item.value.toLocaleString()} Ø¯.Ùƒ` : item.value}</span>
            </GlassCard>
          ))}
        </section>
      )}

      <section className="max-w-6xl w-full">
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Ø§Ù„Ø°Ù…Ù… Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©</h2>
            <span className="text-gray-400 text-sm">{invoices.length} ÙØ§ØªÙˆØ±Ø©</span>
          </div>
          <div className="overflow-hidden rounded-2xl bg-black/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 backdrop-blur-xl">
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ù„ÙØ§ØªÙˆØ±Ø©</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ù„Ø¹Ù…ÙŠÙ„</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ù„Ù…Ø¨Ù„Øº</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ø³ØªØ­Ù‚Ø§Ù‚</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} className={i < invoices.length - 1 ? "border-b border-gray-200" : ""}>
                    <td className="px-6 py-4 text-gray-900">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-600">{inv.contact_name}</td>
                    <td className="px-6 py-4 text-gray-900">{inv.total_amount.toLocaleString()} Ø¯.Ùƒ</td>
                    <td className="px-6 py-4 text-gray-600">{inv.invoice_date}</td>
                    <td className="px-6 py-4 text-gray-600">{inv.due_date}</td>
                    <td className="px-6 py-4">{statusBadge(inv.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      <section className="max-w-6xl w-full">
        <GlassCard className="p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ† Ø§Ù„ØªÙØµÙŠÙ„ÙŠØ©</h2>
          <div className="overflow-hidden rounded-2xl bg-black/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 backdrop-blur-xl">
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ù„ÙØ§ØªÙˆØ±Ø©</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ù„Ø¹Ù…ÙŠÙ„</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">ØªØ£Ø®ÙŠØ±</th>
                  <th className="text-right px-6 py-4 text-gray-600 font-medium">Ø§Ù„ÙØ¦Ø©</th>
                </tr>
              </thead>
              <tbody>
                {agingRows.map((row, i) => (
                  <tr key={row.id} className={i < agingRows.length - 1 ? "border-b border-gray-200" : ""}>
                    <td className="px-6 py-4 text-gray-900">{row.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-600">{row.contact_name}</td>
                    <td className="px-6 py-4 text-gray-900">{row.outstanding.toLocaleString()} Ø¯.Ùƒ</td>
                    <td className="px-6 py-4 text-gray-600">{row.due_date}</td>
                    <td className="px-6 py-4 text-gray-600">{row.days_overdue} ÙŠÙˆÙ…</td>
                    <td className="px-6 py-4">{bucketBadge(row.bucket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      <section className="max-w-6xl w-full grid sm:grid-cols-2 gap-6">
        <GlassCard className="p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">ØªÙˆØ²ÙŠØ¹ Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ†</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={agingChart} barCategoryGap="30%">
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="value" name="Ø§Ù„Ù…Ø¨Ù„Øº" fill="#a78bfa" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Ø§ØªØ¬Ø§Ù‡ Ø§Ù„ØªØ­ØµÙŠÙ„ Ø§Ù„Ø´Ù‡Ø±ÙŠ</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyData}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Line type="monotone" dataKey="collected" name="Ù…Ø­ØµÙ„" stroke="#a78bfa" strokeWidth={2} dot={{ fill: "#a78bfa", r: 4 }} />
              <Line type="monotone" dataKey="outstanding" name="Ù…Ø¹Ù„Ù‚" stroke="#34d399" strokeWidth={2} dot={{ fill: "#34d399", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </section>

      <section className="max-w-6xl w-full grid sm:grid-cols-2 gap-6">
        <GlassCard className="p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Ø§Ù„Ù†Ø³Ø¨Ø© Ø§Ù„Ù…Ø¦ÙˆÙŠØ©</h2>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={140} paddingAngle={6} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-8 flex flex-col">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Ù…Ù„Ø®Øµ Ø³Ø±ÙŠØ¹</h2>
          <div className="flex-1 flex flex-col justify-center gap-5">
            {kpi && [
              { label: "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø°Ù…Ù… Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©", value: `${kpi.total_receivable.toLocaleString()} Ø¯.Ùƒ`, color: "text-gray-900" },
              { label: "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª", value: `${kpi.total_sales.toLocaleString()} Ø¯.Ùƒ`, color: "text-emerald-700" },
              { label: "Ø§Ù„Ø°Ù…Ù… Ø§Ù„Ø¯Ø§Ø¦Ù†Ø©", value: `${kpi.total_payable.toLocaleString()} Ø¯.Ùƒ`, color: "text-red-300" },
              { label: "Ø¹Ø¯Ø¯ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡", value: `${kpi.total_customers} Ø¹Ù…ÙŠÙ„`, color: "text-blue-700" },
              { label: "Ø§Ù„ÙÙˆØ§ØªÙŠØ± ØºÙŠØ± Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø©", value: `${kpi.unpaid_invoices} ÙØ§ØªÙˆØ±Ø©`, color: "text-amber-700" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-gray-600">{item.label}</span>
                <span className={`font-semibold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
