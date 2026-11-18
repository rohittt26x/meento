"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Megaphone,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Play,
  RotateCw,
  Building2,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Volume2,
  Search,
} from "lucide-react";

function StaffDashboardContent() {
  const searchParams = useSearchParams();
  const counterParam = searchParams.get("counter");
  const selectedCounterNum = counterParam ? parseInt(counterParam, 10) : 1;

  const [counters, setCounters] = useState<any[]>([]);
  const [selectedCounterId, setSelectedCounterId] = useState<string>("");
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serviceNotes, setServiceNotes] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // Elapsed consultation stopwatch timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Staff identity based on selected counter
  const staffName =
    selectedCounterNum === 2 ? "Amit Verma (Desk 2)" : "Priya Sharma (Desk 1)";

  // Sound chime function
  const playCallChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // audio context ignored
    }
  };

  const loadData = async () => {
    try {
      const countersRes = await fetch("/api/counters");
      const countersJson = await countersRes.json();
      if (countersJson.success) {
        setCounters(countersJson.data);
        const match =
          countersJson.data.find(
            (c: any) => c.counterNumber === selectedCounterNum
          ) || countersJson.data[0];

        if (match && (!selectedCounterId || selectedCounterId === "")) {
          setSelectedCounterId(match.id);
        }
      }

      // Fetch primary queue status
      const qRes = await fetch("/api/queues");
      const qJson = await qRes.json();
      if (qJson.success && qJson.data.length > 0) {
        const primaryQueue = qJson.data[0];
        const statusRes = await fetch(`/api/queues/${primaryQueue.id}/status`);
        const statusJson = await statusRes.json();
        if (statusJson.success) {
          setQueueStatus(statusJson.data);
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2500);
    return () => clearInterval(interval);
  }, [selectedCounterNum]);

  const activeCounter = counters.find((c) => c.id === selectedCounterId);
  const activeToken = activeCounter?.activeToken;

  // Stopwatch timer when SERVING
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeToken && activeToken.status === "SERVING") {
      const start = activeToken.servedAt ? new Date(activeToken.servedAt).getTime() : Date.now();
      const updateElapsed = () => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      };
      updateElapsed();
      timer = setInterval(updateElapsed, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeToken]);

  const handleCallNext = async () => {
    if (!selectedCounterId) return;
    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/counters/${selectedCounterId}/call-next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueId: queueStatus?.queueId,
          staffId: activeCounter?.currentStaff?.id || "demo-staff",
        }),
      });
      const data = await res.json();
      if (data.success) {
        playCallChime();
        setSuccessMessage(`Called token ${data.token.formattedCode} to Counter ${activeCounter?.counterNumber}!`);
        await loadData();
      } else {
        setErrorMessage(data.error || "Failed to call next token");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to call next token");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartServing = async () => {
    if (!selectedCounterId) return;
    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/counters/${selectedCounterId}/serve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: activeToken?.id,
          staffId: activeCounter?.currentStaff?.id || "demo-staff",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Consultation initiated for token ${data.token.formattedCode}`);
        await loadData();
      } else {
        setErrorMessage(data.error || "Failed to start service");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start service");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async () => {
    if (!selectedCounterId) return;
    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/counters/${selectedCounterId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: activeToken?.id,
          staffId: activeCounter?.currentStaff?.id || "demo-staff",
          notes: serviceNotes || "Service consultation completed successfully",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(
          `Service completed in ${Math.round(data.durationSeconds / 60)}m (${data.durationSeconds}s). Counter is now OPEN!`
        );
        setServiceNotes("");
        await loadData();
      } else {
        setErrorMessage(data.error || "Failed to complete service");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete service");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (!selectedCounterId) return;
    if (!confirm("Are you sure you want to mark this customer as NO-SHOW?")) return;

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/counters/${selectedCounterId}/no-show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: activeToken?.id,
          staffId: activeCounter?.currentStaff?.id || "demo-staff",
          reason: "Customer did not report after multiple announcements",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Token ${data.token.formattedCode} marked as NO-SHOW.`);
        await loadData();
      } else {
        setErrorMessage(data.error || "Failed to mark no-show");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to mark no-show");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter waiting list
  const filteredWaiting = (queueStatus?.waitingList || []).filter((entry: any) =>
    entry.customerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    entry.formattedCode.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner: Desk Selector */}
      <div className="bg-navy-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-brand-300 uppercase tracking-wider">
              Staff Counter Portal
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">
            {activeCounter?.name || `Counter ${selectedCounterNum}`}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active Staff: <strong className="text-slate-200">{staffName}</strong> &bull; MIT ADT Campus Service Centre
          </p>
        </div>

        {/* Counter Selection Tabs */}
        <div className="flex items-center gap-2 bg-navy-800 p-1.5 rounded-2xl border border-navy-700">
          <span className="text-xs text-slate-400 px-2 font-medium">Switch Desk:</span>
          {counters.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCounterId(c.id);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                selectedCounterId === c.id
                  ? "bg-brand-600 text-white shadow-md shadow-brand-500/30"
                  : "bg-navy-900 text-slate-300 hover:bg-navy-700"
              }`}
            >
              <span>Desk {c.counterNumber}</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  c.status === "OPEN"
                    ? "bg-emerald-400"
                    : c.status === "BUSY"
                    ? "bg-amber-400"
                    : "bg-slate-400"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="font-semibold">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="font-bold">{successMessage}</div>
        </div>
      )}

      {/* Main Grid: Action Console & Waiting Line */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Action Console */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-black text-slate-900">Desk Operations</h2>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  activeCounter?.status === "OPEN"
                    ? "bg-emerald-100 text-emerald-800"
                    : activeCounter?.status === "BUSY"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Status: {activeCounter?.status || "OPEN"}
              </span>
            </div>

            {/* If there is an active token assigned to this counter */}
            {activeToken ? (
              <div className="my-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-semibold">Active Customer</span>
                    <span
                      className={`font-black px-2.5 py-0.5 rounded text-[11px] uppercase ${
                        activeToken.status === "CALLED"
                          ? "bg-brand-100 text-brand-800 animate-pulse"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {activeToken.status}
                    </span>
                  </div>

                  <div className="text-5xl font-black font-mono text-slate-950 tracking-tight my-2">
                    {activeToken.formattedCode}
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900">
                    {activeToken.customerName}
                  </h3>
                  <p className="text-xs text-slate-500">{activeToken.customerPhone}</p>

                  {/* Stopwatch Timer while serving */}
                  {activeToken.status === "SERVING" && (
                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-center gap-2 text-emerald-700 font-mono text-sm font-bold">
                      <Clock className="h-4 w-4 animate-spin text-emerald-600" />
                      <span>
                        Time Elapsed: {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
                      </span>
                    </div>
                  )}

                  {/* Status subtitle */}
                  <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Current Phase</span>
                    <span className="font-semibold text-brand-600">
                      {activeToken.status === "CALLED"
                        ? "Waiting for student to reach the counter..."
                        : "Consultation in progress"}
                    </span>
                  </div>
                </div>

                {/* State Machine Transition Controls */}
                <div className="mt-6 space-y-3">
                  {activeToken.status === "CALLED" && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleStartServing}
                        disabled={actionLoading}
                        className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Customer Arrived (Start)</span>
                      </button>

                      <button
                        onClick={handleMarkNoShow}
                        disabled={actionLoading}
                        className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Mark No-Show</span>
                      </button>
                    </div>
                  )}

                  {activeToken.status === "SERVING" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Consultation Resolution / Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={serviceNotes}
                          onChange={(e) => setServiceNotes(e.target.value)}
                          placeholder="e.g. Bonafide verified and fee receipt stamped"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={handleCompleteService}
                        disabled={actionLoading}
                        className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Complete Service &amp; Free Desk</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* When Desk is Free */
              <div className="my-8 text-center py-8">
                <div className="h-16 w-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mx-auto mb-3 shadow-inner">
                  <Megaphone className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Desk is Ready</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Click below to fetch and announce the next eligible customer waiting in line.
                </p>

                <div className="mt-6">
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading || queueStatus?.waitingCount === 0}
                    className="py-4 px-8 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-black text-base shadow-xl shadow-brand-500/30 inline-flex items-center gap-3 transition hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <Megaphone className="h-5 w-5 animate-pulse" />
                    <span>
                      {actionLoading
                        ? "Calling Next..."
                        : queueStatus?.waitingCount === 0
                        ? "No Customers Waiting"
                        : "CALL NEXT CUSTOMER"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Waiting Line List */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Waiting Line ({queueStatus?.waitingCount || 0})
                </h3>
                <p className="text-xs text-slate-500">
                  {queueStatus?.queueName || "Student Administration Queue"}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <RotateCw className="h-3 w-3 animate-spin text-brand-500" />
                <span>Auto-refresh</span>
              </div>
            </div>

            {/* Quick Filter Search */}
            <div className="my-3 relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search waiting student..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Waiting List */}
            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
              {filteredWaiting.length > 0 ? (
                filteredWaiting.map((entry: any, idx: number) => (
                  <div
                    key={entry.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center font-mono">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {entry.formattedCode}
                          </span>
                          {entry.priority > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                              PRIORITY
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          {entry.customerName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      <span>{new Date(entry.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <span>No customers currently in line.</span>
                </div>
              )}
            </div>

            {/* ETA summary */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>Queue Estimated Wait:</span>
              </span>
              <span className="font-bold text-purple-700">
                ~{queueStatus?.averageWaitMinutes || 0} mins
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
          <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading Desk Console...</p>
        </div>
      }
    >
      <StaffDashboardContent />
    </Suspense>
  );
}
