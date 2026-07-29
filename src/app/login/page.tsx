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
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "ÙØ´Ù„ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„"); }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ø­Ø¯Ø« Ø®Ø·Ø£");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">ACC</h1>
          <p className="text-gray-500 text-sm mt-1">ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø¥Ù„Ù‰ Ø§Ù„Ù†Ø¸Ø§Ù…</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100 transition-all"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100 transition-all"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 disabled:opacity-50 transition-all"
          >
            {loading ? "...Ø¬Ø§Ø±ÙŠ" : "ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„"}
          </button>
        </form>
      </div>
    </div>
  );
}
