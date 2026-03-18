import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, AlertCircle,
  User, Calendar, Star, FileText, MessageSquare,
  PenTool, ImageIcon, X, Download, Maximize2, Eye,
  Video, Play, Pause, Volume2, VolumeX, Maximize,
  Film, Paperclip,
} from "lucide-react";
import { checklistService } from "../services/checklistService";
import { toast } from "sonner";

interface ValidationScreenProps {
  submissionId: string;
  onBack: () => void;
  onValidated?: () => void;
}

// ─── Video lightbox ────────────────────────────────────────────────────────────
function VideoLightbox({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [muted,   setMuted]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, playing]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = name;
    a.click();
  };

  const openNative = () => {
    if (videoRef.current) videoRef.current.requestFullscreen?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-gray-950 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <Film className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-sm font-medium text-white truncate max-w-xs">{name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Download"
              onClick={download}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Full screen"
              onClick={openNative}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Maximize className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Close (Esc)"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video element */}
        <div
          className="relative bg-black flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
          style={{ minHeight: 280 }}
        >
          <video
            ref={videoRef}
            src={src}
            className="w-full max-h-[55vh] object-contain"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={() => setPlaying(false)}
            playsInline
          />

          {/* Centre play/pause overlay */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 shadow-xl">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="bg-gray-900 px-4 pb-4 pt-3 space-y-2">
          {/* Progress */}
          <div
            className="w-full h-1.5 bg-gray-700 rounded-full cursor-pointer group"
            onClick={seek}
          >
            <div
              className="h-full bg-teal-400 rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Buttons + time */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 bg-teal-500 hover:bg-teal-400 rounded-full flex items-center justify-center transition-colors shadow"
            >
              {playing
                ? <Pause className="w-4 h-4 text-white fill-white" />
                : <Play  className="w-4 h-4 text-white fill-white ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
            >
              {muted
                ? <VolumeX className="w-4 h-4" />
                : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="text-xs text-gray-400 ml-auto tabular-nums">
              {duration
                ? `${formatTime((progress / 100) * duration)} / ${formatTime(duration)}`
                : "0:00"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Video thumbnail card ──────────────────────────────────────────────────────
function VideoThumbnail({ value, label }: { value: any; label: string }) {
  const [open, setOpen] = useState(false);

  // value can be { name, size, type, dataUrl } or a plain data/http URL string
  const src  = typeof value === "string" ? value : value?.dataUrl ?? "";
  const name = typeof value === "string" ? label  : value?.name  ?? label;
  const size = typeof value === "object" && value?.size
    ? value.size < 1024 * 1024
      ? `${(value.size / 1024).toFixed(1)} KB`
      : `${(value.size / (1024 * 1024)).toFixed(1)} MB`
    : null;

  if (!src) return <span className="text-xs text-gray-400 italic">No video data</span>;

  return (
    <>
      {/* Thumbnail */}
      <div
        className="group relative inline-flex flex-col gap-2 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <div className="relative w-72 max-w-full rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-teal-400 transition-all shadow-sm group-hover:shadow-md bg-gray-900">
          {/* Poster: just a dark bg with a big play icon since we can't easily generate video thumbnails from data URLs */}
          <div className="h-40 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 bg-teal-500/20 border border-teal-400/30 rounded-full flex items-center justify-center group-hover:bg-teal-500/40 transition-all">
              <Play className="w-6 h-6 text-teal-300 fill-teal-300 ml-0.5" />
            </div>
            <p className="text-xs text-gray-400">Click to play</p>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-teal-400/0 group-hover:bg-teal-400/10 transition-all rounded-xl" />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          <span className="text-xs text-gray-600 font-medium truncate max-w-[220px]">{name}</span>
          {size && <span className="text-xs text-gray-400 shrink-0">· {size}</span>}
        </div>
      </div>

      {open && <VideoLightbox src={src} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Image / Signature lightbox ───────────────────────────────────────────────
function ImageLightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const download = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `${label.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={download} title="Download"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} title="Close"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="bg-[#f8f8f8] flex items-center justify-center p-6 min-h-[300px]">
          <img src={src} alt={label}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
            style={{ imageRendering: "crisp-edges" }} />
        </div>
        <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">Click outside or press Esc to close</p>
          <button type="button" onClick={download}
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Image / Signature thumbnail ──────────────────────────────────────────────
function MediaThumbnail({ src, label, type }: { src: string; label: string; type: "signature" | "image" }) {
  const [open, setOpen] = useState(false);
  if (!src.startsWith("data:") && !src.startsWith("http")) {
    return <span className="text-xs text-gray-400 italic">Invalid media</span>;
  }
  return (
    <>
      <div className="group relative inline-flex flex-col gap-2 cursor-pointer" onClick={() => setOpen(true)}>
        <div className={`relative rounded-xl border-2 border-gray-200 group-hover:border-teal-400 overflow-hidden transition-all shadow-sm group-hover:shadow-md bg-white`}>
          <img src={src} alt={label}
            className={`block object-contain transition-transform group-hover:scale-[1.03] ${
              type === "signature" ? "h-24 w-64 max-w-full" : "h-40 w-72 max-w-full object-cover"}`} />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-all bg-white/90 rounded-full p-2 shadow">
              <Maximize2 className="w-5 h-5 text-gray-700" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {type === "signature"
            ? <PenTool   className="w-3.5 h-3.5 text-indigo-500" />
            : <ImageIcon className="w-3.5 h-3.5 text-teal-500" />}
          <span className="text-xs text-gray-500 font-medium">
            {type === "signature" ? "Signature" : "Photo"} · click to enlarge
          </span>
        </div>
      </div>
      {open && <ImageLightbox src={src} label={label} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isVideoValue(value: any, typeId: string): boolean {
  if (typeId === "video") return true;
  if (typeof value === "object" && value?.type?.startsWith("video/")) return true;
  if (typeof value === "string" && value.startsWith("data:video")) return true;
  return false;
}

function isImageValue(value: any, typeId: string): boolean {
  if (["image_capture", "photo", "image"].includes(typeId)) return true;
  if (typeof value === "object" && value?.type?.startsWith("image/")) return true;
  if (typeof value === "string" && value.startsWith("data:image")) return true;
  return false;
}

function getMediaSrc(value: any): string {
  if (typeof value === "string") return value;
  return value?.dataUrl ?? "";
}

// ─── Main component ────────────────────────────────────────────────────────────
export function ValidationScreen({ submissionId, onBack, onValidated }: ValidationScreenProps) {
  const [loading,          setLoading]          = useState(true);
  const [validating,       setValidating]        = useState(false);
  const [submission,       setSubmission]        = useState<any>(null);
  const [checklist,        setChecklist]         = useState<any>(null);
  const [comments,         setComments]          = useState("");
  const [validationStatus, setValidationStatus]  = useState<"validated" | "rejected" | null>(null);

  useEffect(() => { loadSubmission(); }, [submissionId]);

  const loadSubmission = async () => {
    try {
      const submissions = await checklistService.getSubmissions();
      const sub = submissions.find((s: any) => s.id === submissionId);
      if (sub) {
        setSubmission(sub);
        const checklistData = await checklistService.getChecklist(sub.checklistId);
        if (checklistData) setChecklist(checklistData.data);
      }
    } catch (error) {
      console.error("Error loading submission:", error);
      toast.error("Failed to load submission");
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (status: "validated" | "rejected") => {
    if (!comments.trim() && status === "rejected") {
      toast.error("Please provide comments when rejecting a submission");
      return;
    }
    setValidating(true);
    try {
      await checklistService.validateSubmission(submissionId, status, comments);
      toast.success(`Submission ${status === "validated" ? "approved" : "rejected"} successfully!`);
      onValidated?.();
      onBack();
    } catch (error: any) {
      console.error("Error validating submission:", error);
      toast.error(error.message || "Failed to validate submission");
    } finally {
      setValidating(false);
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  // ── Field lookup ─────────────────────────────────────────────────────────
  const getField = (questionId: string): any | null => {
    if (!checklist?.canvasFields) return null;
    for (const f of checklist.canvasFields) {
      if (f.uid === questionId || f.id === questionId) return f;
      if (f.type === "SECTION" && f.fields) {
        const sub = f.fields.find((sf: any) => sf.uid === questionId || sf.id === questionId);
        if (sub) return sub;
      }
    }
    return null;
  };

  const getFieldLabel  = (qid: string) => getField(qid)?.label   ?? `Field (…${qid.slice(-6)})`;
  const getFieldTypeId = (qid: string) => getField(qid)?.typeId  ?? "";

  // ── Answer renderer ───────────────────────────────────────────────────────
  const renderAnswerValue = (answer: any) => {
    const { value, questionId } = answer;
    const typeId = getFieldTypeId(questionId);
    const label  = getFieldLabel(questionId);

    if (value === null || value === undefined || value === "") {
      return <span className="text-gray-400 italic text-sm">Not answered</span>;
    }

    // ── Video ──────────────────────────────────────────────────────────────
    if (isVideoValue(value, typeId)) {
      return <VideoThumbnail value={value} label={label} />;
    }

    // ── Signature ─────────────────────────────────────────────────────────
    if (typeId === "signature") {
      const src = getMediaSrc(value);
      return src ? <MediaThumbnail src={src} label={label} type="signature" /> : null;
    }

    // ── Image / photo ─────────────────────────────────────────────────────
    if (isImageValue(value, typeId)) {
      const src = getMediaSrc(value);
      return src ? <MediaThumbnail src={src} label={label} type="image" /> : null;
    }

    // ── Auto-detect any leftover data URLs ─────────────────────────────────
    if (typeof value === "string") {
      if (value.startsWith("data:image")) return <MediaThumbnail src={value} label={label} type="image" />;
      if (value.startsWith("data:video")) return <VideoThumbnail value={value} label={label} />;
    }

    // ── Boolean ───────────────────────────────────────────────────────────
    if (typeof value === "boolean") {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          value ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {value ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {value ? "Yes" : "No"}
        </span>
      );
    }

    // ── File attachment (non-media) ────────────────────────────────────────
    if (typeof value === "object" && value?.name) {
      return (
        <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-100 rounded-xl w-fit">
          <Paperclip className="w-4 h-4 text-gray-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">{value.name}</p>
            {value.size && (
              <p className="text-xs text-gray-400">
                {value.size < 1024 * 1024
                  ? `${(value.size / 1024).toFixed(1)} KB`
                  : `${(value.size / (1024 * 1024)).toFixed(1)} MB`}
              </p>
            )}
          </div>
        </div>
      );
    }

    // ── Array ─────────────────────────────────────────────────────────────
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v: any, i: number) => (
            <span key={i} className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{String(v)}</span>
          ))}
        </div>
      );
    }

    // ── Object ────────────────────────────────────────────────────────────
    if (typeof value === "object") {
      return (
        <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return <span className="text-sm text-gray-800">{String(value)}</span>;
  };

  // ── Field type icon ──────────────────────────────────────────────────────
  const getTypeIcon = (typeId: string) => {
    if (typeId === "signature")  return <PenTool   className="w-4 h-4 text-indigo-500" />;
    if (typeId === "video")      return <Film      className="w-4 h-4 text-teal-500"   />;
    if (["image_capture","photo","image"].includes(typeId))
                                  return <ImageIcon className="w-4 h-4 text-teal-500"   />;
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  const getTypeBadge = (typeId: string, value: any) => {
    if (typeId === "signature")  return { label: "Signature", cls: "bg-indigo-100 text-indigo-600" };
    if (typeId === "video" || isVideoValue(value, typeId))
                                  return { label: "Video",     cls: "bg-teal-100 text-teal-600"    };
    if (isImageValue(value, typeId))
                                  return { label: "Photo",     cls: "bg-sky-100 text-sky-600"      };
    return null;
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#2abaad] animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading submission…</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Submission not found</h3>
          <p className="text-sm text-gray-500 mb-6">This submission may have been removed.</p>
          <button type="button" onClick={onBack}
            className="px-5 py-2 bg-[#2abaad] text-white rounded-xl text-sm font-medium hover:bg-[#24a699] transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Count media answers
  const mediaAnswers = (submission.answers || []).filter((a: any) => {
    const tid = getFieldTypeId(a.questionId);
    return isVideoValue(a.value, tid) || isImageValue(a.value, tid) || tid === "signature"
      || (typeof a.value === "string" && (a.value.startsWith("data:image") || a.value.startsWith("data:video")));
  });

  const videoAnswers = (submission.answers || []).filter((a: any) => {
    const tid = getFieldTypeId(a.questionId);
    return isVideoValue(a.value, tid);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button type="button" onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            {videoAnswers.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold">
                <Video className="w-3.5 h-3.5" />
                {videoAnswers.length} video{videoAnswers.length !== 1 ? "s" : ""}
              </span>
            )}
            {mediaAnswers.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
                <Eye className="w-3.5 h-3.5" />
                {mediaAnswers.length} media
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              submission.status === "submitted"  ? "bg-orange-50 text-orange-700" :
              submission.status === "validated"  ? "bg-green-50  text-green-700"  :
              "bg-red-50 text-red-700"}`}>
              {submission.status.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ── Submission meta ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Checklist Submission Review</h1>
              {checklist && <p className="text-base text-gray-500">{checklist.title}</p>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-teal-600">{submission.totalScore}</div>
              <p className="text-xs text-gray-400 mt-0.5">Total Score</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <User className="w-4 h-4 text-gray-400" />,     label: "Submitted By",    val: submission.submittedByEmail },
              { icon: <Calendar className="w-4 h-4 text-gray-400" />, label: "Submitted At",    val: formatDate(submission.submittedAt) },
              { icon: <FileText className="w-4 h-4 text-gray-400" />, label: "Total Responses", val: `${submission.answers?.length || 0} fields` },
            ].map(({ icon, label, val }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {icon}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-gray-800">{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Answers ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Submitted Answers
            <span className="ml-auto text-xs text-gray-400 font-normal">
              {submission.answers?.length || 0} response{submission.answers?.length !== 1 ? "s" : ""}
            </span>
          </h2>

          <div className="space-y-3">
            {submission.answers && submission.answers.length > 0 ? (
              submission.answers.map((answer: any, index: number) => {
                const typeId = getFieldTypeId(answer.questionId);
                const badge  = getTypeBadge(typeId, answer.value);
                const isVid  = isVideoValue(answer.value, typeId);
                const isImg  = isImageValue(answer.value, typeId) || typeId === "signature";

                return (
                  <div
                    key={answer.id || index}
                    className={`rounded-xl border p-4 transition-all ${
                      isVid ? "border-teal-100 bg-gradient-to-br from-teal-50/40 to-white"
                      : isImg ? "border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-white"
                      : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    {/* Label row */}
                    <div className="flex items-center gap-2 mb-3">
                      {getTypeIcon(typeId)}
                      <h3 className="text-sm font-semibold text-gray-800 flex-1">
                        {getFieldLabel(answer.questionId)}
                      </h3>
                      {badge && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}
                      {answer.score !== undefined && answer.score > 0 && (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 rounded-full">
                          <Star className="w-3 h-3 text-teal-600" />
                          <span className="text-xs font-semibold text-teal-700">+{answer.score}</span>
                        </div>
                      )}
                    </div>

                    {/* Value */}
                    <div className="pl-6">
                      {renderAnswerValue(answer)}
                    </div>

                    {answer.isFlagged && (
                      <div className="mt-3 pl-6 flex items-center gap-1.5 text-xs text-red-600">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Flagged for review
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10">
                <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No answers submitted</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Manager Review ───────────────────────────────────────────────── */}
        {submission.status === "submitted" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-600" />
              Manager Review
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments
                  {validationStatus === "rejected" && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  placeholder="Add your feedback here…"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {validationStatus === "rejected"
                    ? "Required when rejecting"
                    : "Optional — visible to the submitter"}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => handleValidate("validated")} disabled={validating}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve Submission
                </button>
                <button type="button" onClick={() => handleValidate("rejected")} disabled={validating}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject Submission
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Already reviewed ─────────────────────────────────────────────── */}
        {submission.status !== "submitted" && (
          <div className={`rounded-2xl shadow-sm border p-6 ${
            submission.status === "validated" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                submission.status === "validated" ? "bg-green-100" : "bg-red-100"}`}>
                {submission.status === "validated"
                  ? <CheckCircle2 className="w-6 h-6 text-green-600" />
                  : <XCircle      className="w-6 h-6 text-red-600"   />}
              </div>
              <div className="flex-1">
                <h3 className={`text-base font-semibold mb-2 ${
                  submission.status === "validated" ? "text-green-800" : "text-red-800"}`}>
                  Submission {submission.status === "validated" ? "Approved" : "Rejected"}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  {submission.validatedBy  && <p>Reviewed by: <span className="font-medium">{submission.validatedBy}</span></p>}
                  {submission.validatedAt  && <p>On: {formatDate(submission.validatedAt)}</p>}
                  {submission.validationComments && (
                    <div className="mt-3 p-3 bg-white/70 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Comments</p>
                      <p className="text-sm text-gray-700">{submission.validationComments}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
