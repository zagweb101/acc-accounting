"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { setupGlobalFetch } from "@/lib/api-client";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/login";
  const [checking, setChecking] = useState(!isAuthPage);

  useEffect(() => {
    setupGlobalFetch();
    function onExpired() { router.replace("/login"); }
    window.addEventListener("auth:expired", onExpired);
    if (isAuthPage) { setChecking(false); return () => window.removeEventListener("auth:expired", onExpired); }
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.user) { router.replace("/login"); return; }
      setChecking(false);
    }).catch(() => { router.replace("/login"); });
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [isAuthPage, router]);

  if (isAuthPage) {
    return <div className="min-h-screen flex bg-white text-gray-900">{children}</div>;
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">
        <div className="animate-pulse">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      <Sidebar />
      <div className="flex-1 mr-64 min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-gray-200 mx-0 px-8 py-4 text-center text-gray-400 text-sm bg-white">
          &copy; {new Date().getFullYear()} ACC. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
