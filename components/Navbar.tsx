"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Clock,
  QrCode,
  Users,
  LayoutDashboard,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Smartphone,
  ShieldCheck,
  User,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<string>("CUSTOMER");
  const [isResetting, setIsResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

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
    setShowRoleDropdown(false);
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

  const handleResetData = async () => {
    setShowRoleDropdown(false);
    if (!confirm("Reset database to clean default sample queues and tokens?")) return;
    setIsResetting(true);
    try {
      const res = await fetch("/api/admin/reset-demo", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResetNotice(true);
        setTimeout(() => setResetNotice(false), 3000);
        window.location.reload();
      }
    } catch (err) {
      alert("Failed to reset database");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-700 to-ai-600 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-brand-600 transition">
                MEENTO
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 -mt-0.5">
              Ghanto Nahi, Meento.
            </p>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/queues"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              pathname === "/queues" || pathname.startsWith("/join")
                ? "bg-brand-50 text-brand-700 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <QrCode className="h-4 w-4 text-brand-600" />
            <span>Find Queues</span>
          </Link>

          <Link
            href="/staff"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              pathname.startsWith("/staff")
                ? "bg-brand-50 text-brand-700 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="h-4 w-4 text-brand-600" />
            <span>Staff Counter Desk</span>
          </Link>

          <Link
            href="/admin"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              pathname.startsWith("/admin")
                ? "bg-purple-50 text-purple-700 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-purple-600" />
            <span>Admin Console</span>
          </Link>

          <Link
            href="/history"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              pathname === "/history"
                ? "bg-brand-50 text-brand-700 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Clock className="h-4 w-4 text-slate-500" />
            <span>My Tokens</span>
          </Link>
        </nav>

        {/* Right Section: Clean Interactive Role Switcher & Actions */}
        <div className="flex items-center gap-2">
          {/* Interactive Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition shadow-sm"
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  currentRole === "CUSTOMER"
                    ? "bg-brand-500"
                    : currentRole === "STAFF"
                    ? "bg-emerald-500"
                    : "bg-purple-500"
                }`}
              />
              <span className="hidden sm:inline text-slate-500">View as:</span>
              <span className="font-bold">
                {currentRole === "CUSTOMER"
                  ? "Customer"
                  : currentRole === "STAFF"
                  ? "Staff Desk"
                  : "Admin"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Switch Portal View
                </div>

                <button
                  onClick={() => switchRole("CUSTOMER")}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                    currentRole === "CUSTOMER" ? "text-brand-600 font-bold bg-brand-50/50" : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-brand-600" />
                    <span>Customer Portal</span>
                  </div>
                  {currentRole === "CUSTOMER" && <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />}
                </button>

                <button
                  onClick={() => switchRole("STAFF", 1)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                    pathname.includes("/staff") && pathname.includes("counter=1")
                      ? "text-brand-600 font-bold bg-brand-50/50"
                      : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-600" />
                    <span>Staff Desk 1 (Admissions)</span>
                  </div>
                </button>

                <button
                  onClick={() => switchRole("STAFF", 2)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                    pathname.includes("/staff") && pathname.includes("counter=2")
                      ? "text-brand-600 font-bold bg-brand-50/50"
                      : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-600" />
                    <span>Staff Desk 2 (Transcripts)</span>
                  </div>
                </button>

                <button
                  onClick={() => switchRole("ADMIN")}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                    currentRole === "ADMIN" ? "text-purple-600 font-bold bg-purple-50/50" : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <span>Admin Operations</span>
                  </div>
                  {currentRole === "ADMIN" && <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />}
                </button>

                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    onClick={handleResetData}
                    disabled={isResetting}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} />
                    <span>{isResetting ? "Resetting Data..." : "Reset Sample Data"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Join Mobile Action */}
          <Link
            href="/queues"
            className="md:hidden p-2 rounded-xl bg-brand-600 text-white"
            title="Join Queue"
          >
            <QrCode className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {resetNotice && (
        <div className="bg-emerald-600 text-white text-xs py-1 px-4 text-center flex items-center justify-center gap-2 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>Database reset to clean sample queues and tokens!</span>
        </div>
      )}
    </header>
  );
}
