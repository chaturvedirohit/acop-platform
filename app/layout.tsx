import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACOP — Agentic Customer Operations Platform",
  description: "AI-powered customer support operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
