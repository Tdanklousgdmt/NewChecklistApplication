import { useState, useEffect, useRef, useCallback } from 'react';
import { DuplicateChecklistError } from '../services/checklistService';

export interface ChecklistVersion {
  id: string;
  version: number;
  updatedAt: number;
  data: any;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

interface AutosaveOptions {
  debounceMs?: number;
  onSave?: (data: any) => Promise<ChecklistVersion>;
  /** Called when a duplicate (same name + frequency) is detected on the server. */
  onConflict?: (local: ChecklistVersion, server: ChecklistVersion) => Promise<'local' | 'server' | 'merge'>;
  enableOffline?: boolean;
}

/**
 * Recursively strips base64 `dataUrl` values from any object before it is
 * written to localStorage.  This prevents QuotaExceededError when fields carry
 * embedded reference media (images / videos can be several MB each).
 * The server already persists the full binary payload; localStorage is only
 * used as a lightweight offline draft cache.
 */
function stripDataUrls(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stripDataUrls);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
      if (key === 'dataUrl') {
        // Replace binary blob with a sentinel so we know media existed
        out[key] = null;
      } else {
        out[key] = stripDataUrls((value as Record<string, unknown>)[key]);
      }
    }
    return out;
  }
  return value;
}

/** Try localStorage.setItem and silently swallow QuotaExceededError. */
function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (err instanceof DOMException && (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      console.warn(`Autosave: localStorage quota exceeded for "${key}". ` +
        'Binary media has already been stripped — the draft structure is too large. ' +
        'Data is still saved to the server.');
    } else {
      console.warn('Autosave: localStorage.setItem failed:', err);
    }
    return false;
  }
}

export function useAutosave<T>(
  initialData: T,
  checklistId: string,
  options: AutosaveOptions = {}
) {
  const {
    debounceMs = 2000,
    onSave,
    onConflict,
    enableOffline = true,
  } = options;

  const [data, setData] = useState<T>(initialData);
  const [savedData, setSavedData] = useState<T>(initialData);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [version, setVersion] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimeoutRef  = useRef<NodeJS.Timeout>();
  const isOnlineRef     = useRef(true);
  const pendingSaveRef  = useRef<T | null>(null);

  // ── Online / offline tracking ────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      if (pendingSaveRef.current) performSave(pendingSaveRef.current);
    };
    const handleOffline = () => { isOnlineRef.current = false; };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Restore from localStorage on mount ──────────────────────────────────
  useEffect(() => {
    if (enableOffline && checklistId) {
      const stored = localStorage.getItem(`checklist_${checklistId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setData(parsed.data);
          setSavedData(parsed.data);
          setVersion(parsed.version);
          setLastSaved(parsed.updatedAt);
        } catch (e) {
          console.error('Failed to load checklist from localStorage', e);
        }
      }
    }
  }, [checklistId, enableOffline]);

  // ── Actual save ──────────────────────────────────────────────────────────
  const performSave = useCallback(async (dataToSave: T) => {
    setStatus('saving');
    setError(null);

    try {
      // Optimistic local save — strip binary blobs to stay within quota
      if (enableOffline) {
        const localVersion: ChecklistVersion = {
          id: checklistId,
          version: version + 1,
          updatedAt: Date.now(),
          data: stripDataUrls(dataToSave),
        };
        safeLocalStorageSet(
          `checklist_${checklistId}`,
          JSON.stringify(localVersion)
        );
      }

      if (isOnlineRef.current && onSave) {
        try {
          const serverVersion = await onSave(dataToSave);
          setVersion(serverVersion.version);
          setSavedData(dataToSave);
          setLastSaved(Date.now());
          setStatus('saved');
          setHasUnsavedChanges(false);
          pendingSaveRef.current = null;
          setTimeout(() => setStatus('idle'), 3000);
        } catch (saveError: any) {
          // ── Duplicate detected (same name + frequency) ─────────────────
          if (saveError instanceof DuplicateChecklistError || saveError?.name === 'DuplicateChecklistError') {
            setStatus('conflict');

            if (onConflict) {
              const localVer: ChecklistVersion = {
                id: checklistId,
                version: version + 1,
                updatedAt: Date.now(),
                data: dataToSave,
              };
              // server version carries the duplicate checklist info in .data
              const conflictVer: ChecklistVersion = {
                id: saveError.duplicate?.id || '',
                version: saveError.duplicate?.version || 0,
                updatedAt: saveError.duplicate?.updatedAt || Date.now(),
                data: saveError.duplicate,
              };

              const resolution = await onConflict(localVer, conflictVer);

              if (resolution === 'local') {
                // User chose "Save Anyway" — retry without duplicate check
                // (handled in ChecklistCreator by calling forceSave again with a flag)
              }
              // For 'server' the user simply aborts; no further action needed
            }
          } else {
            throw saveError;
          }
        }
      } else {
        // Offline mode
        pendingSaveRef.current = dataToSave;
        setSavedData(dataToSave);
        setLastSaved(Date.now());
        setStatus('saved');
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save');
      console.error('Autosave error:', err);
    }
  }, [checklistId, version, onSave, onConflict, enableOffline]);

  // ── Debounced trigger ────────────────────────────────────────────────────
  const triggerSave = useCallback((newData: T) => {
    setHasUnsavedChanges(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => performSave(newData), debounceMs);
  }, [debounceMs, performSave]);

  const updateData = useCallback((newData: T | ((prev: T) => T)) => {
    setData(prev => {
      const updated = typeof newData === 'function' ? (newData as (prev: T) => T)(prev) : newData;
      triggerSave(updated);
      return updated;
    });
  }, [triggerSave]);

  const forceSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    performSave(data);
  }, [data, performSave]);

  const cancel = useCallback(() => {
    setData(savedData);
    setHasUnsavedChanges(false);
    setStatus('idle');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, [savedData]);

  // Cleanup
  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; forceSave(); }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, forceSave]);

  return {
    data,
    updateData,
    status,
    lastSaved,
    version,
    hasUnsavedChanges,
    error,
    forceSave,
    cancel,
    isOnline: isOnlineRef.current,
  };
}