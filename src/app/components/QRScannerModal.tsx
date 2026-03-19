import { useEffect, useRef, useState, useCallback } from "react";
import {
  X, QrCode, Camera, CameraOff, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import jsQR from "jsqr";

interface QRScannerModalProps {
  onClose: () => void;
  onResult: (checklistId: string) => void;
}

type ScanState = "requesting" | "scanning" | "detected" | "error";

export function QRScannerModal({ onClose, onResult }: QRScannerModalProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanState, setScanState]   = useState<ScanState>("requesting");
  const [errorMsg, setErrorMsg]     = useState("");
  const [detected, setDetected]     = useState("");

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleClose = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    onClose();
  }, [onClose]);

  // Start camera
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 640 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanState("scanning");
          scanLoop();
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(
            err?.name === "NotAllowedError"
              ? "Camera permission denied. Please allow camera access in your browser settings."
              : "Could not access camera. Please ensure no other app is using it."
          );
          setScanState("error");
        }
      }
    }

    startCamera();
    return () => { cancelled = true; cancelAnimationFrame(rafRef.current); };
  }, []);

  const scanLoop = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const { videoWidth: w, videoHeight: h } = video;
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code      = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });

    if (code?.data) {
      // Try to extract a checklist ID from the URL
      let checklistId: string | null = null;
      try {
        const url    = new URL(code.data);
        checklistId  = url.searchParams.get("checklist");
      } catch {
        // Raw ID (not a URL)
        if (code.data.length > 4) checklistId = code.data.trim();
      }

      if (checklistId) {
        cancelAnimationFrame(rafRef.current);
        setDetected(checklistId);
        setScanState("detected");
        streamRef.current?.getTracks().forEach(t => t.stop());
        // Short delay for visual feedback before navigating
        setTimeout(() => onResult(checklistId!), 800);
        return;
      }
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onResult]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
              <QrCode className="w-4 h-4 text-[#2abaad]" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Scan QR Code</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black overflow-hidden" style={{ aspectRatio: "1/1" }}>
          {/* Video feed */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            style={{ display: scanState === "scanning" || scanState === "detected" ? "block" : "none" }}
          />

          {/* Hidden canvas for jsQR processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning overlay */}
          {scanState === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Dark vignette */}
              <div className="absolute inset-0 bg-black/30" />
              {/* Scan area */}
              <div className="relative w-52 h-52">
                {/* Corner brackets */}
                {[
                  "top-0 left-0 border-t-2 border-l-2 rounded-tl-xl",
                  "top-0 right-0 border-t-2 border-r-2 rounded-tr-xl",
                  "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl",
                  "bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl",
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-8 h-8 border-[#2abaad] ${cls}`} />
                ))}
                {/* Scanning line animation */}
                <div className="absolute left-1 right-1 top-0 h-0.5 bg-[#2abaad] opacity-80 animate-scan-line" />
              </div>
            </div>
          )}

          {/* Requesting permission */}
          {scanState === "requesting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900">
              <Loader2 className="w-8 h-8 text-[#2abaad] animate-spin" />
              <p className="text-sm text-white">Requesting camera…</p>
            </div>
          )}

          {/* Detected! */}
          {scanState === "detected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-teal-900/80 backdrop-blur-sm">
              <div className="w-16 h-16 bg-[#2abaad] rounded-full flex items-center justify-center shadow-lg shadow-teal-400/40">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm font-semibold text-white">QR code detected!</p>
              <p className="text-xs text-teal-200">Opening checklist…</p>
            </div>
          )}

          {/* Error */}
          {scanState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center">
              <div className="w-14 h-14 bg-red-900/40 rounded-full flex items-center justify-center">
                <CameraOff className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-sm text-white font-medium">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          {scanState === "scanning" && (
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-[#2abaad] animate-pulse" />
              <p className="text-sm text-gray-600">Point the camera at a checklist QR code</p>
            </div>
          )}
          {scanState === "requesting" && (
            <p className="text-sm text-gray-500 text-center">Allow camera access to scan</p>
          )}
          {scanState === "error" && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2abaad] text-white rounded-xl text-sm font-medium hover:bg-[#24a699] transition-colors"
            >
              Close
            </button>
          )}
          {scanState === "detected" && (
            <p className="text-sm text-teal-600 font-medium text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Navigating to checklist…
            </p>
          )}
        </div>
      </div>

      {/* Inline keyframe for the scanning line */}
      <style>{`
        @keyframes scan-line {
          0%   { top: 4px;  opacity: 1; }
          50%  { top: calc(100% - 4px); opacity: 1; }
          100% { top: 4px;  opacity: 1; }
        }
        .animate-scan-line { animation: scan-line 2s linear infinite; }
      `}</style>
    </div>
  );
}
