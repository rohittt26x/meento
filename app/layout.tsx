import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "MEENTO | Smart Queue & Virtual Token Platform",
  description:
    "Ghanto Nahi, Meento. Remote QR queue-joining, real-time token tracking, and AI wait-time estimation for campus and enterprise services.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800">MEENTO</span>
              <span>&bull;</span>
              <span>Smart Queue Management &amp; Virtual Token Platform</span>
            </div>
            <div className="text-slate-400">
              &quot;Ghanto Nahi, Meento.&quot; &bull; Because Waiting Shouldn&apos;t Waste Time.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
