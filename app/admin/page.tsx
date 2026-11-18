"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Clock,
  QrCode,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Sliders,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Printer,
  Copy,
  Check,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingQueueId, setUpdatingQueueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "queues" | "desks" | "analytics">("overview");

  // QR Modal
  const [selectedQr, setSelectedQr] = useState<{ name: string; uri: string; joinUrl: string } | null>(null);
  const [copiedQrLink, setCopiedQrLink] = useState(false);

  const loadAdminData = async () => {
    try {
      const [dashRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/dashboard"),
        fetch("/api/admin/analytics"),
      ]);
      const [dashJson, analyticsJson] = await analyticsRes.json(),
        dashData = await dashRes.json();

      if (dashData.success) {
        setData(dashData.data);
      }
      if (dashJson.success) {
        setAnalytics(dashJson.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const toggleQueueStatus = async (queueId: string, currentStatus: string) => {
    setUpdatingQueueId(queueId);
    const nextStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";

    try {
      const res = await fetch(`/api/queues/${queueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("meento_token") || ""}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        await loadAdminData();
      } else {
        alert(resJson.error || "Failed to update queue status");
      }
    } catch (e) {
      alert("Error updating queue status");
    } finally {
      setUpdatingQueueId(null);
    }
  };

  const openQrModal = async (queueId: string, queueName: string) => {
    try {
      const res = await fetch(`/api/queues/${queueId}/qr`);
      const resJson = await res.json();
      if (resJson.success) {
        setSelectedQr({
          name: queueName,
          uri: resJson.data.qrDataUri,
          joinUrl: resJson.data.joinUrl,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyPosterLink = () => {
    if (!selectedQr) return;
    navigator.clipboard.writeText(selectedQr.joinUrl);
    setCopiedQrLink(true);
    setTimeout(() => setCopiedQrLink(false), 2000);
  };

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading Operations Console...</p>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-navy-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-brand-300 uppercase tracking-wider">
              Central Administration Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            MIT ADT Campus Operations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time queue monitoring, counter throughput metrics, and dynamic wait times.
          </p>
        </div>

        <button
          onClick={() => loadAdminData()}
          className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-xs font-bold text-slate-200 border border-slate-700 transition flex items-center gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Currently Waiting</span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 mt-2 font-mono">
            {summary.waitingCount || 0}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">People in all lines</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Completed Today</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-2 font-mono">
            {summary.completedTodayCount || 0}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Customers served</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Active Desks</span>
            <Building2 className="h-4 w-4 text-brand-500" />
          </div>
          <div className="text-3xl font-black text-brand-600 mt-2 font-mono">
            {summary.activeCountersCount || 0} / {summary.totalCountersCount || 0}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Online service desks</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Avg. Service Duration</span>
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-purple-700 mt-2 font-mono">
            {summary.avgServiceMinutes || 4}m
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Rolling average</span>
        </div>
      </div>

      {/* Interactive Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "overview", label: "Queues & Posters" },
          { id: "desks", label: "Service Desks" },
          { id: "analytics", label: "Throughput Analytics" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Queue Controls & Posters */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-lg font-black text-slate-900">Active Queue Controls</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate venue entrance QR posters, or pause intake when capacity is reached.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.venues?.[0]?.queues?.map((q: any) => (
              <div
                key={q.id}
                className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                      Prefix: {q.prefix}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base">{q.name}</h3>
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-full uppercase ${
                        q.status === "OPEN"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Code: <strong className="font-mono text-slate-700">{q.code}</strong> &bull; People waiting:{" "}
                    <strong className="text-amber-600">{q._count?.entries || 0}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openQrModal(q.id, q.name)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition"
                  >
                    <QrCode className="h-4 w-4 text-brand-600" />
                    <span>View QR Poster</span>
                  </button>

                  <button
                    onClick={() => toggleQueueStatus(q.id, q.status)}
                    disabled={updatingQueueId === q.id}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      q.status === "OPEN"
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    }`}
                  >
                    <span>{q.status === "OPEN" ? "Pause Intake" : "Re-Open Queue"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Service Desks */}
      {activeTab === "desks" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-lg font-black text-slate-900">Service Desk Status</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical counter desks and assigned staff executives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data?.counters?.map((c: any) => (
              <div
                key={c.id}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                      Desk #{c.counterNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${
                        c.status === "OPEN"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.status === "BUSY"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-base">{c.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                  <span className="text-slate-400">Assigned Staff:</span>
                  <span className="font-bold text-slate-800">
                    {c.currentStaff?.name || "Unassigned"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Throughput Analytics */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 text-base">Desk Service Breakdown</h3>
              <p className="text-xs text-slate-400">Total completed consultations per desk</p>
            </div>

            <div className="space-y-4">
              {analytics?.counterThroughput?.map((ct: any) => (
                <div key={ct.counterId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{ct.counterName}</span>
                    <span className="font-black text-brand-600 font-mono">
                      {ct.completedCount} Served (~{ct.avgDurationMinutes}m avg)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-brand-600 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (ct.completedCount /
                            Math.max(1, analytics.performance.totalCompletedServices)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-900 text-base">Queue Status Breakdown</h3>
              <p className="text-xs text-slate-400">Total volume across state transitions</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Completed</span>
                <p className="text-2xl font-black text-emerald-800 font-mono mt-1">
                  {analytics?.statusCounts?.COMPLETED || 0}
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Waiting</span>
                <p className="text-2xl font-black text-amber-800 font-mono mt-1">
                  {analytics?.statusCounts?.WAITING || 0}
                </p>
              </div>

              <div className="p-3 bg-brand-50 rounded-2xl border border-brand-100">
                <span className="text-[10px] font-bold text-brand-700 uppercase">In Progress</span>
                <p className="text-2xl font-black text-brand-800 font-mono mt-1">
                  {(analytics?.statusCounts?.CALLED || 0) + (analytics?.statusCounts?.SERVING || 0)}
                </p>
              </div>

              <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                <span className="text-[10px] font-bold text-red-700 uppercase">No-Show / Cancel</span>
                <p className="text-2xl font-black text-red-800 font-mono mt-1">
                  {(analytics?.statusCounts?.NO_SHOW || 0) + (analytics?.statusCounts?.CANCELLED || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Poster Modal */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Venue Entrance Poster
              </span>
              <button
                onClick={() => setSelectedQr(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedQr.uri}
                alt="QR Poster"
                className="h-52 w-52 object-contain mx-auto"
              />
            </div>

            <h3 className="font-black text-slate-900 text-base">{selectedQr.name}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Print and place at queue entrance. Customers scan to get virtual tokens.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={copyPosterLink}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                {copiedQrLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedQrLink ? "Copied!" : "Copy Link"}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Poster</span>
              </button>
            </div>

            <button
              onClick={() => setSelectedQr(null)}
              className="mt-3 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
