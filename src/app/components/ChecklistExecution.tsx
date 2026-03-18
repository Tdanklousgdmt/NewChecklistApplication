import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import React from "react";
import {
  ArrowLeft, CheckCircle2, Loader2, Send, AlertCircle,
  Camera, Paperclip, PenTool, Star, MapPin, Thermometer,
  ScanLine, Calculator, ChevronDown, ChevronUp, X, Check,
  Video, RefreshCw, Navigation, Info, Heading1, Trash2, ZoomIn,
  Save, Clock, RotateCcw, BookOpen, Download, Play, Image, Film,
  Maximize2, Tag, Zap,
} from "lucide-react";
import { checklistService } from "../services/checklistService";
import { toast } from "sonner";
import { TagDeclarationModal } from "./TagDeclarationModal";
import { ImmediateActionModal } from "./ImmediateActionModal";

interface ChecklistExecutionProps {
  checklistId: string;
  assignmentId?: string;
  onBack: () => void;
  onSubmitted?: () => void;
}

// ─── Signature pad ─────────────────────────────────────────────────────────────
// Canvas buffer is sized to match its CSS display size (× DPR) via ResizeObserver
// so pointer coordinates always map exactly to what the user sees — no offset drift.
function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const drawing      = useRef(false);
  const hasMark      = useRef(false);

  const DISPLAY_H = 180; // fixed CSS-px height of the pad

  // ── Sync canvas buffer ↔ CSS display size (including HiDPI) ───────────────
  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const sync = () => {
      const dpr = window.devicePixelRatio || 1;
      const w   = container.clientWidth;
      const bw  = Math.round(w * dpr);
      const bh  = Math.round(DISPLAY_H * dpr);
      if (canvas.width === bw && canvas.height === bh) return; // nothing changed
      canvas.width  = bw;
      canvas.height = bh;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${DISPLAY_H}px`;
      // After resize the transform is reset — reapply DPR scale
      canvas.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Restore a previously saved signature on mount ─────────────────────────
  useEffect(() => {
    if (!value) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
      hasMark.current = true;
    };
    img.src = value;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  // ── Pointer → CSS-px canvas-relative coordinates ──────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0] ?? (e as React.TouchEvent).changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  // ctx configured for every stroke call
  const ctx = () => {
    const c = canvasRef.current?.getContext("2d");
    if (c) { c.lineWidth = 2.5; c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = "#1e293b"; }
    return c;
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const { x, y } = getPos(e);
    const c = ctx();
    c?.beginPath();
    c?.moveTo(x, y);
  };

  const drawMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const { x, y } = getPos(e);
    const c = ctx();
    if (!c) return;
    c.lineTo(x, y);
    c.stroke();
    c.beginPath(); // fresh sub-path keeps each segment crisp
    c.moveTo(x, y);
    hasMark.current = true;
  };

  const stopDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (canvasRef.current && hasMark.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    hasMark.current = false;
    onChange("");
  };

  return (
    <div className="space-y-2">
      {/* Pad */}
      <div
        ref={containerRef}
        className="relative border-2 border-gray-200 hover:border-teal-300 rounded-xl overflow-hidden bg-white transition-colors select-none"
      >
        <canvas
          ref={canvasRef}
          className="block touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={drawMove}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={drawMove}
          onTouchEnd={stopDraw}
        />
        {/* Placeholder shown when pad is empty */}
        {!value && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2 opacity-40">
            <PenTool className="w-6 h-6 text-gray-400" />
            <p className="text-sm text-gray-400 font-medium">Draw your signature here</p>
          </div>
        )}
        {/* Baseline guide */}
        <div className="absolute bottom-10 left-8 right-8 border-b border-dashed border-gray-200 pointer-events-none" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Use mouse or finger to sign</p>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Clear
        </button>
      </div>

      {/* Captured badge */}
      {value && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded-lg">
          <Check className="w-3.5 h-3.5 shrink-0" />
          Signature captured — clear to redo
        </div>
      )}
    </div>
  );
}

// ─── Lightbox Modal ───────────────────────────────────────────────────────────
function LightboxModal({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = alt || "image";
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-full w-full" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 right-0 flex gap-2 z-10 -translate-y-full pb-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors backdrop-blur"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors backdrop-blur"
          >
            <X className="w-3.5 h-3.5" /> Close
          </button>
        </div>
        <img
          src={src}
          alt={alt || "Preview"}
          className="max-h-[85vh] max-w-full mx-auto rounded-xl shadow-2xl object-contain"
        />
        {alt && <p className="text-center text-xs text-white/60 mt-2">{alt}</p>}
      </div>
    </div>
  );
}

// ─── Inline Video Player ──────────────────────────────────────────────────────
function InlineVideoPlayer({ src, name, onRemove, onDownload }: {
  src: string;
  name?: string;
  onRemove?: () => void;
  onDownload?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play(); setPlaying(true); }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-black">
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          className="w-full max-h-64 object-contain bg-black"
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={() => setPlaying(false)}
          onClick={togglePlay}
        />
        {!playing && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 text-gray-800 ml-1" />
            </div>
          </button>
        )}
      </div>
      <div className="bg-gray-900 px-3 py-2 flex items-center gap-3">
        <button type="button" onClick={togglePlay} className="text-white hover:text-teal-300 transition-colors shrink-0">
          {playing
            ? <span className="text-xs font-bold px-0.5">⏸</span>
            : <Play className="w-3.5 h-3.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={currentTime}
          onChange={(e) => {
            const v = videoRef.current;
            if (v) { v.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); }
          }}
          className="flex-1 h-1 accent-teal-400 cursor-pointer"
        />
        <span className="text-[10px] text-gray-400 shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
      <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 flex items-center gap-2">
        <Film className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-xs text-gray-600 flex-1 truncate">{name || "video"}</span>
        {onDownload && (
          <button type="button" onClick={onDownload}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Download className="w-3 h-3" /> Download
          </button>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ─── File upload widget ───────────────────────────────────────────────────────
function FileUpload({
  value,
  onChange,
  accept,
  label,
  icon: Icon,
  maxSizeMB = 10,
}: {
  value: any;
  onChange: (v: any) => void;
  accept: string;
  label: string;
  icon: React.ElementType;
  maxSizeMB?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const isImageAccept = accept.startsWith("image");
  const isVideoAccept = accept.startsWith("video");

  const handleFile = (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large (max ${maxSizeMB} MB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onChange({ name: file.name, size: file.size, type: file.type, dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!value?.dataUrl) return;
    const a = document.createElement("a");
    a.href = value.dataUrl;
    a.download = value.name || "file";
    a.click();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Uploaded image state ───────────────────────────────────────────
  if (value?.dataUrl && isImageAccept) {
    return (
      <div className="space-y-2">
        <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img src={value.dataUrl} alt={value.name} className="w-full max-h-48 object-contain bg-white" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setLightbox(value.dataUrl)}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-2 bg-white/90 rounded-lg text-xs font-medium text-gray-700 shadow-md"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Full preview
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-2 bg-white/90 rounded-lg text-xs font-medium text-gray-700 shadow-md"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 truncate max-w-[200px]">{value.name} · {(value.size / 1024).toFixed(0)} KB</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className="w-3 h-3" /> Replace
            </button>
            <button type="button" onClick={() => onChange(null)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {lightbox && <LightboxModal src={lightbox} alt={value.name} onClose={() => setLightbox(null)} />}
      </div>
    );
  }

  // ── Uploaded video state ───────────────────────────────────────────
  if (value?.dataUrl && isVideoAccept) {
    return (
      <div className="space-y-2">
        <InlineVideoPlayer
          src={value.dataUrl}
          name={value.name}
          onRemove={() => onChange(null)}
          onDownload={handleDownload}
        />
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <RefreshCw className="w-3 h-3" /> Replace video
        </button>
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
    );
  }

  // ── Generic uploaded file state (non-image, non-video) ─────────────
  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl">
          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{value.name}</p>
            <p className="text-xs text-gray-400">{(value.size / 1024).toFixed(1)} KB</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleDownload}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-teal-600 hover:bg-teal-100 rounded-lg transition-colors">
              <Download className="w-3 h-3" /> Download
            </button>
            <button type="button" onClick={() => onChange(null)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty upload zone ──────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Hidden input is OUTSIDE the clickable div to prevent double-trigger via event bubbling */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-teal-400 hover:bg-teal-50/30 transition-all cursor-pointer group"
      >
        <div className="mx-auto w-12 h-12 bg-gray-100 group-hover:bg-teal-100 rounded-full flex items-center justify-center mb-3 transition-colors">
          <Icon className="w-6 h-6 text-gray-400 group-hover:text-teal-600 transition-colors" />
        </div>
        <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
        <p className="text-xs text-gray-400">Click or drag & drop · Max {maxSizeMB}MB</p>
      </div>
    </div>
  );
}

// ─── Rating stars ─────────────────────────────────────────────────────────────
function StarRating({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`w-7 h-7 transition-colors ${star <= (hovered || value) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-100"}`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-amber-600">{value} / {max}</span>
      )}
    </div>
  );
}

// ─── Numeric rating ───────────────────────────────────────────────────────────
function NumericRating({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
            value === n
              ? "bg-teal-500 text-white shadow-md scale-105"
              : "bg-gray-100 text-gray-600 hover:bg-teal-100 hover:text-teal-700"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── Threshold badge ──────────────────────────────────────────────────────────
function ThresholdBadge({ field, value }: { field: any; value: number | undefined }) {
  if (value === undefined || value === null || !field.thresholds?.length) return null;
  const matched = field.thresholds.find((t: any) => {
    switch (t.operator) {
      case "<":  return value < t.value;
      case "<=": return value <= t.value;
      case "=":  return value === t.value;
      case ">=": return value >= t.value;
      case ">":  return value > t.value;
      default:   return false;
    }
  });
  if (!matched) return null;
  const colors: Record<string, string> = {
    green:  "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    red:    "bg-red-50 text-red-700 border-red-200",
  };
  const dots: Record<string, string> = { green: "bg-green-500", yellow: "bg-yellow-500", red: "bg-red-500" };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${colors[matched.color]}`}>
      <span className={`w-2 h-2 rounded-full ${dots[matched.color]}`} />
      {matched.operator} {matched.value}{matched.message ? ` · ${matched.message}` : ""}
    </div>
  );
}

// ─── Location field ───────────────────────────────────────────────────────────
function LocationField({ field, value, onChange, inputCls }: {
  field: any; value: any; onChange: (v: any) => void; inputCls: string;
}) {
  const [locLoading, setLocLoading] = useState(false);

  const capture = () => {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, capturedAt: Date.now() });
        setLocLoading(false);
      },
      () => {
        toast.error("Location access denied. Enable location permissions.");
        setLocLoading(false);
      }
    );
  };

  return (
    <div className="space-y-3">
      {value?.lat !== undefined ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <Navigation className="w-4 h-4 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-green-800">Location captured</p>
              <p className="text-xs text-green-600 mt-0.5">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
                {value.accuracy && ` · ±${Math.round(value.accuracy)}m`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`https://maps.google.com/?q=${value.lat},${value.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" /> View on Google Maps
            </a>
            <button type="button" onClick={capture} disabled={locLoading} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Re-capture
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={capture}
          disabled={locLoading}
          className="w-full flex flex-col items-center gap-3 py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50/30 transition-all"
        >
          {locLoading ? <Loader2 className="w-8 h-8 text-teal-400 animate-spin" /> : <MapPin className="w-8 h-8 text-gray-300" />}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">{locLoading ? "Getting location…" : "Capture GPS location"}</p>
            <p className="text-xs text-gray-400 mt-0.5">Click to use your device GPS</p>
          </div>
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="any" value={value?.lat ?? ""} onChange={(e) => onChange({ ...(value || {}), lat: Number(e.target.value) })} placeholder="Latitude" className={inputCls} />
        <input type="number" step="any" value={value?.lng ?? ""} onChange={(e) => onChange({ ...(value || {}), lng: Number(e.target.value) })} placeholder="Longitude" className={inputCls} />
      </div>
    </div>
  );
}

// ─── Collapsible section wrapper for execution ────────────────────────────────
function SectionExecution({ field, renderField }: { field: any; renderField: (f: any) => React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const children: any[] = field.children || [];
  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-100/60 to-transparent hover:from-amber-100 transition-colors"
      >
        <Heading1 className="w-4 h-4 text-amber-600 shrink-0" />
        <h2 className="text-sm font-semibold text-gray-800 flex-1 text-left">{field.content || field.label}</h2>
        <span className="px-2 py-0.5 bg-amber-200 text-amber-700 rounded-full text-[10px]">
          {children.length} field{children.length !== 1 ? "s" : ""}
        </span>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-amber-500 shrink-0" />
          : <ChevronUp className="w-4 h-4 text-amber-500 shrink-0" />}
      </button>
      {!collapsed && (
        children.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center border-t border-amber-200">No fields in this section</p>
        ) : (
          <div className="space-y-4 p-4 border-t border-amber-200">
            {children.map((child: any) => (
              <div key={child.uid}>{renderField(child)}</div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ChecklistExecution({ checklistId, assignmentId, onBack, onSubmitted }: ChecklistExecutionProps) {
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist]   = useState<any>(null);
  const [answers, setAnswers]       = useState<Record<string, any>>({});
  const [revealedSections, setRevealedSections] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed]   = useState<Set<string>>(new Set());
  const [errors, setErrors]         = useState<Record<string, string>>({});

  // ── Draft state ─────────────────────────────────────────────────────────────
  const [draftId, setDraftId]           = useState<string | null>(null);
  const [savingDraft, setSavingDraft]   = useState(false);
  const [lastSaved, setLastSaved]       = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<any>(null); // draft found but not yet restored

  // ── Tag state ────────────────────────────────────────────────────────────────
  const [showTagModal, setShowTagModal]                   = useState(false);
  const [tagCount, setTagCount]                           = useState(0);

  // ── Immediate Action state ───────────────────────────────────────────────────
  const [showImmediateActionModal, setShowImmediateActionModal] = useState(false);
  const [immediateActionCount, setImmediateActionCount]         = useState(0);

  useEffect(() => { loadChecklist(); }, [checklistId]);

  const loadChecklist = async () => {
    try {
      const [checklistData, existingDraft] = await Promise.all([
        checklistService.getChecklist(checklistId),
        checklistService.getDraftSubmission(checklistId, assignmentId),
      ]);

      if (checklistData) {
        setChecklist(checklistData.data);
        // Build defaults from field definitions — flatten section children too
        const defaults: Record<string, any> = {};
        const flattenForDefaults = (fields: any[]): any[] =>
          fields.flatMap((f: any) =>
            f.typeId === "section" ? (f.children || []) : [f]
          );
        for (const f of flattenForDefaults(checklistData.data?.canvasFields || [])) {
          if (f.typeId === "yes_no") defaults[f.uid] = { value: null };
          if (f.typeId === "checkbox") defaults[f.uid] = { value: false };
          if (f.typeId === "custom_buttons" && f.customButtons) {
            const def = f.customButtons.find((b: any) => b.isDefault);
            if (def) defaults[f.uid] = { value: def.id, label: def.label, score: typeof def.score === "number" ? def.score : 0 };
          }
          if (f.typeId === "rating") defaults[f.uid] = { value: 0, score: 0 };
          if (f.typeId === "datetime" && f.defaultToNow) defaults[f.uid] = { value: new Date().toISOString().slice(0, 16) };
          if (f.typeId === "date"     && f.defaultToNow) defaults[f.uid] = { value: new Date().toISOString().slice(0, 10) };
          if (f.typeId === "time"     && f.defaultToNow) defaults[f.uid] = { value: new Date().toTimeString().slice(0, 5) };
        }

        if (existingDraft && Array.isArray(existingDraft.answers) && existingDraft.answers.length > 0) {
          // A saved draft exists — show restore banner
          setDraftId(existingDraft.id);
          setPendingDraft(existingDraft);
          setShowDraftBanner(true);
          setAnswers(defaults); // load defaults for now; user can restore
        } else {
          setAnswers(defaults);
        }
      }
    } catch (err) {
      console.error("Error loading checklist:", err);
      toast.error("Failed to load checklist");
    } finally {
      setLoading(false);
    }
  };

  /** Restore answers from the saved draft */
  const restoreDraft = () => {
    if (!pendingDraft) return;
    const restored: Record<string, any> = {};
    for (const a of pendingDraft.answers) {
      restored[a.questionId] = { value: a.value, score: a.score || 0, answeredAt: a.answeredAt };
    }
    setAnswers(restored);
    setDraftRestored(true);
    setShowDraftBanner(false);
    setLastSaved(new Date(pendingDraft.updatedAt || pendingDraft.submittedAt));
    toast.success("Draft restored — pick up where you left off!");
  };

  /** Dismiss banner and start fresh (keep draft in DB in case they change mind) */
  const startFresh = () => {
    setShowDraftBanner(false);
    setPendingDraft(null);
  };

  /** Save current answers as a draft submission */
  const saveDraft = useCallback(async (silent = false) => {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      const answersArray = Object.entries(answers).map(([uid, a]: [string, any]) => ({
        questionId: uid,
        value: a.value,
        score: a.score || 0,
        answeredAt: a.answeredAt || Date.now(),
      }));

      let savedDraft;
      if (draftId) {
        savedDraft = await checklistService.updateDraftSubmission(draftId, answersArray);
      } else {
        savedDraft = await checklistService.createDraftSubmission(checklistId, assignmentId || null, answersArray);
        setDraftId(savedDraft.id);
      }
      setLastSaved(new Date());
      if (!silent) toast.success("Progress saved — you can resume anytime");
    } catch (err: any) {
      console.error("Error saving draft:", err);
      if (!silent) toast.error("Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  }, [answers, draftId, checklistId, assignmentId, savingDraft]);

  const answer = (uid: string, value: any, score = 0) => {
    setAnswers((prev) => ({ ...prev, [uid]: { value, score, answeredAt: Date.now() } }));
    setErrors((prev) => { const n = { ...prev }; delete n[uid]; return n; });
  };

  const allFields: any[] = checklist?.canvasFields || [];

  // Flatten top-level fields AND children of sections so completion/validation
  // correctly accounts for required fields nested inside sections.
  const flattenFields = (fields: any[]): any[] =>
    fields.flatMap((f: any) =>
      f.typeId === "section" ? (f.children || []) : [f]
    );

  // Flat list of answerable fields (excludes section/separator/instruction)
  const answerableFields = flattenFields(allFields).filter((f: any) =>
    !["section", "separator", "instruction"].includes(f.typeId)
  );

  const answeredCount = answerableFields.filter((f: any) => {
    const a = answers[f.uid];
    if (!a) return false;
    if (a.value === null || a.value === undefined || a.value === "") return false;
    if (typeof a.value === "number" && a.value === 0 && f.typeId === "rating") return a.value > 0;
    return true;
  }).length;

  const completion = answerableFields.length > 0
    ? Math.round((answeredCount / answerableFields.length) * 100)
    : 100;

  const totalScore = Object.values(answers).reduce((s: number, a: any) => s + (a?.score || 0), 0);

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const f of answerableFields) {
      if (!f.required) continue;
      const a = answers[f.uid];
      const val = a?.value;
      if (val === null || val === undefined || val === "" || val === false) {
        errs[f.uid] = "This field is required";
      }
      if (Array.isArray(val) && val.length === 0) errs[f.uid] = "Please select at least one option";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please complete all required fields");
      const firstErr = document.querySelector("[data-error='true']");
      firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([uid, a]: [string, any]) => ({
        questionId: uid,
        value: a.value,
        score: a.score || 0,
        answeredAt: a.answeredAt || Date.now(),
      }));

      if (draftId) {
        // Promote the existing draft to a real submission
        await checklistService.finaliseDraftSubmission(draftId, answersArray);
      } else {
        // Create a fresh submission
        await checklistService.submitExecution(checklistId, assignmentId || null, answersArray);
      }

      toast.success("Checklist submitted successfully!");
      onSubmitted?.();
      onBack();
    } catch (err: any) {
      console.error("Error submitting:", err);
      toast.error(err.message || "Failed to submit checklist");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Field renderer ─────────────────────────────────────────────────────────
  const renderField = (field: any) => {
    const val = answers[field.uid]?.value;
    const score = answers[field.uid]?.score || 0;
    const hasError = !!errors[field.uid];

    const inputCls = `w-full px-4 py-3 border rounded-xl text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/30"
        : "border-gray-200 focus:border-teal-400 focus:ring-teal-100 bg-white"
    }`;

    // ── wrap() is a plain function, NOT a JSX component ──────────────────────
    // Calling it as wrap(content) inlines its output directly into the parent's
    // render tree. React reconciles the returned <div> by its primitive type
    // (always "div") — no component-type mismatch → no unmount/remount on
    // every parent re-render, so file-input refs survive across state updates.
    const wrap = (content: React.ReactNode) => (
      <div data-error={hasError} className={`space-y-3 p-5 bg-white rounded-2xl border-2 transition-all ${hasError ? "border-red-200" : "border-gray-100"}`}>
        {field.typeId !== "separator" && field.typeId !== "section" && (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-gray-800">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.helpText && (
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{field.helpText}</p>
              )}
            </div>
            {score > 0 && (
              <span className="shrink-0 px-2 py-0.5 bg-teal-50 text-teal-700 text-[11px] font-semibold rounded-full">
                +{score} pts
              </span>
            )}
          </div>
        )}
        {content}
        {hasError && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errors[field.uid]}
          </p>
        )}
      </div>
    );

    switch (field.typeId) {
      // ── Short Text ──────────────────────────────────────────────────────────
      case "short_text":
        return wrap(
          <input
            type="text"
            value={val || ""}
            onChange={(e) => answer(field.uid, e.target.value)}
            placeholder={field.placeholder || "Type your answer…"}
            className={inputCls}
          />
        );

      // ── Long Text ───────────────────────────────────────────────────────────
      case "long_text":
        return wrap(<>
          <textarea
            value={val || ""}
            onChange={(e) => answer(field.uid, e.target.value)}
            placeholder={field.placeholder || "Type your response…"}
            rows={field.rows || 4}
            maxLength={field.maxLength}
            className={inputCls + " resize-none"}
          />
          {field.maxLength && (
            <p className="text-[11px] text-gray-400 text-right">
              {(val?.length || 0)} / {field.maxLength}
            </p>
          )}
        </>);

      // ── Number ──────────────────────────────────────────────────────────────
      case "number":
        return wrap(<>
          <input
            type="number"
            value={val ?? ""}
            onChange={(e) => {
              const n = e.target.value === "" ? undefined : Number(e.target.value);
              answer(field.uid, n);
            }}
            placeholder={field.placeholder || "Enter a number…"}
            min={field.minValue}
            max={field.maxValue}
            step={field.step || 1}
            className={inputCls}
          />
          {(field.minValue !== undefined || field.maxValue !== undefined) && (
            <p className="text-xs text-gray-400">
              Range: {field.minValue ?? "—"} to {field.maxValue ?? "—"}
            </p>
          )}
        </>);

      // ── Number + Unit ───────────────────────────────────────────────────────
      case "number_unit":
        return wrap(<>
          <div className="flex gap-2">
            <input
              type="number"
              value={val?.primary ?? ""}
              onChange={(e) => {
                const n = e.target.value === "" ? undefined : Number(e.target.value);
                answer(field.uid, { ...val, primary: n });
              }}
              placeholder="0"
              className={inputCls}
            />
            {field.primaryUnit && (
              <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 whitespace-nowrap">
                {field.primaryUnit}
              </div>
            )}
          </div>
          {field.subUnit && field.enableConversion && (
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                value={val?.sub ?? ""}
                onChange={(e) => {
                  const n = e.target.value === "" ? undefined : Number(e.target.value);
                  answer(field.uid, { ...val, sub: n });
                }}
                placeholder="0"
                className={inputCls}
              />
              <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 whitespace-nowrap">
                {field.subUnit}
              </div>
            </div>
          )}
        </>);

      // ── Number with Thresholds ──────────────────────────────────────────────
      case "number_threshold":
        return wrap(<>
            <input
              type="number"
              value={val ?? ""}
              onChange={(e) => {
                const n = e.target.value === "" ? undefined : Number(e.target.value);
                answer(field.uid, n);
              }}
              placeholder="Enter value…"
              min={field.minValue}
              max={field.maxValue}
              className={inputCls}
            />
            <ThresholdBadge field={field} value={val} />
            {field.thresholds?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {field.thresholds.map((t: any) => {
                  const c = { green: "text-green-600 bg-green-50", yellow: "text-yellow-600 bg-yellow-50", red: "text-red-600 bg-red-50" }[t.color];
                  return (
                    <span key={t.id} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c}`}>
                      {t.operator} {t.value}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        );

      // ── Checkbox ────────────────────────────────────────────────────────────
      case "checkbox":
        return wrap(
            <button
              type="button"
              onClick={() => answer(field.uid, !val)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all text-left ${
                val
                  ? "border-teal-400 bg-teal-50/60 text-teal-800"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all ${val ? "bg-teal-500 border-teal-500" : "border-gray-300"}`}>
                {val && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm font-medium">{val ? "Checked" : "Click to check"}</span>
            </button>
        );

      // ── Yes / No ────────────────────────────────────────────────────────────
      case "yes_no":
        return wrap(
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: "yes", label: "Yes", icon: "✓", active: "bg-green-500 text-white border-green-500 shadow-md", hover: "hover:border-green-300 hover:bg-green-50" },
                { v: "no",  label: "No",  icon: "✗", active: "bg-red-500 text-white border-red-500 shadow-md",   hover: "hover:border-red-300 hover:bg-red-50"   },
              ].map(({ v, label, icon, active, hover }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => answer(field.uid, v, v === "yes" ? 10 : 0)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 font-semibold text-sm transition-all ${val === v ? active : `border-gray-200 bg-white text-gray-500 ${hover}`}`}
                >
                  <span className="text-xl">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          );

      // ── Custom Buttons ──────────────────────────────────────────────────────
      case "custom_buttons": {
        const buttons = field.customButtons || [];
        return wrap(<>
            <div className="flex flex-wrap gap-3">
              {buttons.map((btn: any) => {
                const isSelected = val === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => {
                      const sc = typeof btn.score === "number" ? btn.score : 0;
                      answer(field.uid, btn.id, sc);
                      // Reveal sections if score === "reveal"
                      if (btn.score === "reveal" && btn.revealSections) {
                        setRevealedSections((prev) => {
                          const next = new Set(prev);
                          btn.revealSections.forEach((sid: string) => next.add(sid));
                          return next;
                        });
                      }
                    }}
                    style={isSelected ? { backgroundColor: btn.bgColor, color: btn.textColor, borderColor: btn.bgColor } : {}}
                    className={`px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${isSelected ? "shadow-md scale-105" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:scale-102"}`}
                  >
                    {btn.label}
                    {typeof btn.score === "number" && btn.score > 0 && (
                      <span className={`ml-2 text-[10px] font-normal ${isSelected ? "opacity-80" : "text-gray-400"}`}>
                        +{btn.score}
                      </span>
                    )}
                    {btn.score === "N/A" && (
                      <span className={`ml-2 text-[10px] font-normal ${isSelected ? "opacity-80" : "text-gray-400"}`}>N/A</span>
                    )}
                  </button>
                );
              })}
            </div>
            {val && (
              <button
                type="button"
                onClick={() => answer(field.uid, null, 0)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear selection
              </button>
            )}
          </>
        );
      }

      // ── Dropdown ───────────────────────────────────────────────────────────
      case "dropdown": {
        const opts = field.options || [];
        const isMulti = field.multiSelect;

        if (isMulti) {
          const selected: string[] = Array.isArray(val) ? val : [];
          return wrap(<>
            <div className="flex flex-wrap gap-2 mb-2">
              {selected.map((s: string) => (
                <span key={s} className="flex items-center gap-1.5 px-3 py-1 bg-teal-100 text-teal-800 text-xs font-medium rounded-full">
                  {s}
                  <button type="button" onClick={() => answer(field.uid, selected.filter((x) => x !== s))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {opts.filter((o: string) => !selected.includes(o)).map((opt: string) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => answer(field.uid, [...selected, opt])}
                  className="w-full text-left px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                >
                  {opt}
                </button>
              ))}
              {field.allowOther && !selected.includes("__other__") && (
                <button
                  type="button"
                  onClick={() => answer(field.uid, [...selected, "__other__"])}
                  className="w-full text-left px-4 py-2.5 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:border-teal-300 hover:bg-teal-50/50 transition-all"
                >
                  + Other
                </button>
              )}
            </div>
          </>);
        }

        return wrap(
          <div className="space-y-2">
            {opts.map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => answer(field.uid, opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  val === opt
                    ? "border-teal-400 bg-teal-50 text-teal-800"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className={`inline-flex w-4 h-4 rounded-full border-2 mr-3 shrink-0 items-center justify-center ${val === opt ? "border-teal-500 bg-teal-500" : "border-gray-300"}`}>
                  {val === opt && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                {opt}
                </button>
              ))}
              {field.allowOther && (
                <input
                  type="text"
                  value={val?.startsWith?.("__other__:") ? val.slice(9) : ""}
                  onChange={(e) => answer(field.uid, `__other__:${e.target.value}`)}
                  placeholder="Other…"
                  className={inputCls + " mt-2"}
                />
              )}
            </div>
        );
      }

      // ── Date ────────────────────────────────────────────────────────────────
      case "date":
        return wrap(
          <input
            type="date"
            value={val || ""}
            onChange={(e) => answer(field.uid, e.target.value)}
            min={field.minDate}
            max={field.maxDate}
            className={inputCls}
          />
        );

      // ── Time ────────────────────────────────────────────────────────────────
      case "time":
        return wrap(
          <input
            type="time"
            value={val || ""}
            onChange={(e) => answer(field.uid, e.target.value)}
            min={field.minTime}
            max={field.maxTime}
            className={inputCls}
          />
        );

      // ── Date & Time ─────────────────────────────────────────────────────────
      case "datetime":
        return wrap(
          <input
            type="datetime-local"
            value={val || ""}
            onChange={(e) => answer(field.uid, e.target.value)}
            className={inputCls}
          />
        );

      // ── Photo ───────────────────────────────────────────────────────────────
      case "photo":
        return wrap(
          <FileUpload
            value={val}
            onChange={(v) => answer(field.uid, v)}
            accept="image/*"
            label="Take a photo or upload image"
            icon={Camera}
            maxSizeMB={field.maxFileSize || 10}
          />
        );

      // ── Video ───────────────────────────────────────────────────────────────
      case "video":
        return wrap(
          <FileUpload
            value={val}
            onChange={(v) => answer(field.uid, v)}
            accept="video/*"
            label="Record or upload a video"
            icon={Video}
            maxSizeMB={field.maxFileSize || 50}
          />
        );

      // ── File Upload ───────���─────────────────────────────────────────────────
      case "file":
        return wrap(
          <FileUpload
            value={val}
            onChange={(v) => answer(field.uid, v)}
            accept="*/*"
            label="Attach a file"
            icon={Paperclip}
            maxSizeMB={field.maxFileSize || 25}
          />
        );

      // ── Signature ───────────────────────────────────────────────────────────
      case "signature":
        return wrap(
          <SignaturePad value={val || ""} onChange={(v) => answer(field.uid, v)} />
        );

      // ── Section ─────────────────────────────────────────────────────────────
      case "section": {
        const isCollapsed = collapsed.has(field.uid);
        const isHidden = field.revealCondition && !revealedSections.has(field.uid);
        if (isHidden) return null;
        return (
          <div className="mt-6 mb-2">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => {
                const next = new Set(prev);
                next.has(field.uid) ? next.delete(field.uid) : next.add(field.uid);
                return next;
              })}
              className="w-full flex items-center gap-3 group"
            >
              <div className="flex-1 flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shrink-0">
                  <Heading1 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-800">{field.label}</h3>
              </div>
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              )}
            </button>
            {field.content && !isCollapsed && (
              <p className="ml-11 mt-1 text-sm text-gray-500">{field.content}</p>
            )}
            <div className="ml-11 mt-2 h-px bg-gradient-to-r from-teal-200 to-transparent" />
            {!isCollapsed && field.children?.length > 0 && (
              <div className="mt-4 space-y-4 pl-2">
                {field.children.map((child: any) => (
                  <div key={child.uid}>{renderField(child)}</div>
                ))}
              </div>
            )}
          </div>
        );
      }

      // ── Instruction ─────────────────────────────────────────────────────────
      case "instruction":
        return (
          <div className="flex gap-3 px-5 py-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-0.5">{field.label}</p>
              {field.content && <p className="text-sm text-blue-700 leading-relaxed">{field.content}</p>}
            </div>
          </div>
        );

      // ── Separator ───────────────────────────────────────────────────────────
      case "separator":
        return <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-2" />;

      // ── Rating ──────────────────────────────────────────────���───────────────
      case "rating":
        return wrap(
          (field.ratingStyle || "star") === "star" ? (
            <StarRating
              value={val || 0}
              max={field.maxRating || 5}
              onChange={(v) => answer(field.uid, v, v)}
            />
          ) : (
            <NumericRating
              value={val || 0}
              max={field.maxRating || 5}
              onChange={(v) => answer(field.uid, v, v)}
            />
          )
        );

      // ── Location ────────────────────────────────────────────────────────────
      case "location":
        return wrap(
          <LocationField field={field} value={val} onChange={(v) => answer(field.uid, v)} inputCls={inputCls} />
        );

      // ── Temperature ─────────────────────────────────────────────────────────
      case "temperature": {
        const unit = field.unit || "celsius";
        const display = val ?? "";
        return wrap(<>
          <div className="flex gap-2">
            <input
              type="number"
              value={display}
              onChange={(e) => {
                const n = e.target.value === "" ? undefined : Number(e.target.value);
                answer(field.uid, n);
              }}
              placeholder="Enter temperature"
              step="0.1"
              className={inputCls}
            />
            <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm font-bold text-orange-700 whitespace-nowrap flex items-center gap-1">
              <Thermometer className="w-4 h-4" />
              °{unit === "celsius" ? "C" : "F"}
            </div>
          </div>
          {val !== undefined && val !== null && (
            <p className="text-xs text-gray-500">
              {unit === "celsius"
                ? `= ${((val * 9) / 5 + 32).toFixed(1)} °F`
                : `= ${(((val - 32) * 5) / 9).toFixed(1)} °C`}
            </p>
          )}
        </>);
      }

      // ── Barcode / QR ────────────────────────────────────────────────────────
      case "barcode":
        return wrap(<>
          <div className="flex gap-2">
            <input
              type="text"
              value={val || ""}
              onChange={(e) => answer(field.uid, e.target.value)}
              placeholder="Scan or type barcode / QR value…"
              className={inputCls}
            />
            <button
              type="button"
              title="Scan barcode"
              className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 transition-colors shrink-0"
            >
              <ScanLine className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <p className="text-xs text-gray-400">Use a barcode scanner or type the code manually</p>
        </>);

      // ── Formula ─────────────────────────────────────────────────────────────
      case "formula": {
        // Simple formula: total score from all answered fields
        const computed = totalScore;
        return wrap(
          <div className="flex items-center gap-3 px-5 py-4 bg-purple-50/60 border border-purple-100 rounded-xl">
            <Calculator className="w-6 h-6 text-purple-500 shrink-0" />
            <div>
              <p className="text-xs text-purple-600 font-medium mb-0.5">Calculated Value</p>
              <p className="text-2xl font-bold text-purple-800">{computed}</p>
              <p className="text-xs text-purple-500 mt-0.5">Auto-calculated from field scores</p>
            </div>
          </div>
        );
      }

      // ── Media Embed (SCRUM-2) — display-only, fillers cannot upload ─────────
      case "media_embed": {
        const embedRef = field.embeddedMediaData;
        return wrap(
          embedRef ? (
            <div className="rounded-xl overflow-hidden border-2 border-violet-200 bg-violet-50/40">
              <div className="flex items-center gap-2 px-3 py-2 bg-violet-100/60 border-b border-violet-200">
                <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                  {embedRef.mediaType === "image"
                    ? <Image className="w-2.5 h-2.5 text-white" />
                    : <Film className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-[10px] font-semibold text-violet-700 uppercase tracking-wide">Reference Example</span>
                <span className="text-[10px] text-violet-400 ml-auto truncate max-w-[160px]">{embedRef.name}</span>
              </div>
              {embedRef.mediaType === "image" ? (
                <img
                  src={embedRef.dataUrl}
                  alt={embedRef.name}
                  className="w-full max-h-72 object-contain bg-white"
                />
              ) : (
                <video
                  src={embedRef.dataUrl}
                  controls
                  className="w-full max-h-72 bg-black"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/20">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Film className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-sm text-violet-400 font-medium">No reference media provided</p>
              <p className="text-xs text-gray-400">The creator has not attached a reference image or video for this field.</p>
            </div>
          )
        );
      }

      default:
        return (
          <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-400">
            Field type "<strong>{field.typeId}</strong>" — rendering not implemented
          </div>
        );
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading checklist…</p>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">Checklist not found</h3>
          <button type="button" onClick={onBack} className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const fields: any[] = checklist.canvasFields || [];

  const formatSavedTime = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/20">

      {/* ── Draft Restore Banner ─────────────────────────────────────────── */}
      {showDraftBanner && pendingDraft && (
        <div className="bg-amber-50 border-b-2 border-amber-200 px-4 py-3 z-30 relative">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">You have a saved draft</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Saved {formatSavedTime(new Date(pendingDraft.updatedAt || pendingDraft.submittedAt))}
                {" · "}{pendingDraft.answers?.length || 0} field(s) answered
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={startFresh}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
              >
                Start Fresh
              </button>
              <button
                type="button"
                onClick={restoreDraft}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Draft Restored Pill ──────────────────────────────────────────── */}
      {draftRestored && !showDraftBanner && (
        <div className="bg-green-50 border-b border-green-100 px-4 py-2 z-30">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs font-medium text-green-700">Draft restored · Your previous answers have been loaded</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-6">
            {/* Last saved indicator */}
            {lastSaved && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                Saved {formatSavedTime(lastSaved)}
              </div>
            )}
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Completed</p>
              <p className="text-sm font-bold text-teal-600">{answeredCount} / {answerableFields.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Score</p>
              <p className="text-sm font-bold text-gray-800">{totalScore} pts</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-3xl mx-auto mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
            style={{ width: `${completion}%` }}
          />
        </div>
        <div className="max-w-3xl mx-auto mt-1 flex items-center justify-between">
          <p className="text-[10px] text-gray-400">{completion}% complete</p>
          {Object.keys(errors).length > 0 && (
            <p className="text-[10px] text-red-500">{Object.keys(errors).length} field(s) need attention</p>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Checklist header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{checklist.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {checklist.category && (
                  <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                    {checklist.category}
                  </span>
                )}
                {checklist.priority && (
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    checklist.priority === "urgent" ? "bg-red-50 text-red-700" :
                    checklist.priority === "high"   ? "bg-orange-50 text-orange-700" :
                    checklist.priority === "normal" ? "bg-blue-50 text-blue-700" :
                    "bg-gray-100 text-gray-600"}`}>
                    {checklist.priority.charAt(0).toUpperCase() + checklist.priority.slice(1)}
                  </span>
                )}
                {checklist.location && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" /> {checklist.location}
                  </span>
                )}
              </div>
            </div>
          </div>
          {checklist.notes && (
            <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">{checklist.notes}</p>
          )}
        </div>

        {/* Field list */}
        {fields.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">This checklist has no fields yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field: any) => {
              // Section with horizontal layout — two fields side by side
              if (field.typeId === "section" && field.layout === "horizontal") {
                const sectionChildren: any[] = field.children || [];
                return (
                  <div key={field.uid} className="rounded-2xl border-2 border-amber-200 bg-amber-50/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-100/60 to-transparent border-b border-amber-200">
                      <Heading1 className="w-4 h-4 text-amber-600 shrink-0" />
                      <h2 className="text-sm font-semibold text-gray-800 flex-1">{field.content || field.label}</h2>
                      <span className="px-2 py-0.5 bg-amber-300 text-amber-800 rounded-full text-[10px]">⇔ Side by side</span>
                    </div>
                    {sectionChildren.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No fields in this section</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 p-4">
                        {sectionChildren.map((child: any) => (
                          <div key={child.uid}>{renderField(child)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Section with vertical layout (default) — collapsible
              if (field.typeId === "section") {
                const sectionChildren: any[] = field.children || [];
                return (
                  <SectionExecution
                    key={field.uid}
                    field={field}
                    renderField={renderField}
                  />
                );
              }

              return <div key={field.uid}>{renderField(field)}</div>;
            })}
          </div>
        )}

        {/* ── Action Bar ─────────────────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-gray-100">

          {/* Declare Tag CTA */}
          <div className="flex items-center gap-3 mb-4 px-5 py-4 bg-blue-50 rounded-2xl border border-blue-200">
            <div className="w-9 h-9 bg-blue-100 border border-blue-300 rounded-xl flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-800">Spot an anomaly?</p>
              <p className="text-xs text-blue-500 mt-0.5">
                {tagCount > 0 ? `${tagCount} tag${tagCount > 1 ? "s" : ""} declared on this session` : "Declare a tag to flag issues, assign responsibility and set criticality"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTagModal(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <Tag className="w-4 h-4" /> Declare Tag
            </button>
          </div>

          {/* Immediate Action CTA */}
          <div className="flex items-center gap-3 mb-4 px-5 py-4 bg-orange-50 rounded-2xl border border-orange-200">
            <div className="w-9 h-9 bg-orange-100 border border-orange-300 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-800">Need immediate action?</p>
              <p className="text-xs text-orange-500 mt-0.5">
                {immediateActionCount > 0
                  ? `${immediateActionCount} immediate action${immediateActionCount > 1 ? "s" : ""} logged on this session`
                  : "Log an immediate corrective action, assign an owner and categorise it"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowImmediateActionModal(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <Zap className="w-4 h-4" /> Immediate Action
            </button>
          </div>

          {/* Save as Draft CTA */}
          <div className="flex items-center gap-3 mb-6 px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Save className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-700">Not ready to submit?</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {lastSaved
                  ? `Last saved ${formatSavedTime(lastSaved)}`
                  : "Save your progress and come back later to finish"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveDraft(false)}
              disabled={savingDraft}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-700 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingDraft ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-4 h-4" /> Save as Draft</>
              )}
            </button>
          </div>

          {/* Submit row */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-400">
              <span className="font-medium text-gray-600">{answerableFields.filter((f: any) => f.required).length}</span> required field(s)
              {Object.keys(errors).length > 0 && (
                <span className="ml-2 text-red-500 font-medium">· {Object.keys(errors).length} incomplete</span>
              )}
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2.5 px-8 py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:shadow-teal-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Checklist</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* ── Tag Declaration Modal ─────────────────────────────────────── */}
    {showTagModal && (
      <TagDeclarationModal
        checklistId={checklistId}
        checklistTitle={checklist?.title || ""}
        checklistLocation={checklist?.location || ""}
        reviewers={checklist?.managerName ? [checklist.managerName] : []}
        onClose={() => setShowTagModal(false)}
        onSaved={() => setTagCount((n) => n + 1)}
      />
    )}

    {/* ── Immediate Action Modal ────────────────────────────────────── */}
    {showImmediateActionModal && (
      <ImmediateActionModal
        checklistId={checklistId}
        checklistTitle={checklist?.title || ""}
        onClose={() => setShowImmediateActionModal(false)}
        onSaved={() => setImmediateActionCount((n) => n + 1)}
      />
    )}
    </>
  );
}