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
  { href: "/dashboard", label: "لوحة التحكم", icon: "◉", roles: ["owner", "accountant", "sales", "viewer"] },
  { href: "/accounts", label: "الحسابات", icon: "◰", roles: ["owner", "accountant", "viewer"] },
  { href: "/cost-centers", label: "مراكز التكلفة", icon: "⊞", roles: ["owner", "accountant", "viewer"] },
  { href: "/contacts", label: "جهات الاتصال", icon: "◉", roles: ["owner", "accountant", "sales", "viewer"] },
  { href: "/invoices", label: "الفواتير", icon: "⊡", roles: ["owner", "accountant", "sales", "viewer"] },
  { href: "/payments", label: "المدفوعات", icon: "◈", roles: ["owner", "accountant", "viewer"] },
  { href: "/aging", label: "التقادم", icon: "◇", roles: ["owner", "accountant", "viewer"] },
  { href: "/reports", label: "التقارير", icon: "▤", roles: ["owner", "accountant", "viewer"] },
  { href: "/items", label: "المنتجات", icon: "▣", roles: ["owner", "accountant", "viewer"] },
  { href: "/journal-entries", label: "قيد اليومية", icon: "⊟", roles: ["owner", "accountant", "viewer"] },
  { href: "/users", label: "المستخدمين", icon: "◉", roles: ["owner"] },
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
    <aside className="w-64 min-h-screen bg-white border-l border-gray-200 flex flex-col py-6 px-3 gap-1 fixed top-0 right-0 z-40">
      <div className="px-3 mb-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center text-white text-sm font-bold">A</div>
          <span className="text-gray-900 font-bold text-lg">ACC</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-[#eff6ff] text-[#2563eb] font-medium"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs ${
                isActive ? "bg-[#2563eb] text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6 px-3">
        <div className="text-xs text-gray-400 mb-3 truncate">{user?.name || ""}</div>
        <button
          onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/login"; }); }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-all"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
