import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Copy,
  ChevronRight,
  ChevronLeft,
  Menu,
  ChevronDown,
  Check,
  Plus,
  X,
  CheckCircle2,
  MapPin,
  Users,
  Tag,
  FileText,
  Clock,
  RotateCcw,
  Repeat,
  Zap,
  Minus,
  Plus,
  ShieldCheck,
  ShieldOff,
  BookMarked,
  Trash2,
  UserCheck,
  ClipboardList,
  Info,
  Flag,
  AlertTriangle,
  TrendingUp,
  Circle,
  ChevronDown,
} from "lucide-react";
import { AssignToModal, formatAssignToLabel } from "./AssignToModal";
import { LocationModal, formatLocationLabel } from "./LocationModal";
import type { LocationSelection } from "./LocationModal";
import { fetchCategories, fetchManagers, createCategory, createPlantUser, type Category, type PlantUser } from "../services/dbService";

type Frequency = "ONE_OFF" | "PERMANENT" | "RECURRING";
type Interval = "Day" | "Week" | "Month" | "Year";
type ValidUntil = "NEXT_OCCURRENCE" | "TIME_PERIOD";
type ResponseMode = "DISCARD" | "RETAIN_ALL" | "KEEP_LAST";
type Priority = "urgent" | "high" | "normal" | "low";

const priorityOptions: { value: Priority; label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string; activeBg: string }[] = [
  { value: "urgent", label: "Urgent", icon: <AlertTriangle className="w-5 h-5" />, color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-400", activeBg: "bg-red-500" },
  { value: "high",   label: "High",   icon: <Flag className="w-5 h-5" />,          color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-400", activeBg: "bg-orange-500" },
  { value: "normal", label: "Normal", icon: <TrendingUp className="w-5 h-5" />,    color: "text-blue-600",   bgColor: "bg-blue-50",   borderColor: "border-blue-400",   activeBg: "bg-blue-500"   },
  { value: "low",    label: "Low",    icon: <Circle className="w-5 h-5" />,        color: "text-gray-500",   bgColor: "bg-gray-50",   borderColor: "border-gray-300",   activeBg: "bg-gray-400"   },
];

const frequencyOptions: { value: Frequency; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "ONE_OFF",   label: "One Off",   icon: <Zap className="w-4 h-4" />,    description: "Single occurrence" },
  { value: "PERMANENT", label: "Permanent", icon: <Clock className="w-4 h-4" />,  description: "Always active"     },
  { value: "RECURRING", label: "Recurring", icon: <Repeat className="w-4 h-4" />, description: "Repeats regularly" },
];

interface SettingRowProps {
  enabled: boolean;
  onToggle: () => void;
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
  labelOn: string;
  labelOff: string;
  descOn: string;
  descOff: string;
}

function SettingRow({ enabled, onToggle, iconOn, iconOff, labelOn, labelOff, descOn, descOff }: SettingRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 w-full text-left transition-all duration-200 ${
        enabled ? "border-[#2abaad] bg-teal-50/60" : "border-gray-100 bg-gray-50 hover:border-gray-200"
      }`}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${enabled ? "bg-[#2abaad] text-white" : "bg-gray-200 text-gray-400"}`}>
        {enabled ? iconOn : iconOff}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs tracking-wide uppercase transition-colors ${enabled ? "text-[#2abaad]" : "text-gray-500"}`}>
          {enabled ? labelOn : labelOff}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5 normal-case">{enabled ? descOn : descOff}</p>
      </div>
      <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${enabled ? "bg-[#2abaad]" : "bg-gray-200"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  hint?: string;
}

function FormField({ label, required, icon, children, hint }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-gray-400">{icon}</span>}
        <label className="text-xs tracking-wide text-gray-500 uppercase">
          {label}
          {required && <span className="text-[#2abaad] ml-0.5">*</span>}
        </label>
        {hint && <span className="ml-auto text-[11px] text-gray-400 normal-case">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

interface ChecklistStep1Props {
  onNext?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
  onOpenNav?: () => void;
  /** Org roster rows (managers) — when set, manager picker uses real user ids for validation routing. */
  managerRoster?: { userId: string; displayName: string; email: string; appRole: string }[];
  assignRosterUsers?: { id: string; name: string }[];
  assignTeamOptions?: { id: string; name: string }[];
}

export function ChecklistStep1({
  onNext,
  onCancel,
  initialData,
  onOpenNav,
  managerRoster,
  assignRosterUsers,
  assignTeamOptions,
}: ChecklistStep1Props) {
  const [validateChecklist, setValidateChecklist] = useState(initialData?.validateChecklist ?? false);
  const [responseMode, setResponseMode] = useState<ResponseMode>(initialData?.responseMode ?? "DISCARD");
  const [managerName, setManagerName] = useState(initialData?.managerName ?? "");
  const [managerUserId, setManagerUserId] = useState(initialData?.managerUserId ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [priority, setPriority] = useState<Priority>(initialData?.priority ?? "normal");
  const [validFrom, setValidFrom] = useState(initialData?.validFrom ?? "");
  const [validTo, setValidTo] = useState(initialData?.validTo ?? "");
  const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency ?? "ONE_OFF");
  const [assignedTo, setAssignedTo] = useState(initialData?.assignedTo ?? "");
  const [assignedSelections, setAssignedSelections] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSelections, setLocationSelections] = useState<LocationSelection[]>([]);
  const [locationSelectedIds, setLocationSelectedIds] = useState<Set<string>>(new Set());

  const [repeatEvery, setRepeatEvery] = useState(initialData?.repeatEvery ?? 1);
  const [interval, setInterval] = useState<Interval>(initialData?.interval ?? "Week");
  const [startAt, setStartAt] = useState(initialData?.startAt ?? "");
  const [validUntil, setValidUntil] = useState<ValidUntil>(initialData?.validUntil ?? "NEXT_OCCURRENCE");
  const [validHour, setValidHour] = useState(initialData?.validHour ?? "");

  const intervals: Interval[] = ["Day", "Week", "Month", "Year"];
  const showRetentionCard = responseMode !== "KEEP_LAST";
  const showKeepLastToggle = responseMode !== "RETAIN_ALL";

  // ── Category & Manager data from DB ──────────────────────────────────────────
  const [categories, setCategories]           = useState<Category[]>([]);
  const [managers, setManagers]               = useState<PlantUser[]>([]);
  const [dbReady, setDbReady]                 = useState(false);
  const [catOpen, setCatOpen]                 = useState(false);
  const [managerOpen, setManagerOpen]         = useState(false);
  const [catSearch, setCatSearch]             = useState("");
  const [managerSearch, setManagerSearch]     = useState("");
  const [addingCat, setAddingCat]             = useState(false);
  const [newCatName, setNewCatName]           = useState("");
  const [addingManager, setAddingManager]     = useState(false);
  const [newManagerName, setNewManagerName]   = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");

  useEffect(() => {
    Promise.all([fetchCategories(), fetchManagers()]).then(([catResult, manResult]) => {
      setCategories(catResult.categories);
      setManagers(manResult.users);
      setDbReady(catResult.fromDB);
    });
  }, []);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const created = await createCategory(newCatName.trim());
    if (created) {
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCategory(created.name);
    } else {
      // DB not ready — just use the typed value
      setCategory(newCatName.trim());
    }
    setNewCatName(""); setAddingCat(false); setCatOpen(false);
  };

  const handleAddManager = async () => {
    if (!newManagerName.trim()) return;
    const created = await createPlantUser(newManagerName.trim(), newManagerEmail.trim() || undefined, "manager");
    const displayName = newManagerName.trim();
    if (created) {
      setManagers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setManagerName(created.name);
    } else {
      setManagerName(displayName);
    }
    setNewManagerName(""); setNewManagerEmail(""); setAddingManager(false); setManagerOpen(false);
  };

  const filteredCats = categories.filter(c => catSearch === "" || c.name.toLowerCase().includes(catSearch.toLowerCase()));

  const orgManagersForPicker = (managerRoster ?? [])
    .filter((m) => m.appRole === "manager")
    .map((m) => ({
      id: m.userId,
      name: m.displayName || m.email || m.userId,
      email: m.email,
    }));

  const filteredManagers = (orgManagersForPicker.length > 0 ? orgManagersForPicker : managers).filter((m) =>
    managerSearch === "" || `${m.name} ${m.email ?? ""}`.toLowerCase().includes(managerSearch.toLowerCase()),
  );

  const inputClass =
    "w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-base text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad] transition-all duration-150";

  const handleClear = () => {
    setTitle(""); setCategory(""); setValidFrom(""); setValidTo("");
    setFrequency("ONE_OFF"); setAssignedTo(""); setAssignedSelections([]);
    setLocation(""); setLocationSelections([]); setLocationSelectedIds(new Set());
    setRepeatEvery(1); setInterval("Week"); setStartAt("");
    setValidUntil("NEXT_OCCURRENCE"); setValidHour("");
    setValidateChecklist(false); setResponseMode("DISCARD"); setManagerName(""); setManagerUserId("");
  };

  const handleNext = () => {
    onNext?.({
      title,
      category,
      priority,
      validFrom,
      validTo,
      frequency,
      assignedTo,
      location,
      validateChecklist,
      responseMode,
      managerName,
      managerUserId: orgManagersForPicker.length > 0 ? managerUserId : undefined,
      repeatEvery,
      interval,
      startAt,
      validUntil,
      validHour,
    });
  };

  // ─────────────────────────────────────────────────────��───────
  // MOBILE LAYOUT (sm:hidden)
  // ─────────────────────────────────────────────────────────────
  const mobileInputClass =
    "w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-base text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad] transition-all";

  const MobileSection = ({ title: sTitle, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="px-4 py-3 border-b border-gray-50 rounded-t-2xl">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{sTitle}</h2>
      </div>
      <div className="px-4 py-4 flex flex-col gap-4">{children}</div>
    </div>
  );

  const mobileLayout = (
    <div className="sm:hidden flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenNav}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">New Checklist</p>
            <p className="text-[11px] text-gray-400">Step 1 of 3</p>
          </div>

          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Copy className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 px-4 pb-3">
          <div className="flex-1 h-1 rounded-full bg-[#2abaad]" />
          <div className="flex-1 h-1 rounded-full bg-gray-200" />
          <div className="flex-1 h-1 rounded-full bg-gray-200" />
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 space-y-4"
        style={{ WebkitOverflowScrolling: "touch" }}>

        {/* Section 1 — Submission settings */}
        <MobileSection title="Submission settings">
          {/* Validation toggle */}
          <div
            onClick={() => setValidateChecklist(!validateChecklist)}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer active:scale-[0.98] transition-all ${
              validateChecklist ? "border-[#2abaad] bg-teal-50" : "border-gray-100 bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${validateChecklist ? "bg-[#2abaad] text-white" : "bg-gray-200 text-gray-400"}`}>
                {validateChecklist ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
              </span>
              <div>
                <p className={`text-sm font-semibold ${validateChecklist ? "text-[#2abaad]" : "text-gray-600"}`}>
                  {validateChecklist ? "Validation on" : "No validation"}
                </p>
                <p className="text-xs text-gray-400">{validateChecklist ? "Requires manager approval" : "Submissions skip review"}</p>
              </div>
            </div>
            <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${validateChecklist ? "bg-[#2abaad]" : "bg-gray-200"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${validateChecklist ? "translate-x-5" : "translate-x-0.5"}`} />
            </span>
          </div>

          {/* Manager field */}
          {validateChecklist && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="flex items-center gap-1.5 text-xs text-[#2abaad] uppercase tracking-wide mb-2">
                <UserCheck className="w-3.5 h-3.5" /> Send to manager *
              </label>
              <MobileDropdown
                value={managerName}
                placeholder="Select a manager"
                open={managerOpen}
                onToggle={() => { setManagerOpen(!managerOpen); setCatOpen(false); }}
                onClose={() => setManagerOpen(false)}
                search={managerSearch}
                onSearch={setManagerSearch}
                items={filteredManagers.map(m => ({ id: m.id, label: m.name, sublabel: m.email ?? undefined }))}
                onSelect={(item) => {
                  setManagerName(item.label);
                  setManagerUserId(orgManagersForPicker.length > 0 ? item.id : "");
                  setManagerOpen(false);
                  setManagerSearch("");
                }}
                onAddNew={orgManagersForPicker.length > 0 ? undefined : () => setAddingManager(true)}
                addingNew={addingManager}
                newName={newManagerName}
                onNewNameChange={setNewManagerName}
                onConfirmNew={handleAddManager}
                onCancelNew={() => { setAddingManager(false); setNewManagerName(""); setNewManagerEmail(""); }}
                dbReady={dbReady}
                extraNewFields={
                  <input
                    type="email"
                    inputMode="email"
                    value={newManagerEmail}
                    onChange={(e) => setNewManagerEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad]"
                  />
                }
              />
            </div>
          )}

          {/* Response mode */}
          {showRetentionCard && (
            <div
              onClick={() => setResponseMode(responseMode === "RETAIN_ALL" ? "DISCARD" : "RETAIN_ALL")}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer active:scale-[0.98] transition-all ${
                responseMode === "RETAIN_ALL" ? "border-[#2abaad] bg-teal-50" : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${responseMode === "RETAIN_ALL" ? "bg-[#2abaad] text-white" : "bg-gray-200 text-gray-400"}`}>
                  {responseMode === "RETAIN_ALL" ? <BookMarked className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${responseMode === "RETAIN_ALL" ? "text-[#2abaad]" : "text-gray-600"}`}>
                    {responseMode === "RETAIN_ALL" ? "Retain responses" : "Discard responses"}
                  </p>
                  <p className="text-xs text-gray-400">{responseMode === "RETAIN_ALL" ? "All answers saved" : "Answers not stored"}</p>
                </div>
              </div>
              <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${responseMode === "RETAIN_ALL" ? "bg-[#2abaad]" : "bg-gray-200"}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${responseMode === "RETAIN_ALL" ? "translate-x-5" : "translate-x-0.5"}`} />
              </span>
            </div>
          )}

          {showKeepLastToggle && (
            <div
              onClick={() => setResponseMode(responseMode === "KEEP_LAST" ? "DISCARD" : "KEEP_LAST")}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer active:scale-[0.98] transition-all ${
                responseMode === "KEEP_LAST" ? "border-[#2abaad] bg-teal-50" : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${responseMode === "KEEP_LAST" ? "bg-[#2abaad] text-white" : "bg-gray-200 text-gray-400"}`}>
                  <ClipboardList className="w-5 h-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-semibold ${responseMode === "KEEP_LAST" ? "text-[#2abaad]" : "text-gray-600"}`}>Keep only last form</p>
                    <span className="w-4 h-4 rounded-full bg-sky-400 flex items-center justify-center">
                      <Info className="w-2.5 h-2.5 text-white" />
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Overwrites previous submissions</p>
                </div>
              </div>
              <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${responseMode === "KEEP_LAST" ? "bg-[#2abaad]" : "bg-gray-200"}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${responseMode === "KEEP_LAST" ? "translate-x-5" : "translate-x-0.5"}`} />
              </span>
            </div>
          )}
        </MobileSection>

        {/* Section 2 — Checklist info */}
        <MobileSection title="Checklist info">
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wide mb-2">
              <FileText className="w-3.5 h-3.5" /> Title *
            </label>
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly Safety Inspection"
              className={mobileInputClass}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wide mb-2">
              <Tag className="w-3.5 h-3.5" /> Category *
            </label>
            <MobileDropdown
              value={category}
              placeholder="Select a category"
              open={catOpen}
              onToggle={() => { setCatOpen(!catOpen); setManagerOpen(false); }}
              onClose={() => setCatOpen(false)}
              search={catSearch}
              onSearch={setCatSearch}
              items={filteredCats.map(c => ({ id: c.id, label: c.name, color: c.color }))}
              onSelect={(item) => { setCategory(item.label); setCatOpen(false); setCatSearch(""); }}
              onAddNew={() => setAddingCat(true)}
              addingNew={addingCat}
              newName={newCatName}
              onNewNameChange={setNewCatName}
              onConfirmNew={handleAddCategory}
              onCancelNew={() => { setAddingCat(false); setNewCatName(""); }}
              dbReady={dbReady}
            />
          </div>
        </MobileSection>

        {/* Section 3 — Priority */}
        <MobileSection title="Priority">
          <div className="grid grid-cols-2 gap-3">
            {priorityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriority(opt.value)}
                className={`relative flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all active:scale-[0.97] ${
                  priority === opt.value
                    ? `${opt.borderColor} ${opt.bgColor}`
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  priority === opt.value ? `${opt.activeBg} text-white` : "bg-gray-200 text-gray-400"
                }`}>
                  {opt.icon}
                </span>
                <span className={`text-sm font-semibold ${priority === opt.value ? opt.color : "text-gray-500"}`}>
                  {opt.label}
                </span>
                {priority === opt.value && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current opacity-60" />
                )}
              </button>
            ))}
          </div>
        </MobileSection>

        {/* Section 4 — Schedule */}
        <MobileSection title="Schedule">
          {/* Dates — stacked */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wide mb-2">
              <Calendar className="w-3.5 h-3.5" /> Valid From *
            </label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className={mobileInputClass}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5" /> Valid To
              </label>
              <span className="text-[11px] text-gray-400">Optional</span>
            </div>
            <div className="relative">
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className={mobileInputClass}
              />
              {validTo && (
                <button type="button" onClick={() => setValidTo("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-3 block">Frequency *</label>
            <div className="flex gap-2">
              {frequencyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.97] ${
                    frequency === opt.value
                      ? "border-[#2abaad] bg-teal-50 text-[#2abaad]"
                      : "border-gray-100 bg-gray-50 text-gray-400"
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recurring panel */}
          {frequency === "RECURRING" && (
            <div className="rounded-2xl border border-teal-200 bg-white overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

              {/* ── Repeat every ── */}
              <div className="px-4 pt-4 pb-3">
                <p className="text-xs font-medium text-gray-500 mb-3">Repeat every</p>
                <div className="flex items-center gap-3">
                  {/* Circular stepper — fixed, compact */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRepeatEvery(Math.max(1, repeatEvery - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-gray-300 bg-white active:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-3 h-3 text-gray-500" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-gray-800 select-none">{repeatEvery}</span>
                    <button
                      type="button"
                      onClick={() => setRepeatEvery(repeatEvery + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2abaad] active:bg-[#24a699] transition-colors"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>

                  {/* Interval pills — fill remaining space equally */}
                  <div className="flex flex-1 gap-1">
                    {intervals.map((iv) => (
                      <button
                        key={iv}
                        type="button"
                        onClick={() => setInterval(iv)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                          interval === iv
                            ? "bg-[#2abaad] text-white shadow-sm"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {iv}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 mx-4" />

              {/* ── Start at ── */}
              <div className="px-4 pt-3 pb-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Start at</p>
                <div className="relative">
                  <input
                    type="time"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad] transition-all"
                  />
                  <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="h-px bg-gray-100 mx-4" />

              {/* ── Valid until ── */}
              <div className="px-4 pt-3 pb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Valid until</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setValidUntil("NEXT_OCCURRENCE")}
                    className={`flex-1 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-[0.97] ${
                      validUntil === "NEXT_OCCURRENCE"
                        ? "bg-[#2abaad] text-white shadow-sm"
                        : "bg-gray-50 border border-gray-200 text-gray-500"
                    }`}
                  >
                    Next occurrence
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidUntil("TIME_PERIOD")}
                    className={`flex-1 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-[0.97] ${
                      validUntil === "TIME_PERIOD"
                        ? "bg-[#2abaad] text-white shadow-sm"
                        : "bg-gray-50 border border-gray-200 text-gray-500"
                    }`}
                  >
                    Time period
                  </button>
                </div>

                {validUntil === "TIME_PERIOD" && (
                  <div className="relative mt-2.5">
                    <input
                      type="time"
                      value={validHour}
                      onChange={(e) => setValidHour(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad] transition-all"
                    />
                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                )}

                {/* ── Summary ── */}
                <div className="mt-3 px-3 py-2.5 bg-teal-50 border border-teal-100 rounded-xl">
                  <p className="text-xs text-teal-700 leading-relaxed">
                    Repeats every{" "}
                    <span className="font-semibold">{repeatEvery} {interval}{repeatEvery > 1 ? "s" : ""}</span>
                    {startAt && <> · starts at <span className="font-semibold">{startAt}</span></>}
                    {validUntil === "NEXT_OCCURRENCE"
                      ? " · valid until next occurrence"
                      : validHour
                      ? <> · ends at <span className="font-semibold">{validHour}</span></>
                      : " · for a time period"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </MobileSection>

        {/* Section 5 — Assignment & Location */}
        <MobileSection title="Assignment & Location">
          {/* Assigned to */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wide mb-2">
              <Users className="w-3.5 h-3.5" /> Assigned To *
            </label>
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className={`w-full flex items-center justify-between px-4 py-3.5 bg-white border-2 rounded-2xl text-sm transition-all active:bg-gray-50 ${
                assignedSelections.length > 0 ? "border-[#2abaad] text-gray-800" : "border-gray-200 text-gray-400"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">
                  {assignedSelections.length > 0 ? formatAssignToLabel(assignedSelections) : "Select team, user or plant…"}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
            </button>
            {assignedSelections.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {assignedSelections.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-full text-xs font-medium">
                    <span className="text-teal-400 text-[9px] uppercase tracking-wide">{s.type}</span>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wide mb-2">
              <MapPin className="w-3.5 h-3.5" /> Location *
            </label>
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className={`w-full flex items-center justify-between px-4 py-3.5 bg-white border-2 rounded-2xl text-sm transition-all active:bg-gray-50 ${
                locationSelections.length > 0 ? "border-[#2abaad] text-gray-800" : "border-gray-200 text-gray-400"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">
                  {locationSelections.length > 0 ? formatLocationLabel(locationSelections) : "Select location…"}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
            </button>
            {locationSelections.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {locationSelections.slice(0, 5).map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-full text-xs font-medium">
                    <MapPin className="w-2.5 h-2.5 text-teal-400" />
                    {s.label}
                  </span>
                ))}
                {locationSelections.length > 5 && (
                  <span className="text-xs text-gray-400 self-center">+{locationSelections.length - 5} more</span>
                )}
              </div>
            )}
          </div>
        </MobileSection>

        <p className="text-center text-xs text-gray-300 pb-2">
          Fields marked with <span className="text-[#2abaad]">*</span> are required
        </p>
      </div>

      {/* ── Fixed bottom action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-gray-400 text-sm font-medium bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
          <button
            type="button"
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 bg-white active:bg-gray-50 transition-colors"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-3 rounded-2xl bg-[#2abaad] text-white text-sm font-semibold flex items-center justify-center gap-2 active:bg-[#24a699] transition-colors shadow-md shadow-teal-200"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAssignModal && (
        <AssignToModal
          initialSelections={assignedSelections}
          rosterUsers={assignRosterUsers}
          teamOptions={assignTeamOptions}
          onConfirm={(selections) => { setAssignedSelections(selections); setAssignedTo(formatAssignToLabel(selections)); }}
          onClose={() => setShowAssignModal(false)}
        />
      )}
      {showLocationModal && (
        <LocationModal
          initialSelected={locationSelectedIds}
          onConfirm={(selections) => { setLocationSelections(selections); setLocationSelectedIds(new Set(selections.map((s) => s.id))); setLocation(formatLocationLabel(selections)); }}
          onClose={() => setShowLocationModal(false)}
        />
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT (hidden sm:flex) — unchanged
  // ─────────────────────────────────────────────────────────────
  const desktopLayout = (
    <div className="hidden sm:flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <button type="button" onClick={onOpenNav} aria-label="Open menu"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[#2abaad] tracking-wide uppercase text-xs">Checklist Master</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-700 tracking-wide uppercase text-xs">New Checklist</span>
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs transition-all ${step === 1 ? "bg-[#2abaad] text-white shadow-md shadow-teal-200" : "bg-gray-100 text-gray-400"}`}>
                {step === 1 ? <CheckCircle2 className="w-4 h-4" /> : step}
              </div>
              {step < 3 && <div className={`w-8 h-px ${step < 1 ? "bg-[#2abaad]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#2abaad] text-[#2abaad] rounded-xl text-xs tracking-wide hover:bg-teal-50 transition-colors duration-150 shadow-sm"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy From
        </button>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 lg:p-10">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-50 bg-gradient-to-r from-teal-500/5 to-transparent">
              <h1 className="text-gray-800 tracking-tight">Checklist Details</h1>
              <p className="text-xs text-gray-400 mt-0.5">Step 1 of 3 — Basic information</p>
            </div>

            <div className="px-6 py-6 flex flex-col gap-5">
              {/* Submission settings */}
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Submission settings</p>
                <div className={`grid gap-3 ${showRetentionCard ? "grid-cols-2" : "grid-cols-1"}`}>
                  <SettingRow
                    enabled={validateChecklist}
                    onToggle={() => setValidateChecklist(!validateChecklist)}
                    iconOn={<ShieldCheck className="w-4 h-4" />}
                    iconOff={<ShieldOff className="w-4 h-4" />}
                    labelOn="Validate submission"
                    labelOff="No validation"
                    descOn="Requires manager approval"
                    descOff="Submissions skip review"
                  />
                  {showRetentionCard && (
                    <SettingRow
                      enabled={responseMode === "RETAIN_ALL"}
                      onToggle={() => setResponseMode(responseMode === "RETAIN_ALL" ? "DISCARD" : "RETAIN_ALL")}
                      iconOn={<BookMarked className="w-4 h-4" />}
                      iconOff={<Trash2 className="w-4 h-4" />}
                      labelOn="Retain responses"
                      labelOff="Discard responses"
                      descOn="All answers are saved"
                      descOff="Answers not stored"
                    />
                  )}
                </div>

                {showKeepLastToggle && (
                  <button
                    type="button"
                    onClick={() => setResponseMode(responseMode === "KEEP_LAST" ? "DISCARD" : "KEEP_LAST")}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${responseMode === "KEEP_LAST" ? "border-[#2abaad] bg-teal-50/60" : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${responseMode === "KEEP_LAST" ? "bg-[#2abaad] text-white" : "bg-gray-200 text-gray-400"}`}>
                      <ClipboardList className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs tracking-wide uppercase transition-colors ${responseMode === "KEEP_LAST" ? "text-[#2abaad]" : "text-gray-500"}`}>Keep only last submitted form</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 normal-case">{responseMode === "KEEP_LAST" ? "Only the latest answer is stored" : "Previous submissions are overwritten"}</p>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-sky-400 flex items-center justify-center shrink-0" title="Only the most recent submission will be stored.">
                      <Info className="w-3 h-3 text-white" />
                    </span>
                    <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${responseMode === "KEEP_LAST" ? "bg-[#2abaad]" : "bg-gray-200"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${responseMode === "KEEP_LAST" ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </span>
                  </button>
                )}

                {validateChecklist && (
                  <div className="flex flex-col gap-1.5 mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#2abaad]" />
                      <label className="text-xs tracking-wide text-[#2abaad] uppercase">Send to manager for validation <span className="text-[#2abaad]">*</span></label>
                    </div>
                    <DesktopDropdown
                      value={managerName}
                      placeholder="Select a manager…"
                      open={managerOpen}
                      onToggle={() => { setManagerOpen(!managerOpen); setCatOpen(false); }}
                      onClose={() => setManagerOpen(false)}
                      search={managerSearch}
                      onSearch={setManagerSearch}
                      items={filteredManagers.map(m => ({ id: m.id, label: m.name, sublabel: m.email ?? undefined }))}
                      onSelect={(item) => {
                        setManagerName(item.label);
                        setManagerUserId(orgManagersForPicker.length > 0 ? item.id : "");
                        setManagerOpen(false);
                        setManagerSearch("");
                      }}
                      onAddNew={orgManagersForPicker.length > 0 ? undefined : () => setAddingManager(true)}
                      addingNew={addingManager}
                      newName={newManagerName}
                      onNewNameChange={setNewManagerName}
                      onConfirmNew={handleAddManager}
                      onCancelNew={() => { setAddingManager(false); setNewManagerName(""); setNewManagerEmail(""); }}
                      dbReady={dbReady}
                      extraNewFields={
                        <input type="email" inputMode="email" value={newManagerEmail}
                          onChange={(e) => setNewManagerEmail(e.target.value)}
                          placeholder="Email (optional)"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad]" />
                      }
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-50" />

              {/* Title */}
              <FormField label="Checklist Title" required icon={<FileText className="w-3.5 h-3.5" />}>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly Safety Inspection" className={inputClass} />
              </FormField>

              {/* Category */}
              <FormField label="Checklist Category" required icon={<Tag className="w-3.5 h-3.5" />}>
                <DesktopDropdown
                  value={category}
                  placeholder="Select a category…"
                  open={catOpen}
                  onToggle={() => { setCatOpen(!catOpen); setManagerOpen(false); }}
                  onClose={() => setCatOpen(false)}
                  search={catSearch}
                  onSearch={setCatSearch}
                  items={filteredCats.map(c => ({ id: c.id, label: c.name, color: c.color }))}
                  onSelect={(item) => { setCategory(item.label); setCatOpen(false); setCatSearch(""); }}
                  onAddNew={() => setAddingCat(true)}
                  addingNew={addingCat}
                  newName={newCatName}
                  onNewNameChange={setNewCatName}
                  onConfirmNew={handleAddCategory}
                  onCancelNew={() => { setAddingCat(false); setNewCatName(""); }}
                  dbReady={dbReady}
                />
              </FormField>

              {/* Priority */}
              <FormField label="Priority" required>
                <div className="grid grid-cols-4 gap-3">
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={`relative flex flex-col items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 transition-all duration-150 ${priority === opt.value ? "border-[#2abaad] bg-teal-50 text-[#2abaad] shadow-sm shadow-teal-100" : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-gray-100"}`}
                    >
                      {opt.icon}
                      <span className="text-xs tracking-wide uppercase">{opt.label}</span>
                      {priority === opt.value && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#2abaad]" />}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Valid From" required icon={<Calendar className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={`${inputClass} pr-10`} />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  </div>
                </FormField>
                <FormField label="Valid To" icon={<Calendar className="w-3.5 h-3.5" />} hint="Optional">
                  <div className="relative">
                    <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className={`${inputClass} pr-10`} />
                    {validTo ? (
                      <button type="button" onClick={() => setValidTo("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 hover:text-gray-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    )}
                  </div>
                </FormField>
              </div>

              {/* Frequency */}
              <FormField label="Frequency" required>
                <div className="grid grid-cols-3 gap-3">
                  {frequencyOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFrequency(opt.value)}
                      className={`relative flex flex-col items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 transition-all duration-150 ${frequency === opt.value ? "border-[#2abaad] bg-teal-50 text-[#2abaad] shadow-sm shadow-teal-100" : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-gray-100"}`}
                    >
                      {opt.icon}
                      <span className="text-xs tracking-wide uppercase">{opt.label}</span>
                      <span className={`text-[10px] normal-case ${frequency === opt.value ? "text-teal-500" : "text-gray-300"}`}>{opt.description}</span>
                      {frequency === opt.value && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#2abaad]" />}
                    </button>
                  ))}
                </div>

                {frequency === "RECURRING" && (
                  <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/40 p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24 shrink-0">Repeat every</span>
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => setRepeatEvery(Math.max(1, repeatEvery - 1))}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm text-gray-700">{repeatEvery}</span>
                        <button
                          type="button"
                          onClick={() => setRepeatEvery(repeatEvery + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        {intervals.map((iv) => (
                          <button key={iv} type="button" onClick={() => setInterval(iv)} className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${interval === iv ? "bg-[#2abaad] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:border-teal-200 hover:text-[#2abaad]"}`}>{iv}</button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-teal-100" />

                    <div className="flex items-start gap-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-gray-500">Start at</span>
                        <div className="relative">
                          <input type="time" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad] transition-all w-32" />
                          <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1">
                        <span className="text-xs text-gray-500">Valid until</span>
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => setValidUntil("NEXT_OCCURRENCE")} className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${validUntil === "NEXT_OCCURRENCE" ? "bg-[#2abaad] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:border-teal-200 hover:text-[#2abaad]"}`}>Next occurrence</button>
                          <button type="button" onClick={() => setValidUntil("TIME_PERIOD")} className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${validUntil === "TIME_PERIOD" ? "bg-[#2abaad] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:border-teal-200 hover:text-[#2abaad]"}`}>For a time period</button>
                        </div>
                        {validUntil === "TIME_PERIOD" && (
                          <div className="relative mt-1">
                            <input type="time" value={validHour} onChange={(e) => setValidHour(e.target.value)} className="pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad] transition-all w-full" />
                            <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-teal-500/80 bg-teal-100/50 rounded-lg px-3 py-2">
                      Repeats every <span className="font-medium">{repeatEvery} {interval}{repeatEvery > 1 ? "s" : ""}</span>
                      {startAt && <>, starting at <span className="font-medium">{startAt}</span></>}
                      {validUntil === "NEXT_OCCURRENCE" ? <> · valid until next occurrence</> : validHour ? <> · valid for period ending at <span className="font-medium">{validHour}</span></> : <> · valid for a time period</>}
                    </p>
                  </div>
                )}
              </FormField>

              {/* Assigned To */}
              <FormField label="Assigned To" required icon={<Users className="w-3.5 h-3.5" />}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-sm transition-all duration-150 hover:border-[#2abaad] focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 ${assignedSelections.length > 0 ? "border-[#2abaad] text-gray-800" : "border-gray-200 text-gray-300"}`}
                >
                  <span className="truncate">{assignedSelections.length > 0 ? formatAssignToLabel(assignedSelections) : "Select team, user or plant…"}</span>
                  <ChevronDown className="w-4 h-4 text-[#2abaad] shrink-0 ml-2" />
                </button>
                {assignedSelections.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {assignedSelections.map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-full text-xs font-medium">
                        <span className="text-teal-400 text-[9px] uppercase tracking-wide">{s.type}</span>
                        {s.id} - {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </FormField>

              {showAssignModal && (
                <AssignToModal
                  initialSelections={assignedSelections}
                  rosterUsers={assignRosterUsers}
                  teamOptions={assignTeamOptions}
                  onConfirm={(selections) => { setAssignedSelections(selections); setAssignedTo(formatAssignToLabel(selections)); }}
                  onClose={() => setShowAssignModal(false)}
                />
              )}

              {/* Location */}
              <FormField label="Location" required icon={<MapPin className="w-3.5 h-3.5" />}>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-sm transition-all duration-150 hover:border-[#2abaad] focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 ${locationSelections.length > 0 ? "border-[#2abaad] text-gray-800" : "border-gray-200 text-gray-300"}`}
                >
                  <span className="truncate">{locationSelections.length > 0 ? formatLocationLabel(locationSelections) : "Select location…"}</span>
                  <ChevronDown className="w-4 h-4 text-[#2abaad] shrink-0 ml-2" />
                </button>
                {locationSelections.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {locationSelections.slice(0, 6).map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-full text-xs font-medium">
                        <MapPin className="w-2.5 h-2.5 text-teal-400" />
                        {s.label}
                      </span>
                    ))}
                    {locationSelections.length > 6 && <span className="text-xs text-gray-400 self-center">+{locationSelections.length - 6} more</span>}
                  </div>
                )}
              </FormField>

              {showLocationModal && (
                <LocationModal
                  initialSelected={locationSelectedIds}
                  onConfirm={(selections) => { setLocationSelections(selections); setLocationSelectedIds(new Set(selections.map((s) => s.id))); setLocation(formatLocationLabel(selections)); }}
                  onClose={() => setShowLocationModal(false)}
                />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
              <button type="button" onClick={handleClear} className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-600 text-sm transition-colors rounded-lg hover:bg-gray-100">
                <RotateCcw className="w-3.5 h-3.5" />
                Clear all
              </button>
              <div className="flex items-center gap-3">
                <button type="button" className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-[#2abaad] text-white text-sm hover:bg-[#24a699] transition-colors shadow-sm shadow-teal-200 flex items-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-300 mt-4">
            Fields marked with <span className="text-[#2abaad]">*</span> are required
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileLayout}
      {desktopLayout}
    </>
  );
}

/* ─────────────── Shared dropdown types ─────────────── */

interface DropdownItem { id: string; label: string; sublabel?: string; color?: string; }

interface DropdownProps {
  value: string;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  search: string;
  onSearch: (v: string) => void;
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  onAddNew?: () => void;
  addingNew: boolean;
  newName: string;
  onNewNameChange: (v: string) => void;
  onConfirmNew: () => void;
  onCancelNew: () => void;
  dbReady: boolean;
  extraNewFields?: React.ReactNode;
}

/* ── Mobile dropdown ── */
function MobileDropdown(p: DropdownProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <button type="button" onClick={p.onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm transition-all focus:outline-none"
        style={{ color: p.value ? "#1f2937" : "#9ca3af" }}>
        <span className="truncate">{p.value || p.placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${p.open ? "rotate-180" : ""}`} />
      </button>

      {p.open && (
        <>
          <div className="fixed inset-0 z-40" onClick={p.onClose} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-h-56">
            <div className="p-3 border-b border-gray-50">
              <input ref={inputRef} autoFocus type="text" inputMode="text" value={p.search} onChange={e => p.onSearch(e.target.value)}
                placeholder="Search…" className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30" />
            </div>
            <div className="overflow-y-auto max-h-40">
              {p.items.length === 0 && !p.addingNew && (
                <p className="px-4 py-3 text-sm text-gray-400 text-center">No results</p>
              )}
              {p.items.map(item => (
                <button key={item.id} type="button" onClick={() => p.onSelect(item)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 transition-colors text-left">
                  {item.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.sublabel && <span className="text-xs text-gray-400 truncate">{item.sublabel}</span>}
                  {p.value === item.label && <Check className="w-3.5 h-3.5 text-[#2abaad] shrink-0" />}
                </button>
              ))}
            </div>
            {p.addingNew ? (
              <div className="p-3 border-t border-gray-50 flex flex-col gap-2">
                <input autoFocus type="text" inputMode="text" value={p.newName} onChange={e => p.onNewNameChange(e.target.value)}
                  placeholder="Name…" className="w-full px-3 py-2 text-sm border border-[#2abaad] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30" />
                {p.extraNewFields}
                <div className="flex gap-2">
                  <button type="button" onClick={p.onCancelNew} className="flex-1 py-2 text-xs text-gray-500 bg-gray-100 rounded-xl">Cancel</button>
                  <button type="button" onClick={p.onConfirmNew} className="flex-1 py-2 text-xs text-white bg-[#2abaad] rounded-xl">Add</button>
                </div>
              </div>
            ) : p.onAddNew ? (
              <button type="button" onClick={p.onAddNew}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-[#2abaad] border-t border-gray-50 hover:bg-teal-50 transition-colors">
                <Plus className="w-4 h-4" />
                {p.dbReady ? "Add new…" : "Type custom value…"}
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Desktop dropdown ── */
function DesktopDropdown(p: DropdownProps) {
  return (
    <div className="relative">
      <button type="button" onClick={p.onToggle}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:border-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad]"
        style={{ color: p.value ? "#1f2937" : "#9ca3af" }}>
        <span className="truncate">{p.value || p.placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${p.open ? "rotate-180" : ""}`} />
      </button>

      {p.open && (
        <>
          <div className="fixed inset-0 z-30" onClick={p.onClose} />
          <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-h-60">
            <div className="p-2.5 border-b border-gray-50">
              <input autoFocus type="text" value={p.search} onChange={e => p.onSearch(e.target.value)}
                placeholder="Search…" className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20" />
            </div>
            <div className="overflow-y-auto max-h-40">
              {p.items.length === 0 && !p.addingNew && (
                <p className="px-3 py-2 text-sm text-gray-400 text-center">No results</p>
              )}
              {p.items.map(item => (
                <button key={item.id} type="button" onClick={() => p.onSelect(item)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left">
                  {item.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.sublabel && <span className="text-xs text-gray-400 truncate max-w-[120px]">{item.sublabel}</span>}
                  {p.value === item.label && <Check className="w-3.5 h-3.5 text-[#2abaad] shrink-0" />}
                </button>
              ))}
            </div>
            {p.addingNew ? (
              <div className="p-2.5 border-t border-gray-50 flex flex-col gap-2">
                <input autoFocus type="text" value={p.newName} onChange={e => p.onNewNameChange(e.target.value)}
                  placeholder="Name…" className="w-full px-3 py-1.5 text-sm border border-[#2abaad] rounded-lg focus:outline-none" />
                {p.extraNewFields}
                <div className="flex gap-2">
                  <button type="button" onClick={p.onCancelNew} className="flex-1 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg">Cancel</button>
                  <button type="button" onClick={p.onConfirmNew} className="flex-1 py-1.5 text-xs text-white bg-[#2abaad] rounded-lg">Add</button>
                </div>
              </div>
            ) : p.onAddNew ? (
              <button type="button" onClick={p.onAddNew}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[#2abaad] border-t border-gray-50 hover:bg-teal-50 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                {p.dbReady ? "Add new…" : "Type custom value…"}
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}