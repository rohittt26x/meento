"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Users,
  ShieldAlert,
  Clock,
  Sparkles,
  RotateCcw,
  QrCode,
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react";

export default function DemoNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<string>("CUSTOMER");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setCurrentRole("ADMIN");
    } else if (pathname.startsWith("/staff")) {
      setCurrentRole("STAFF");
    } else {
      setCurrentRole("CUSTOMER");
    }
  }, [pathname]);

  const switchRole = async (role: "CUSTOMER" | "STAFF" | "ADMIN", counterNum?: number) => {
    try {
      const res = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, counterNumber: counterNum || 1 }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("meento_token", data.token);
        localStorage.setItem("meento_user", JSON.stringify(data.user));
        setCurrentRole(role);

        if (role === "ADMIN") {
          router.push("/admin");
        } else if (role === "STAFF") {
          router.push(`/staff?counter=${counterNum || 1}`);
        } else {
          router.push("/queues");
        }
      }
    } catch (err) {
      console.error("Failed to switch role:", err);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm("Reset database to clean MIT ADT demo state?")) return;
    setIsResetting(true);
    try {
      const res = await fetch("/api/admin/reset-demo", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 3000);
        window.location.reload();
      }
    } catch (err) {
      alert("Failed to reset database");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-navy-900 border-b border-navy-800 text-white shadow-md">
      {/* Top Banner: Industrial Review Live Demo Controller */}
      <div className="bg-brand-950 px-4 py-1.5 text-xs border-b border-brand-900/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold text-brand-200 uppercase tracking-wider">
            Industrial Mentor Review Mode
          </span>
          <span className="text-gray-400 hidden sm:inline">|</span>
          <span className="text-gray-300 hidden md:inline">
            MIT ADT Campus Service Centre Demo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[11px]">Quick Switch:</span>
          <button
            onClick={() => switchRole("CUSTOMER")}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              currentRole === "CUSTOMER"
                ? "bg-brand-600 text-white"
                : "bg-navy-800 text-gray-300 hover:bg-navy-700"
            }`}
          >
            Customer
          </button>
          <button
            onClick={() => switchRole("STAFF", 1)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              pathname.includes("/staff") && pathname.includes("counter=1")
                ? "bg-brand-600 text-white"
                : "bg-navy-800 text-gray-300 hover:bg-navy-700"
            }`}
          >
            Staff Desk 1
          </button>
          <button
            onClick={() => switchRole("STAFF", 2)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              pathname.includes("/staff") && pathname.includes("counter=2")
                ? "bg-brand-600 text-white"
                : "bg-navy-800 text-gray-300 hover:bg-navy-700"
            }`}
          >
            Staff Desk 2
          </button>
          <button
            onClick={() => switchRole("ADMIN")}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              currentRole === "ADMIN"
                ? "bg-purple-600 text-white"
                : "bg-navy-800 text-gray-300 hover:bg-navy-700"
            }`}
          >
            Admin
          </button>
          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            title="Reset database to clean MIT ADT demo state"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-950/80 text-red-300 border border-red-800 hover:bg-red-900 transition"
          >
            <RotateCcw className={`h-3 w-3 ${isResetting ? "animate-spin" : ""}`} />
            {isResetting ? "Resetting..." : "Reset Data"}
          </button>
        </div>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-ai-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-white">MEENTO</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-ai-500/20 text-ai-300 border border-ai-500/30">
                AI Queue
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Ghanto Nahi, Meento.</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/queues"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              pathname === "/queues" || pathname.startsWith("/join")
                ? "bg-brand-600/30 text-brand-300 border border-brand-500/40"
                : "text-gray-300 hover:text-white hover:bg-navy-800"
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Join Queue</span>
          </Link>

          <Link
            href="/staff"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              pathname.startsWith("/staff")
                ? "bg-brand-600/30 text-brand-300 border border-brand-500/40"
                : "text-gray-300 hover:text-white hover:bg-navy-800"
            }`}
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Staff Desk</span>
          </Link>

          <Link
            href="/admin"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              pathname.startsWith("/admin")
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                : "text-gray-300 hover:text-white hover:bg-navy-800"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Ops</span>
          </Link>

          <Link
            href="/history"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              pathname === "/history"
                ? "bg-brand-600/30 text-brand-300 border border-brand-500/40"
                : "text-gray-300 hover:text-white hover:bg-navy-800"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Link>
        </nav>
      </div>

      {resetSuccess && (
        <div className="bg-emerald-600 text-white text-xs py-1 px-4 text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Demo state refreshed successfully with clean MIT ADT tokens and counters!</span>
        </div>
      )}
    </header>
  );
}
