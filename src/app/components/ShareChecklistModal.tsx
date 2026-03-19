import { useEffect, useState } from "react";
import {
  X, Link2, Download, Check, QrCode, Share2, Printer,
} from "lucide-react";
import QRCode from "qrcode";

interface ShareChecklistModalProps {
  checklistId: string;
  checklistTitle: string;
  onClose: () => void;
}

export function ShareChecklistModal({
  checklistId,
  checklistTitle,
  onClose,
}: ShareChecklistModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Build the deep-link URL
  const shareUrl = `${window.location.origin}${window.location.pathname}?checklist=${checklistId}`;

  // Generate QR code on mount
  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#030213", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl);
  }, [shareUrl]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input
      const el = document.getElementById("share-url-input") as HTMLInputElement;
      el?.select();
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href     = qrDataUrl;
    a.download = `${checklistTitle.replace(/[^a-z0-9]/gi, "_")}_QR.png`;
    a.click();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Panel */}
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
              <div>
                <p className="text-sm font-semibold text-gray-800">Share Checklist</p>
                <p className="text-xs text-gray-400 truncate max-w-[180px]">{checklistTitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* QR Code */}
          <div className="px-5 py-5">
            <div className="flex flex-col items-center">
              {qrDataUrl ? (
                <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-52 h-52 rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-52 h-52 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-gray-100">
                  <div className="animate-pulse flex flex-col items-center gap-2">
                    <QrCode className="w-8 h-8 text-gray-300" />
                    <p className="text-xs text-gray-400">Generating…</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3 text-center">
                Scan to fill out this checklist instantly
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={handleDownloadQR}
                disabled={!qrDataUrl}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-[#2abaad] text-white rounded-xl text-sm font-medium hover:bg-[#24a699] transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Download QR
              </button>
              <button
                type="button"
                onClick={handleDownloadQR}
                disabled={!qrDataUrl}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Download to print"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>

            {/* Link + copy */}
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Shareable link
              </p>
              <div className="flex items-center gap-2">
                <input
                  id="share-url-input"
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    copied
                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-3 text-center">
              Anyone with this link or QR code can access and fill out this checklist.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
