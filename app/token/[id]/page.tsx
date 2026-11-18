"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Sparkles,
  Users,
  Building2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Megaphone,
  Bell,
  BellRing,
  RotateCcw,
  ArrowLeft,
  Share2,
  Check,
  Volume2,
} from "lucide-react";

export default function TokenTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const tokenId = params.id as string;

  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [copiedLink, setCopiedLink] = useState(false);

  // Audio chime state
  const [audioEnabled, setAudioEnabled] = useState(true);
  const prevStatusRef = useRef<string | null>(null);
  const [calledAlert, setCalledAlert] = useState(false);

  // Play audio chime function
  const playAlertChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // audio context policy ignored
    }
  };

  const fetchTokenData = async () => {
    try {
      const res = await fetch(`/api/tokens/${tokenId}`);
      const data = await res.json();

      if (data.success) {
        const newToken = data.data;

        // Detect transition to CALLED
        if (
          prevStatusRef.current &&
          prevStatusRef.current !== "CALLED" &&
          newToken.status === "CALLED"
        ) {
          setCalledAlert(true);
          if (audioEnabled) {
            playAlertChime();
          }
        }

        prevStatusRef.current = newToken.status;
        setToken(newToken);
        setLastRefreshed(new Date());
      } else {
        setError(data.error || "Token not found");
      }
    } catch (err: any) {
      console.error("Token fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time short-polling every 3000ms
  useEffect(() => {
    fetchTokenData();
    const interval = setInterval(fetchTokenData, 3000);
    return () => clearInterval(interval);
  }, [tokenId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCancelToken = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/tokens/${tokenId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Customer cancelled from mobile token view" }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCancelModal(false);
        fetchTokenData();
      } else {
        alert(data.error || "Failed to cancel token");
      }
    } catch (err) {
      alert("Error cancelling token");
    } finally {
      setCancelling(false);
    }
  };

  if (loading && !token) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Connecting to Queue Engine...</p>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-3xl border border-red-200 shadow-sm text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Token Not Found</h2>
        <p className="text-xs text-slate-600 mt-2">{error || "Invalid token identifier"}</p>
        <Link
          href="/queues"
          className="mt-6 inline-block px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
        >
          View Active Queues
        </Link>
      </div>
    );
  }

  const isWaiting = token.status === "WAITING";
  const isCalled = token.status === "CALLED";
  const isServing = token.status === "SERVING";
  const isCompleted = token.status === "COMPLETED";
  const isCancelled = token.status === "CANCELLED";
  const isNoShow = token.status === "NO_SHOW";

  // Stepper Stage Calculation
  let currentStep = 1;
  if (isWaiting) currentStep = 2;
  if (isCalled) currentStep = 3;
  if (isServing) currentStep = 3;
  if (isCompleted) currentStep = 4;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/queues"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Queues</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Share/Copy link button */}
          <button
            onClick={handleCopyLink}
            title="Copy token link to open on phone"
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition flex items-center gap-1 text-[11px] font-semibold"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {/* Sound Preview Button */}
          <button
            onClick={() => {
              playAlertChime();
              setAudioEnabled(true);
            }}
            title="Test Turn Chime Alert"
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-brand-600 transition flex items-center gap-1 text-[11px] font-semibold"
          >
            <Volume2 className="h-3.5 w-3.5 text-brand-600" />
            <span className="hidden sm:inline">Test Alert</span>
          </button>
        </div>
      </div>

      {/* CALLED FLASH ALERT BANNER */}
      {(isCalled || calledAlert) && (
        <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-ai-600 text-white p-5 rounded-3xl shadow-2xl animate-pulse flex items-start gap-3.5">
          <Megaphone className="h-7 w-7 shrink-0 text-amber-300" />
          <div>
            <h3 className="font-black text-lg tracking-tight">IT&apos;S YOUR TURN!</h3>
            <p className="text-xs text-brand-100 mt-1 leading-relaxed">
              Please proceed immediately to{" "}
              <strong className="underline text-white font-black text-sm">
                {token.assignedCounter?.name || `Counter ${token.assignedCounter?.number || 1}`}
              </strong>.
            </p>
          </div>
        </div>
      )}

      {/* Main Digital Token Card */}
      <div
        className={`bg-white rounded-3xl border-2 p-6 sm:p-7 shadow-xl relative overflow-hidden transition-all ${
          isCalled
            ? "border-brand-500 ring-4 ring-brand-500/20"
            : isServing
            ? "border-emerald-500 ring-4 ring-emerald-500/20"
            : isCompleted
            ? "border-slate-300 opacity-95"
            : isCancelled || isNoShow
            ? "border-red-300 bg-red-50/30"
            : "border-slate-200"
        }`}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider block">
              {token.queue?.venueName || "Campus Service Centre"}
            </span>
            <h2 className="text-base font-black text-slate-900 mt-0.5">
              {token.queue?.name}
            </h2>
          </div>

          {/* Status Badge */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase ${
              isWaiting
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : isCalled
                ? "bg-brand-600 text-white animate-pulse"
                : isServing
                ? "bg-emerald-600 text-white"
                : isCompleted
                ? "bg-slate-200 text-slate-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {token.status}
          </span>
        </div>

        {/* Big Digital Token Code */}
        <div className="my-6 text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
            Your Digital Token
          </span>
          <div className="mt-1 text-5xl sm:text-6xl font-black text-slate-950 tracking-tight font-mono">
            {token.formattedCode}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Issued for <strong className="text-slate-800">{token.customerName}</strong>
          </p>
        </div>

        {/* Interactive Queue Progress Stepper */}
        <div className="my-6 py-3 px-2 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-slate-200 -z-0" />
            <div
              className="absolute left-6 top-3.5 h-0.5 bg-brand-600 transition-all -z-0"
              style={{
                width: `${
                  currentStep === 1
                    ? "0%"
                    : currentStep === 2
                    ? "33%"
                    : currentStep === 3
                    ? "66%"
                    : "100%"
                }`,
              }}
            />

            {[
              { step: 1, label: "Joined" },
              { step: 2, label: "In Line" },
              { step: 3, label: "Called" },
              { step: 4, label: "Completed" },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center relative z-10">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    currentStep >= s.step
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {currentStep > s.step ? "✓" : s.step}
                </div>
                <span
                  className={`text-[10px] mt-1 font-bold ${
                    currentStep >= s.step ? "text-brand-700" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Position & Dynamic ETA */}
        {isWaiting && (
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-center border-r border-slate-200">
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                Ahead of You
              </span>
              <div className="mt-1 flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-brand-600" />
                <span className="text-2xl font-black text-slate-900">
                  {token.positionAhead === 0 ? "You're Next!" : `${token.positionAhead} ahead`}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {token.positionAhead === 0 ? "Be ready at counter" : "Waiting in queue"}
              </span>
            </div>

            <div className="text-center">
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                Predicted Wait
              </span>
              <div className="mt-1 flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4 text-ai-500" />
                <span className="text-2xl font-black text-ai-600">
                  {token.estimatedWaitMinutes <= 0 ? "< 1 min" : `~${token.estimatedWaitMinutes} mins`}
                </span>
              </div>
              <span className="text-[10px] text-purple-600 font-bold block mt-0.5">
                Dynamic ETA
              </span>
            </div>
          </div>
        )}

        {/* Counter Assignment Banner when Called or Serving */}
        {(isCalled || isServing) && (
          <div className="bg-brand-50 border border-brand-200 p-4 rounded-2xl text-center">
            <span className="text-xs font-bold text-brand-800 uppercase tracking-wider block">
              Assigned Service Desk
            </span>
            <div className="text-xl font-black text-brand-900 mt-1">
              {token.assignedCounter?.name || `Counter ${token.assignedCounter?.number || 1}`}
            </div>
            <p className="text-xs text-brand-700 mt-1 font-medium">
              {isCalled
                ? "Show this screen to the counter staff executive."
                : "Consultation currently in progress."}
            </p>
          </div>
        )}

        {/* Completed State */}
        {isCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-1.5" />
            <h3 className="font-black text-emerald-900 text-sm">Service Completed</h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              Thank you for using Meento!
            </p>
          </div>
        )}

        {/* Cancelled / No-Show State */}
        {(isCancelled || isNoShow) && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-1.5" />
            <h3 className="font-black text-red-900 text-sm">
              {isCancelled ? "Token Cancelled" : "Marked No-Show"}
            </h3>
            <p className="text-xs text-red-700 mt-0.5">
              {token.cancellationReason || "This token is no longer active."}
            </p>
          </div>
        )}

        {/* Currently Serving Desk reference */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Currently Serving Desk:</span>
          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md">
            {token.currentlyServingCode}
          </span>
        </div>

        {/* Cancel Button */}
        {isWaiting && (
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-red-300 text-slate-500 hover:text-red-600 text-xs font-semibold transition"
            >
              Cancel My Token
            </button>
          </div>
        )}
      </div>

      {/* Auto-sync indicator footer */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
        <span>Live updates &bull; Refreshed at {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      </div>

      {/* Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 text-center shadow-2xl">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
            <h3 className="font-black text-slate-900 text-base">Cancel your token?</h3>
            <p className="text-xs text-slate-500 mt-1">
              You will forfeit your spot ({token.formattedCode}). You will have to re-join if you cancel.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Keep Token
              </button>
              <button
                onClick={handleCancelToken}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
