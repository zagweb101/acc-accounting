"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "فشل تسجيل الدخول"); }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-black/20 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white/90">ACC</h1>
          <p className="text-white/40 text-sm mt-1">تسجيل الدخول إلى النظام</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            value={username} onChange={e => setUsername(e.target.value)}
            placeholder="اسم المستخدم"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white/90 placeholder:text-white/30 outline-none focus:border-[#818cf8]/50 transition-all"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white/90 placeholder:text-white/30 outline-none focus:border-[#818cf8]/50 transition-all"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[#818cf8] text-white font-medium hover:bg-[#6366f1] disabled:opacity-50 transition-all"
          >
            {loading ? "...جاري" : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
