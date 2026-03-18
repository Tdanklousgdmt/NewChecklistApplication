import { CheckCircle2, Loader2, AlertTriangle, Cloud, CloudOff, X } from "lucide-react";
import { SaveStatus } from "../hooks/useAutosave";

interface AutosaveIndicatorProps {
  status: SaveStatus;
  lastSaved: number | null;
  hasUnsavedChanges: boolean;
  isOnline: boolean;
  error?: string | null;
  onDismissError?: () => void;
}

export function AutosaveIndicator({
  status,
  lastSaved,
  hasUnsavedChanges,
  isOnline,
  error,
  onDismissError,
}: AutosaveIndicatorProps) {
  const getTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="flex items-center gap-3">
      {/* Online/Offline Status */}
      {!isOnline && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
          <CloudOff className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[10px] text-amber-600 font-medium">Offline</span>
        </div>
      )}

      {/* Save Status */}
      <div className="flex items-center gap-2">
        {status === 'saving' && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Saving...</span>
          </div>
        )}

        {status === 'saved' && (
          <div className="flex items-center gap-2 text-green-600 animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium">Saved {getTimeAgo(lastSaved)}</span>
          </div>
        )}

        {status === 'idle' && lastSaved && !hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-gray-400">
            <Cloud className="w-4 h-4" />
            <span className="text-xs">Saved {getTimeAgo(lastSaved)}</span>
          </div>
        )}

        {status === 'idle' && hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-amber-600">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs">Unsaved changes</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs text-red-600 font-medium">Save failed</span>
            {error && onDismissError && (
              <button
                onClick={onDismissError}
                className="ml-1 text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {status === 'conflict' && (
          <div className="flex items-center gap-2 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">Conflict detected</span>
          </div>
        )}
      </div>
    </div>
  );
}
