import { useState, useEffect, useCallback, useRef } from "react";
import { ChecklistStep1 } from "./ChecklistStep1";
import { ChecklistStep2, CanvasField } from "./ChecklistStep2";
import { ChecklistStep3 } from "./ChecklistStep3";
import { AutosaveIndicator } from "./AutosaveIndicator";
import { ConflictModal } from "./ConflictModal";
import { useAutosave, ChecklistVersion } from "../hooks/useAutosave";
import { checklistService, ChecklistData } from "../services/checklistService";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface ChecklistCreatorProps {
  onBack: () => void;
  checklistId?: string; // If provided, load and edit existing checklist
}

export function ChecklistCreator({ onBack, checklistId: existingChecklistId }: ChecklistCreatorProps) {
  const [step, setStep] = useState(1);
  const [checklistId, setChecklistId] = useState(existingChecklistId || '');
  // Ref keeps the ID current *immediately* after first creation so the next
  // debounced save (before the state re-render) calls PUT instead of POST.
  const checklistIdRef = useRef(existingChecklistId || '');
  // Set both ref and state together
  const applyChecklistId = (id: string) => {
    checklistIdRef.current = id;
    setChecklistId(id);
  };

  // When "Save anyway" is chosen, the very next save must skip duplicate check.
  const bypassDuplicateRef = useRef(false);

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictVersions, setConflictVersions] = useState<{
    local: ChecklistVersion;
    server: ChecklistVersion;
  } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!existingChecklistId);

  // Initial checklist data structure
  const initialData: ChecklistData = {
    title: '',
    category: '',
    priority: 'normal',
    validFrom: '',
    validTo: '',
    frequency: 'ONE_OFF',
    assignedTo: '',
    location: '',
    validateChecklist: false,
    canvasFields: [],
  };

  // Autosave hook
  const {
    data: checklistData,
    updateData,
    status,
    lastSaved,
    version,
    hasUnsavedChanges,
    error,
    forceSave,
    cancel: cancelChanges,
    isOnline,
  } = useAutosave<ChecklistData>(
    initialData,
    checklistId,
    {
      debounceMs: 2000,
      enableOffline: true,

      onSave: async (data) => {
        // Pick up and reset the bypass flag atomically
        const bypass = bypassDuplicateRef.current;
        bypassDuplicateRef.current = false;

        // Use ref (not state) so we always have the latest ID even if React
        // hasn't re-rendered yet after the first createDraft call.
        const currentId = checklistIdRef.current;

        if (!currentId) {
          const newDraft = await checklistService.createDraft(data, bypass);
          applyChecklistId(newDraft.id);
          return newDraft;
        } else {
          return await checklistService.saveChecklist(currentId, data, bypass);
        }
      },

      onConflict: async (local, server) => {
        setConflictVersions({ local, server });
        setShowConflictModal(true);

        return new Promise((resolve) => {
          (window as any).__conflictResolver = resolve;
        });
      },
    }
  );

  // Load existing checklist if editing
  useEffect(() => {
    if (existingChecklistId) {
      checklistService.getChecklist(existingChecklistId).then((version) => {
        if (version) {
          updateData(version.data);
        }
        setLoadingExisting(false);
      });
    }
  }, [existingChecklistId]);

  // Auto-generate name on first save
  useEffect(() => {
    if (!checklistId && checklistData.category && !checklistData.title) {
      updateData({
        ...checklistData,
        title: checklistService.generateName(checklistData),
      });
    }
  }, [checklistData.category]);

  // Handle conflict resolution
  const handleConflictResolve = (choice: 'local' | 'server') => {
    if (conflictVersions && (window as any).__conflictResolver) {
      (window as any).__conflictResolver(choice);
      delete (window as any).__conflictResolver;
    }
    setShowConflictModal(false);
    setConflictVersions(null);

    if (choice === 'local') {
      // Mark next save to bypass duplicate detection, then force it immediately
      bypassDuplicateRef.current = true;
      forceSave();
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      onBack();
    }
  };

  const confirmCancel = () => {
    cancelChanges(); // Revert to last saved state
    setShowCancelConfirm(false);
    onBack();
  };

  // Handle step navigation with autosave
  const handleStepChange = (newStep: number) => {
    forceSave(); // Force save before navigation
    setStep(newStep);
  };

  // Handle publish
  const handlePublish = async () => {
    forceSave();
    if (checklistId) {
      await checklistService.publishChecklist(checklistId);
    }
    onBack();
  };

  // Always-fresh ref so stable callbacks can read latest data
  const checklistDataRef = useRef(checklistData);
  checklistDataRef.current = checklistData;

  // Stable setter that always uses the latest checklistData via ref
  const handleSetCanvasFields = useCallback(
    (fields: React.SetStateAction<CanvasField[]>) => {
      const current = checklistDataRef.current;
      const newFields =
        typeof fields === "function"
          ? (fields as (prev: CanvasField[]) => CanvasField[])(current.canvasFields)
          : fields;
      updateData({ ...current, canvasFields: newFields });
    },
    [updateData]
  );

  return (
    <div className="relative">
      {/* Autosave Indicator - Floating Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <AutosaveIndicator
          status={status}
          lastSaved={lastSaved}
          hasUnsavedChanges={hasUnsavedChanges}
          isOnline={isOnline}
          error={error}
        />
      </div>

      {/* Checklist Name - Floating Top Left */}
      {checklistData.title && (
        <div className="fixed top-6 left-6 z-50">
          <div className="px-4 py-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Draft</p>
            <p className="text-sm text-gray-700 font-medium mt-0.5">{checklistData.title}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      {step === 1 && (
        <ChecklistStep1
          initialData={checklistData}
          onNext={(data) => {
            updateData({ ...checklistData, ...data });
            handleStepChange(2);
          }}
          onCancel={handleCancel}
        />
      )}

      {step === 2 && (
        <ChecklistStep2
          onBack={() => handleStepChange(1)}
          onNext={() => handleStepChange(3)}
          canvasFields={checklistData.canvasFields}
          setCanvasFields={handleSetCanvasFields}
        />
      )}

      {step === 3 && (
        <ChecklistStep3
          onBack={() => handleStepChange(2)}
          canvasFields={checklistData.canvasFields}
          metadata={{
            title: checklistData.title,
            category: checklistData.category,
            priority: checklistData.priority,
            validFrom: checklistData.validFrom,
            validTo: checklistData.validTo,
            frequency: checklistData.frequency,
            assignedTo: checklistData.assignedTo,
            location: checklistData.location,
            validateChecklist: checklistData.validateChecklist,
            managerName: checklistData.managerName,
          }}
          onPublish={handlePublish}
        />
      )}

      {/* Conflict Resolution Modal */}
      {conflictVersions && (
        <ConflictModal
          isOpen={showConflictModal}
          localVersion={conflictVersions.local}
          serverVersion={conflictVersions.server}
          onResolve={handleConflictResolve}
          onClose={() => setShowConflictModal(false)}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Unsaved Changes</h3>
                <p className="text-sm text-gray-500 mt-1">
                  You have unsaved changes. If you leave now, your changes will be lost.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loadingExisting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Loading Checklist</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Please wait while we load the checklist.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}