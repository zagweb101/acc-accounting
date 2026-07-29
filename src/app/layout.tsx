import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "ACC",
  description: "Ù†Ø¸Ø§Ù… Ù…Ø­Ø§Ø³Ø¨Ø© Ù…ØªÙƒØ§Ù…Ù„",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-white text-gray-900" style={{ fontFamily: "var(--font-cairo), sans-serif" }}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
