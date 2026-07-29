"use client";

import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, subject, message }) });
      if (!r.ok) throw new Error("Failed to send");
      setSuccess("Message sent! We will get back to you soon.");
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch {
      setSuccess("");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center px-8 py-16 gap-16">
      <section className="max-w-3xl w-full">
        <GlassCard className="flex flex-col items-center text-center p-12 gap-6">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white/90">
            Get in Touch
          </h1>
          <p className="text-lg text-white/60 max-w-xl leading-relaxed">
            Have a project in mind? We would love to hear from you. Send us a message and we will respond as soon as possible.
          </p>
        </GlassCard>
      </section>

      <section className="max-w-4xl w-full grid sm:grid-cols-2 gap-6">
        <GlassCard className="p-8">
          <h2 className="text-2xl font-semibold text-white/90 mb-6">Send a Message</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-sm">Name</label>
                <GlassInput type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-sm">Email</label>
                <GlassInput type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white/60 text-sm">Subject</label>
              <GlassInput type="text" placeholder="How can we help?" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white/60 text-sm">Message</label>
              <textarea
                className="glass-input min-h-[120px] resize-none"
                placeholder="Tell us about your project..."
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              />
            </div>
            {success && <p className="text-emerald-300 text-sm">{success}</p>}
            <GlassButton type="submit" disabled={loading} className="mt-2 self-start">{loading ? "Sending..." : "Send Message"}</GlassButton>
          </form>
        </GlassCard>

        <div className="flex flex-col gap-6">
          <GlassCard className="p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center text-violet-300">@</div>
            <h3 className="text-white/90 font-semibold">Email</h3>
            <p className="text-white/60 text-sm">hello@acc.design</p>
          </GlassCard>
          <GlassCard className="p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-300">⌂</div>
            <h3 className="text-white/90 font-semibold">Location</h3>
            <p className="text-white/60 text-sm">San Francisco, CA</p>
          </GlassCard>
          <GlassCard className="p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">☏</div>
            <h3 className="text-white/90 font-semibold">Phone</h3>
            <p className="text-white/60 text-sm">+1 (555) 123-4567</p>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
