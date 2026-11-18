"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  QrCode,
  Users,
  Sparkles,
  ArrowRight,
  Building2,
  CheckCircle2,
  Sliders,
  Search,
  Zap,
  Smartphone,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

interface HomeInteractiveProps {
  initialQueues: any[];
  venue: any;
  totalWaiting: number;
  totalCompleted: number;
  activeCounters: number;
}

export default function HomeInteractive({
  initialQueues,
  venue,
  totalWaiting,
  totalCompleted,
  activeCounters,
}: HomeInteractiveProps) {
  // Interactive Queue Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");

  // Interactive AI ETA Calculator Widget State
  const [simPeopleAhead, setSimPeopleAhead] = useState(5);
  const [simCounters, setSimCounters] = useState(2);
  const [simServiceTime, setSimServiceTime] = useState(4); // minutes per person

  // Dynamic ETA Calculation in real time
  const simTotalWorkload = simPeopleAhead * simServiceTime * 60;
  const simEffectiveCapacity = Math.max(1, simCounters);
  const simRawWaitSeconds = simTotalWorkload / simEffectiveCapacity;
  const simCalculatedMinutes = Math.max(
    1,
    Math.ceil((simRawWaitSeconds * 1.1) / 60)
  );

  // Filter queues based on search and category
  const filteredQueues = initialQueues.filter((q) => {
    const matchesSearch =
      q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedFilter === "ADMIN") {
      return matchesSearch && q.prefix === "A";
    }
    if (selectedFilter === "PRINT") {
      return matchesSearch && q.prefix === "X";
    }
    if (selectedFilter === "CANTEEN") {
      return matchesSearch && q.prefix === "C";
    }
    return matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-ai-500/15 border border-ai-400/30 text-ai-300 text-xs font-semibold mb-6">
            <Sparkles className="h-4 w-4 text-ai-400 animate-pulse" />
            <span>Smart Queue Management &bull; Instant Virtual Tokens</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Ghanto Nahi,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-cyan-300 to-ai-400">
              Meento.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Join physical queues remotely with your smartphone. Track your live turn.
            Know exactly when to arrive without standing in crowded lines.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/queues"
              className="px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-500/30 flex items-center gap-2 transition hover:-translate-y-0.5"
            >
              <QrCode className="h-5 w-5" />
              <span>Join a Queue Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/staff"
              className="px-6 py-3.5 rounded-2xl bg-navy-800/90 hover:bg-navy-700 text-slate-200 font-bold text-sm border border-slate-700/80 flex items-center gap-2 transition hover:-translate-y-0.5"
            >
              <Users className="h-5 w-5 text-brand-400" />
              <span>Staff Counter Desk</span>
            </Link>

            <Link
              href="/admin"
              className="px-6 py-3.5 rounded-2xl bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 font-bold text-sm border border-purple-700/60 flex items-center gap-2 transition hover:-translate-y-0.5"
            >
              <TrendingUp className="h-5 w-5 text-ai-400" />
              <span>Admin Analytics</span>
            </Link>
          </div>

          {/* Real-time stats ticker */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-navy-800/80 backdrop-blur border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Currently Waiting</span>
              <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                {totalWaiting} People
              </p>
            </div>
            <div className="bg-navy-800/80 backdrop-blur border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Completed Today</span>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {totalCompleted} Served
              </p>
            </div>
            <div className="bg-navy-800/80 backdrop-blur border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Active Desks</span>
              <p className="text-2xl font-black text-brand-400 mt-1 font-mono">
                {activeCounters} Online
              </p>
            </div>
            <div className="bg-navy-800/80 backdrop-blur border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Average Wait Time</span>
              <p className="text-2xl font-black text-ai-300 mt-1 font-mono">
                ~4 mins
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 w-full mb-16 space-y-12">
        {/* Interactive Queue Explorer Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand-600" />
                <h2 className="text-xl font-black text-slate-900">
                  {venue?.name || "Campus Service Centre"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  OPEN NOW
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {venue?.address || "Main Campus Building, Ground Floor"}
              </p>
            </div>

            {/* Live Search Input */}
            <div className="w-full md:w-72 relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search queues or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 my-5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold mr-1">Filter:</span>
            {[
              { id: "ALL", label: "All Queues" },
              { id: "ADMIN", label: "Student Administration" },
              { id: "PRINT", label: "Xerox & Printing" },
              { id: "CANTEEN", label: "Canteen Food Pickup" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                  selectedFilter === f.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Queues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredQueues.length > 0 ? (
              filteredQueues.map((q) => (
                <div
                  key={q.id}
                  className="border border-slate-200 hover:border-brand-500 rounded-2xl p-5 transition bg-slate-50/40 hover:bg-white hover:shadow-lg flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                        Prefix: {q.prefix}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Code: {q.code}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-brand-600 transition">
                      {q.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {q.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        In Queue
                      </span>
                      <span className="font-black text-sm text-slate-900">
                        {q._count?.entries || 0} Waiting
                      </span>
                    </div>

                    <Link
                      href={`/join/${q.id}`}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Join Queue</span>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 py-10 text-center text-slate-400 text-xs">
                No queues match your search query. Try another term.
              </div>
            )}
          </div>
        </div>

        {/* INTERACTIVE AI WAIT-TIME SIMULATOR CARD */}
        <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Interactive Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ai-500/20 text-ai-300 text-xs font-bold border border-ai-500/30">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Interactive AI Wait-Time Simulator</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                See How Meento Predicts Your Turn
              </h2>
              <p className="text-xs sm:text-sm text-purple-200 leading-relaxed max-w-lg">
                Drag the sliders below to see how active counter desks and queue load dynamically affect estimated wait times in real time.
              </p>

              {/* Slider 1: People Ahead */}
              <div className="space-y-1.5 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between text-xs font-bold text-slate-200">
                  <span>Customers Ahead in Line:</span>
                  <span className="text-amber-400 font-mono text-sm">
                    {simPeopleAhead} people
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={simPeopleAhead}
                  onChange={(e) => setSimPeopleAhead(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-2 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 2: Active Counters */}
              <div className="space-y-1.5 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex justify-between text-xs font-bold text-slate-200">
                  <span>Operating Service Desks:</span>
                  <span className="text-brand-300 font-mono text-sm">
                    {simCounters} active desks
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={simCounters}
                  onChange={(e) => setSimCounters(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-400 h-2 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Right: Live ETA Output Gauge */}
            <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center shadow-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Predicted Wait Time
              </span>

              <div className="my-3">
                <span className="text-6xl font-black text-white font-mono tracking-tight">
                  ~{simCalculatedMinutes}
                </span>
                <span className="text-2xl font-bold text-purple-300 ml-1">mins</span>
              </div>

              <div className="text-xs text-purple-200 bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="flex justify-between">
                  <span>Workload Ahead:</span>
                  <span className="font-mono">{simTotalWorkload / 60} min total work</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Throughput:</span>
                  <span className="font-mono">{simCounters}x parallel capacity</span>
                </div>
              </div>

              <p className="text-[11px] text-purple-300/80 mt-3">
                Accurate mathematical model based on rolling exponential averages and counter capacity.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Step Walkthrough */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold mb-4">
              1
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Scan or Join Online</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Scan the physical venue QR poster or pick a service online. Receive your unique digital token in seconds without downloading any app.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="h-10 w-10 rounded-xl bg-ai-50 flex items-center justify-center text-ai-600 font-bold mb-4">
              2
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Track Position Live</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Watch your spot advance in real time on your phone. See exactly how many people are ahead and the predicted arrival time.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold mb-4">
              3
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Walk In When Called</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your device notifies you with sound when your token is called to a specific counter. Walk right up for immediate service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
