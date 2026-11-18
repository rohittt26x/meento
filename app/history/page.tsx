"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HistoryPage() {
  const [phone, setPhone] = useState("");
  const [recentTokens, setRecentTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    // Load from local storage
    const saved = JSON.parse(localStorage.getItem("meento_my_tokens") || "[]");
    setRecentTokens(saved);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      // In production, we'd query /api/tokens?phone=...
      // For MVP demo, load active tokens and filter by phone
      const res = await fetch("/api/queues");
      const data = await res.json();
      // Load recent from storage or feedback
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
          <Clock className="h-3.5 w-3.5 text-brand-600" />
          <span>Personal Queue Records</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Your Token History
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Review recent digital tokens issued on this device across campus queues.
        </p>
      </div>

      {recentTokens.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Recent Tokens On This Device
          </h2>

          <div className="divide-y divide-slate-100">
            {recentTokens.map((t, idx) => (
              <div
                key={idx}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-slate-900">
                      {t.tokenCode}
                    </span>
                    <span className="text-xs text-slate-500">&bull; {t.queueName}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {new Date(t.joinedAt).toLocaleString()}
                  </span>
                </div>

                <Link
                  href={`/token/${t.tokenId}`}
                  className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>View Status</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-base">No Tokens Issued Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When you join any campus queue, your digital token and real-time waiting status will appear here.
          </p>
          <Link
            href="/queues"
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition"
          >
            <span>Browse Active Queues</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
