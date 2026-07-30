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
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">ACC</h1>
          <p className="text-gray-400 text-sm mt-1">تسجيل الدخول إلى النظام</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            value={username} onChange={e => setUsername(e.target.value)}
            placeholder="اسم المستخدم"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-300 outline-none focus:border-[#2563eb]/50 transition-all"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-300 outline-none focus:border-[#2563eb]/50 transition-all"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[#2563eb] text-white font-medium hover:bg-[#2563eb] disabled:opacity-50 transition-all"
          >
            {loading ? "...جاري" : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
