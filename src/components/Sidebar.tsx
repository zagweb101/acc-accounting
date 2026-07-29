"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UserInfo } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: string[];
}

const allItems: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "◆", roles: ["owner", "accountant", "sales", "viewer"] },
  { href: "/accounts", label: "الحسابات", icon: "▣", roles: ["owner", "accountant", "viewer"] },
  { href: "/cost-centers", label: "مراكز التكلفة", icon: "⏔", roles: ["owner", "accountant", "viewer"] },
  { href: "/contacts", label: "جهات الاتصال", icon: "☰", roles: ["owner", "accountant", "sales", "viewer"] },
  { href: "/invoices", label: "الفواتير", icon: "📄", roles: ["owner", "accountant", "sales", "viewer"] },
  { href: "/payments", label: "المدفوعات", icon: "💰", roles: ["owner", "accountant", "viewer"] },
  { href: "/aging", label: "التقادم", icon: "⏳", roles: ["owner", "accountant", "viewer"] },
  { href: "/reports", label: "التقارير", icon: "📊", roles: ["owner", "accountant", "viewer"] },
  { href: "/items", label: "المنتجات", icon: "📦", roles: ["owner", "accountant", "viewer"] },
  { href: "/journal-entries", label: "قيد اليومية", icon: "📝", roles: ["owner", "accountant", "viewer"] },
  { href: "/users", label: "المستخدمين", icon: "👥", roles: ["owner"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
    }).catch(() => {});
  }, []);

  const items = allItems.filter(i => user ? i.roles.includes(user.role) : false);

  return (
    <aside className="w-64 min-h-screen bg-black/20 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col py-8 px-4 gap-2 fixed top-0 right-0 z-40">
      <div className="px-3 mb-8">
        <Link href="/dashboard" className="text-white/90 font-semibold tracking-tight text-xl">
          ACC
        </Link>
        <p className="text-white/40 text-xs mt-1">{user?.name || ""}</p>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? "bg-white/[0.08] border border-white/[0.1] text-white/90"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 pt-8 flex flex-col gap-2">
        <button
          onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/login"; }); }}
          className="text-white/40 hover:text-white/70 text-xs text-right transition-all"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
