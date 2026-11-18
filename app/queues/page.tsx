"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Clock,
  ArrowRight,
  QrCode,
  Search,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

export default function QueuesDiscoveryPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    async function loadQueues() {
      try {
        const res = await fetch("/api/queues");
        const json = await res.json();
        if (json.success) {
          setQueues(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadQueues();
  }, []);

  const filtered = queues.filter((q) => {
    const matchesSearch =
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.code.toLowerCase().includes(search.toLowerCase()) ||
      q.description?.toLowerCase().includes(search.toLowerCase());

    if (filterType === "ADMIN") return matchesSearch && q.prefix === "A";
    if (filterType === "PRINT") return matchesSearch && q.prefix === "X";
    if (filterType === "FOOD") return matchesSearch && q.prefix === "C";
    return matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold mb-2">
          <Building2 className="h-3.5 w-3.5" />
          <span>Active Campus Service Queues</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Select a Service Queue
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Join remotely from anywhere on campus, track your turn live, and avoid waiting in crowded physical lines.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, service or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: "ALL", label: "All" },
            { id: "ADMIN", label: "Administration" },
            { id: "PRINT", label: "Xerox / Printing" },
            { id: "FOOD", label: "Canteen Food" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                filterType === btn.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-semibold text-slate-400">Loading queues...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((q) => {
            const approxWaitMinutes =
              q.activeCountersCount > 0
                ? Math.max(
                    1,
                    Math.ceil(
                      (q.waitingCount * q.estimatedServiceTimeMinutes) /
                        q.activeCountersCount
                    )
                  )
                : 0;

            return (
              <div
                key={q.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                      Prefix: {q.prefix}
                    </span>
                    <span
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        q.status === "OPEN"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  <h2 className="text-xl font-black text-slate-900">{q.name}</h2>
                  <p className="text-xs text-brand-600 font-semibold mt-0.5">
                    {q.venue?.name} ({q.venue?.code})
                  </p>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    {q.description}
                  </p>

                  {/* Telemetry preview */}
                  <div className="mt-5 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Waiting
                      </span>
                      <span className="font-black text-base text-amber-600 font-mono">
                        {q.waitingCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Active Desks
                      </span>
                      <span className="font-black text-base text-brand-600 font-mono">
                        {q.activeCountersCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Approx. Wait
                      </span>
                      <span className="font-black text-base text-ai-600 font-mono">
                        ~{approxWaitMinutes}m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    Max throttle: {q.maxCapacity} tokens
                  </span>

                  <Link
                    href={`/join/${q.id}`}
                    className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Join Queue</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
