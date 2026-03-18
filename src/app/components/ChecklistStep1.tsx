import React, { useState } from "react";
import {
  Calendar,
  Copy,
  ChevronRight,
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

type Frequency = "ONE_OFF" | "PERMANENT" | "RECURRING";
type Interval = "Day" | "Week" | "Month" | "Year";
type ValidUntil = "NEXT_OCCURRENCE" | "TIME_PERIOD";
type ResponseMode = "DISCARD" | "RETAIN_ALL" | "KEEP_LAST";
type Priority = "urgent" | "high" | "normal" | "low";

const priorityOptions: { value: Priority; label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }[] = [
  { value: "urgent", label: "Urgent", icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-500" },
  { value: "high", label: "High", icon: <Flag className="w-4 h-4" />, color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-400" },
  { value: "normal", label: "Normal", icon: <TrendingUp className="w-4 h-4" />, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-400" },
  { value: "low", label: "Low", icon: <Circle className="w-4 h-4" />, color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-300" },
];

const frequencyOptions: { value: Frequency; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "ONE_OFF",
    label: "One Off",
    icon: <Zap className="w-4 h-4" />,
    description: "Single occurrence",
  },
  {
    value: "PERMANENT",
    label: "Permanent",
    icon: <Clock className="w-4 h-4" />,
    description: "Always active",
  },
  {
    value: "RECURRING",
    label: "Recurring",
    icon: <Repeat className="w-4 h-4" />,
    description: "Repeats regularly",
  },
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
        enabled
          ? "border-[#2abaad] bg-teal-50/60"
          : "border-gray-100 bg-gray-50 hover:border-gray-200"
      }`}
    >
      {/* Icon */}
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
        enabled ? "bg-[#2abaad] text-white" : "bg-gray-200 text-gray-400"
      }`}>
        {enabled ? iconOn : iconOff}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs tracking-wide uppercase transition-colors ${enabled ? "text-[#2abaad]" : "text-gray-500"}`}>
          {enabled ? labelOn : labelOff}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5 normal-case">
          {enabled ? descOn : descOff}
        </p>
      </div>

      {/* Toggle pill */}
      <span className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
        enabled ? "bg-[#2abaad]" : "bg-gray-200"
      }`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
          enabled ? "translate-x-4.5" : "translate-x-0.5"
        }`} />
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
        {hint && (
          <span className="ml-auto text-[11px] text-gray-400 normal-case">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

interface ChecklistStep1Props {
  onNext?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
}

export function ChecklistStep1({ onNext, onCancel, initialData }: ChecklistStep1Props) {
  const [validateChecklist, setValidateChecklist] = useState(initialData?.validateChecklist ?? false);
  const [responseMode, setResponseMode] = useState<ResponseMode>(initialData?.responseMode ?? "DISCARD");
  const [managerName, setManagerName] = useState(initialData?.managerName ?? "");
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

  // Recurring-specific state
  const [repeatEvery, setRepeatEvery] = useState(initialData?.repeatEvery ?? 1);
  const [interval, setInterval] = useState<Interval>(initialData?.interval ?? "Week");
  const [startAt, setStartAt] = useState(initialData?.startAt ?? "");
  const [validUntil, setValidUntil] = useState<ValidUntil>(initialData?.validUntil ?? "NEXT_OCCURRENCE");
  const [validHour, setValidHour] = useState(initialData?.validHour ?? "");

  const intervals: Interval[] = ["Day", "Week", "Month", "Year"];

  // Derived booleans for clarity
  const showRetentionCard = responseMode !== "KEEP_LAST";
  const showKeepLastToggle = responseMode !== "RETAIN_ALL";

  const inputClass =
    "w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad] transition-all duration-150";

  const handleClear = () => {
    setTitle("");
    setCategory("");
    setValidFrom("");
    setValidTo("");
    setFrequency("ONE_OFF");
    setAssignedTo("");
    setAssignedSelections([]);
    setLocation("");
    setLocationSelections([]);
    setLocationSelectedIds(new Set());
    setRepeatEvery(1);
    setInterval("Week");
    setStartAt("");
    setValidUntil("NEXT_OCCURRENCE");
    setValidHour("");
    setValidateChecklist(false);
    setResponseMode("DISCARD");
    setManagerName("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#2abaad] tracking-wide uppercase text-xs">
            Checklist Master
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-700 tracking-wide uppercase text-xs">
            New Checklist
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs transition-all ${
                  step === 1
                    ? "bg-[#2abaad] text-white shadow-md shadow-teal-200"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
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
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Card header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-50 bg-gradient-to-r from-teal-500/5 to-transparent">
              <h1 className="text-gray-800 tracking-tight">Checklist Details</h1>
              <p className="text-xs text-gray-400 mt-0.5">Step 1 of 3 — Basic information</p>
            </div>

            {/* Form body */}
            <div className="px-6 py-6 flex flex-col gap-5">

              {/* ── Submission settings ── */}
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Submission settings</p>

                {/* Cards row — validation always shown; retention card conditionally shown */}
                <div className={`grid gap-3 ${showRetentionCard ? "grid-cols-2" : "grid-cols-1"}`}>
                  {/* Validation card — always visible */}
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

                  {/* Retention card — hidden when KEEP_LAST is active */}
                  {showRetentionCard && (
                    <SettingRow
                      enabled={responseMode === "RETAIN_ALL"}
                      onToggle={() =>
                        setResponseMode(responseMode === "RETAIN_ALL" ? "DISCARD" : "RETAIN_ALL")
                      }
                      iconOn={<BookMarked className="w-4 h-4" />}
                      iconOff={<Trash2 className="w-4 h-4" />}
                      labelOn="Retain responses"
                      labelOff="Discard responses"
                      descOn="All answers are saved"
                      descOff="Answers not stored"
                    />
                  )}
                </div>

                {/* "Keep only last submitted form" toggle — hidden when RETAIN_ALL is active */}
                {showKeepLastToggle && (
                  <button
                    type="button"
                    onClick={() =>
                      setResponseMode(responseMode === "KEEP_LAST" ? "DISCARD" : "KEEP_LAST")
                    }
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                      responseMode === "KEEP_LAST"
                        ? "border-[#2abaad] bg-teal-50/60"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    {/* Icon */}
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        responseMode === "KEEP_LAST"
                          ? "bg-[#2abaad] text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      <ClipboardList className="w-4 h-4" />
                    </span>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs tracking-wide uppercase transition-colors ${responseMode === "KEEP_LAST" ? "text-[#2abaad]" : "text-gray-500"}`}>
                        Keep only last submitted form
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 normal-case">
                        {responseMode === "KEEP_LAST" ? "Only the latest answer is stored" : "Previous submissions are overwritten"}
                      </p>
                    </div>

                    {/* Info badge */}
                    <span
                      className="w-5 h-5 rounded-full bg-sky-400 flex items-center justify-center shrink-0"
                      title="Only the most recent submission will be stored. All previous responses are overwritten."
                    >
                      <Info className="w-3 h-3 text-white" />
                    </span>

                    {/* Toggle pill */}
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
                        responseMode === "KEEP_LAST" ? "bg-[#2abaad]" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
                          responseMode === "KEEP_LAST" ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                )}

                {/* Manager field — slides in when validation is ON */}
                {validateChecklist && (
                  <div className="flex flex-col gap-1.5 mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#2abaad]" />
                      <label className="text-xs tracking-wide text-[#2abaad] uppercase">
                        Send to manager for validation <span className="text-[#2abaad]">*</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Search manager by name…"
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-[#2abaad]/30 rounded-xl text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all duration-150"
                    />
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-50" />

              {/* Title */}
              <FormField label="Checklist Title" required icon={<FileText className="w-3.5 h-3.5" />}>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly Safety Inspection"
                  className={inputClass}
                />
              </FormField>

              {/* Category */}
              <FormField label="Checklist Category" required icon={<Tag className="w-3.5 h-3.5" />}>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Select or type a category"
                  className={inputClass}
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
                      className={`relative flex flex-col items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 transition-all duration-150 ${
                        priority === opt.value
                          ? "border-[#2abaad] bg-teal-50 text-[#2abaad] shadow-sm shadow-teal-100"
                          : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {opt.icon}
                      <span className="text-xs tracking-wide uppercase">{opt.label}</span>
                      <span className={`text-[10px] normal-case ${priority === opt.value ? "text-teal-500" : "text-gray-300"}`}>
                        {opt.description}
                      </span>
                      {priority === opt.value && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#2abaad]" />
                      )}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Valid From" required icon={<Calendar className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    <input
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className={`${inputClass} pr-10`}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  </div>
                </FormField>

                <FormField label="Valid To" icon={<Calendar className="w-3.5 h-3.5" />} hint="Optional">
                  <div className="relative">
                    <input
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className={`${inputClass} pr-10`}
                    />
                    {validTo ? (
                      <button
                        type="button"
                        onClick={() => setValidTo("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 hover:text-gray-500 transition-colors"
                      >
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
                      className={`relative flex flex-col items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 transition-all duration-150 ${
                        frequency === opt.value
                          ? "border-[#2abaad] bg-teal-50 text-[#2abaad] shadow-sm shadow-teal-100"
                          : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {opt.icon}
                      <span className="text-xs tracking-wide uppercase">{opt.label}</span>
                      <span className={`text-[10px] normal-case ${frequency === opt.value ? "text-teal-500" : "text-gray-300"}`}>
                        {opt.description}
                      </span>
                      {frequency === opt.value && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#2abaad]" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Recurring settings panel */}
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
                          <button
                            key={iv}
                            type="button"
                            onClick={() => setInterval(iv)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                              interval === iv
                                ? "bg-[#2abaad] text-white shadow-sm"
                                : "bg-white border border-gray-200 text-gray-500 hover:border-teal-200 hover:text-[#2abaad]"
                            }`}
                          >
                            {iv}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-teal-100" />

                    <div className="flex items-start gap-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-gray-500">Start at</span>
                        <div className="relative">
                          <input
                            type="time"
                            value={startAt}
                            onChange={(e) => setStartAt(e.target.value)}
                            className="pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad] transition-all w-32"
                          />
                          <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1">
                        <span className="text-xs text-gray-500">Valid until</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setValidUntil("NEXT_OCCURRENCE")}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                              validUntil === "NEXT_OCCURRENCE"
                                ? "bg-[#2abaad] text-white shadow-sm"
                                : "bg-white border border-gray-200 text-gray-500 hover:border-teal-200 hover:text-[#2abaad]"
                            }`}
                          >
                            Next occurrence
                          </button>
                          <button
                            type="button"
                            onClick={() => setValidUntil("TIME_PERIOD")}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                              validUntil === "TIME_PERIOD"
                                ? "bg-[#2abaad] text-white shadow-sm"
                                : "bg-white border border-gray-200 text-gray-500 hover:border-teal-200 hover:text-[#2abaad]"
                            }`}
                          >
                            For a time period
                          </button>
                        </div>
                        {validUntil === "TIME_PERIOD" && (
                          <div className="relative mt-1">
                            <input
                              type="time"
                              value={validHour}
                              onChange={(e) => setValidHour(e.target.value)}
                              className="pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 focus:border-[#2abaad] transition-all w-full"
                            />
                            <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-teal-500/80 bg-teal-100/50 rounded-lg px-3 py-2">
                      Repeats every <span className="font-medium">{repeatEvery} {interval}{repeatEvery > 1 ? "s" : ""}</span>
                      {startAt && <>, starting at <span className="font-medium">{startAt}</span></>}
                      {validUntil === "NEXT_OCCURRENCE"
                        ? <> · valid until next occurrence</>
                        : validHour
                          ? <> · valid for period ending at <span className="font-medium">{validHour}</span></>
                          : <> · valid for a time period</>}
                    </p>
                  </div>
                )}
              </FormField>

              {/* Assigned To */}
              <FormField label="Assigned To" required icon={<Users className="w-3.5 h-3.5" />}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-sm transition-all duration-150 hover:border-[#2abaad] focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 ${
                    assignedSelections.length > 0
                      ? "border-[#2abaad] text-gray-800"
                      : "border-gray-200 text-gray-300"
                  }`}
                >
                  <span className="truncate">
                    {assignedSelections.length > 0
                      ? formatAssignToLabel(assignedSelections)
                      : "Select team, user or plant…"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[#2abaad] shrink-0 ml-2" />
                </button>

                {/* Chips preview */}
                {assignedSelections.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {assignedSelections.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-full text-xs font-medium"
                      >
                        <span className="text-teal-400 text-[9px] uppercase tracking-wide">{s.type}</span>
                        {s.id} - {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </FormField>

              {/* AssignTo Modal */}
              {showAssignModal && (
                <AssignToModal
                  initialSelections={assignedSelections}
                  onConfirm={(selections) => {
                    setAssignedSelections(selections);
                    setAssignedTo(formatAssignToLabel(selections));
                  }}
                  onClose={() => setShowAssignModal(false)}
                />
              )}

              {/* Location */}
              <FormField label="Location" required icon={<MapPin className="w-3.5 h-3.5" />}>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-sm transition-all duration-150 hover:border-[#2abaad] focus:outline-none focus:ring-2 focus:ring-[#2abaad]/30 ${
                    locationSelections.length > 0
                      ? "border-[#2abaad] text-gray-800"
                      : "border-gray-200 text-gray-300"
                  }`}
                >
                  <span className="truncate">
                    {locationSelections.length > 0
                      ? formatLocationLabel(locationSelections)
                      : "Select location…"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[#2abaad] shrink-0 ml-2" />
                </button>

                {/* Chips preview */}
                {locationSelections.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {locationSelections.slice(0, 6).map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-full text-xs font-medium"
                      >
                        <MapPin className="w-2.5 h-2.5 text-teal-400" />
                        {s.label}
                      </span>
                    ))}
                    {locationSelections.length > 6 && (
                      <span className="text-xs text-gray-400 self-center">+{locationSelections.length - 6} more</span>
                    )}
                  </div>
                )}
              </FormField>

              {/* Location Modal */}
              {showLocationModal && (
                <LocationModal
                  initialSelected={locationSelectedIds}
                  onConfirm={(selections) => {
                    setLocationSelections(selections);
                    setLocationSelectedIds(new Set(selections.map((s) => s.id)));
                    setLocation(formatLocationLabel(selections));
                  }}
                  onClose={() => setShowLocationModal(false)}
                />
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-600 text-sm transition-colors rounded-lg hover:bg-gray-100"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear all
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-[#2abaad] text-white text-sm hover:bg-[#24a699] transition-colors shadow-sm shadow-teal-200 flex items-center gap-2"
                  onClick={() => {
                    if (onNext) {
                      onNext({
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
                        repeatEvery,
                        interval,
                        startAt,
                        validUntil,
                        validHour,
                      });
                    }
                  }}
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
}