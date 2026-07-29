import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import BackgroundLights from "@/components/BackgroundLights";
import ClientShell from "@/components/ClientShell";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "ACC",
  description: "نظام محاسبة متكامل",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-[#0c0c10] text-white" style={{ fontFamily: "var(--font-cairo), sans-serif" }}>
        <BackgroundLights />
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
