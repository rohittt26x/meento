"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  QrCode,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Printer,
  ChevronLeft,
} from "lucide-react";

export default function QueueJoinPage() {
  const router = useRouter();
  const params = useParams();
  const queueId = params.queueId as string;

  const [queueData, setQueueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // QR Code preview toggle
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUri, setQrDataUri] = useState<string | null>(null);

  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await fetch(`/api/queues/${queueId}`);
        const data = await res.json();
        if (data.success) {
          setQueueData(data.data);
        } else {
          setError(data.error || "Failed to load queue details");
        }
      } catch (err) {
        setError("Network error connecting to queue system");
      } finally {
        setLoading(false);
      }
    }
    loadQueue();
  }, [queueId]);

  const loadQrCode = async () => {
    try {
      const res = await fetch(`/api/queues/${queueId}/qr`);
      const data = await res.json();
      if (data.success) {
        setQrDataUri(data.data.qrDataUri);
        setShowQrModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!customerPhone.trim() || customerPhone.length < 5) {
      setError("Please enter a valid phone number");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/queues/${queueId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerPhone }),
      });
      const data = await res.json();

      if (data.success) {
        // Save token to localStorage for history lookup
        const historyTokens = JSON.parse(
          localStorage.getItem("meento_my_tokens") || "[]"
        );
        historyTokens.unshift({
          tokenId: data.data.tokenId,
          tokenCode: data.data.formattedCode,
          queueName: data.data.queueName,
          joinedAt: new Date().toISOString(),
        });
        localStorage.setItem(
          "meento_my_tokens",
          JSON.stringify(historyTokens.slice(0, 10))
        );

        router.push(`/token/${data.data.tokenId}`);
      } else {
        if (data.existingTokenId) {
          setError(
            `${data.error} Click below to open your current active token.`
          );
        } else {
          setError(data.error || "Failed to join queue");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to join queue");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Connecting to Queue...</p>
      </div>
    );
  }

  if (error && !queueData) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-red-200 shadow-sm text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Queue Unavailable</h2>
        <p className="text-sm text-slate-600 mt-2">{error}</p>
        <Link
          href="/queues"
          className="mt-6 inline-block px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold"
        >
          Browse All Queues
        </Link>
      </div>
    );
  }

  const waitingCount = queueData?.waitingCount || 0;
  const isHighTraffic = waitingCount > 10;
  const isModerate = waitingCount >= 4 && waitingCount <= 10;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/queues"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to All Queues</span>
        </Link>
      </div>

      {/* Queue Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 mb-1">
              <Building2 className="h-4 w-4" />
              <span>{queueData.venue?.name || "Campus Service Centre"}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {queueData.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Queue Code: <span className="font-mono font-bold text-slate-700">{queueData.code}</span> &bull; Token Prefix: <span className="font-bold text-brand-600">{queueData.prefix}</span>
            </p>
          </div>

          <button
            onClick={loadQrCode}
            title="View printable QR Code poster"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <QrCode className="h-4 w-4 text-brand-600" />
            <span className="hidden sm:inline">QR Poster</span>
          </button>
        </div>

        {queueData.description && (
          <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-relaxed">
            {queueData.description}
          </p>
        )}

        {/* Live Traffic Meter */}
        <div className="mt-4 grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Queue Status
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isHighTraffic
                    ? "bg-amber-500"
                    : isModerate
                    ? "bg-brand-500"
                    : "bg-emerald-500"
                }`}
              />
              <span className="text-sm font-bold text-slate-900">
                {waitingCount} People Waiting
              </span>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Estimated Wait
            </span>
            <span className="text-sm font-black text-ai-600 mt-0.5 block">
              ~{Math.max(1, waitingCount * queueData.estimatedServiceTimeMinutes)} mins
            </span>
          </div>
        </div>
      </div>

      {/* Join Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-black text-slate-900">
            Get Your Digital Token
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your details to receive an instant live virtual token on your screen.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Your Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rohit Shinde"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. +91 98220 12345"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used to keep your token unique and alert you when your turn arrives.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || queueData.status !== "OPEN"}
            className="w-full mt-4 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Token...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Issue My Digital Token</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Real-time digital token with live position updates</span>
        </div>
      </div>

      {/* QR Code Modal for Physical Poster */}
      {showQrModal && qrDataUri && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Venue Entrance Poster
              </span>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUri}
                alt="Queue QR Code"
                className="h-48 w-48 object-contain mx-auto"
              />
            </div>

            <h3 className="font-extrabold text-slate-900 text-base">{queueData.name}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Visitors scan with their phone camera to join this queue remotely.
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
