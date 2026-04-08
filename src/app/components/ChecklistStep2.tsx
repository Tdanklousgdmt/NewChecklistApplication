import { useState, useCallback, useRef, useMemo } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { getChecklistStep2DndBackend, getChecklistStep2DndOptions } from "../lib/dndBackend";
import { SectionCard } from "./SectionCard";
import { FieldConfigPanels } from "./FieldConfigPanels";
import { TriggerBuilder } from "./TriggerBuilder";
import { Trigger } from "../types/triggers";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  Search,
  GripVertical,
  X,
  Star,
  Camera,
  Calendar,
  Clock,
  Hash,
  CheckSquare2,
  ToggleLeft,
  ListFilter,
  AlignLeft,
  Type,
  Heading1,
  Info,
  SeparatorHorizontal,
  PenLine,
  Paperclip,
  MapPin,
  Thermometer,
  ScanLine,
  CalendarClock,
  Plus,
  Layers,
  RotateCcw,
  Video,
  Calculator,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Sparkles,
  Settings,
  Trash2,
  Ruler,
  Target,
  Square,
  Zap,
  Menu,
} from "lucide-react";

// ── DnD constants ──────────────────────────────────────────────────
const ITEM_TYPES = { PALETTE: "PALETTE", CANVAS: "CANVAS" } as const;

// ── Category color tokens ──────────────────────────────────────────
const CAT_COLORS = {
  basic:     { bg: "bg-teal-100",   text: "text-teal-600",   dot: "bg-teal-400",   border: "border-teal-200"   },
  datetime:  { bg: "bg-sky-100",    text: "text-sky-600",    dot: "bg-sky-400",    border: "border-sky-200"    },
  media:     { bg: "bg-violet-100", text: "text-violet-600", dot: "bg-violet-400", border: "border-violet-200" },
  structure: { bg: "bg-amber-100",  text: "text-amber-600",  dot: "bg-amber-400",  border: "border-amber-200"  },
  advanced:  { bg: "bg-rose-100",   text: "text-rose-600",   dot: "bg-rose-400",   border: "border-rose-200"   },
} as const;

type CategoryKey = keyof typeof CAT_COLORS;

const CAT_LABELS: Record<CategoryKey, string> = {
  basic:     "Basic Fields",
  datetime:  "Date & Time",
  media:     "Media & Evidence",
  structure: "Structure",
  advanced:  "Advanced",
};

// ── Field type definitions ─────────────────────────────────────────
interface FieldTypeDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: CategoryKey;
  description: string;
}

const FIELD_TYPES: FieldTypeDef[] = [
  { id: "short_text",  label: "Short Text",   icon: <Type className="w-3.5 h-3.5" />,              category: "basic",     description: "Single-line text answer"  },
  { id: "long_text",   label: "Long Text",    icon: <AlignLeft className="w-3.5 h-3.5" />,          category: "basic",     description: "Multi-line paragraph"      },
  { id: "number",      label: "Number",       icon: <Hash className="w-3.5 h-3.5" />,               category: "basic",     description: "Numeric input"             },
  { id: "number_unit", label: "Number + Unit", icon: <Ruler className="w-3.5 h-3.5" />,            category: "basic",     description: "Number with measurement unit" },
  { id: "number_threshold", label: "Number (Thresholds)", icon: <Target className="w-3.5 h-3.5" />, category: "basic",     description: "Number with min/max validation" },
  { id: "checkbox",    label: "Checkbox",     icon: <CheckSquare2 className="w-3.5 h-3.5" />,       category: "basic",     description: "Single tick box"           },
  { id: "yes_no",      label: "Yes / No",     icon: <ToggleLeft className="w-3.5 h-3.5" />,         category: "basic",     description: "Binary choice"             },
  { id: "custom_buttons", label: "Custom Buttons", icon: <Square className="w-3.5 h-3.5" />,      category: "basic",     description: "Buttons with scoring (Good/Fair/Poor)" },
  { id: "dropdown",    label: "Dropdown",     icon: <ListFilter className="w-3.5 h-3.5" />,         category: "basic",     description: "Select from a list"        },
  { id: "date",        label: "Date",         icon: <Calendar className="w-3.5 h-3.5" />,           category: "datetime",  description: "Date picker"               },
  { id: "time",        label: "Time",         icon: <Clock className="w-3.5 h-3.5" />,              category: "datetime",  description: "Time picker"               },
  { id: "datetime",    label: "Date & Time",  icon: <CalendarClock className="w-3.5 h-3.5" />,      category: "datetime",  description: "Combined date + time"      },
  { id: "photo",       label: "Photo",        icon: <Camera className="w-3.5 h-3.5" />,             category: "media",     description: "Camera or file upload"     },
  { id: "video",       label: "Video",        icon: <Video className="w-3.5 h-3.5" />,              category: "media",     description: "Record or upload video"    },
  { id: "media_embed", label: "Media Embed",  icon: <Layers className="w-3.5 h-3.5" />,            category: "media",     description: "Images & videos in one field" },
  { id: "signature",   label: "Signature",    icon: <PenLine className="w-3.5 h-3.5" />,            category: "media",     description: "Drawn signature field"     },
  { id: "file",        label: "File Upload",  icon: <Paperclip className="w-3.5 h-3.5" />,          category: "media",     description: "Any file type"             },
  { id: "section",     label: "Section",      icon: <Heading1 className="w-3.5 h-3.5" />,           category: "structure", description: "Group divider with title"  },
  { id: "instruction", label: "Instruction",  icon: <Info className="w-3.5 h-3.5" />,               category: "structure", description: "Read-only note or tip"     },
  { id: "separator",   label: "Separator",    icon: <SeparatorHorizontal className="w-3.5 h-3.5" />, category: "structure", description: "Visual divider line"      },
  { id: "rating",      label: "Rating",       icon: <Star className="w-3.5 h-3.5" />,               category: "advanced",  description: "Star or score rating"      },
  { id: "location",    label: "Location",     icon: <MapPin className="w-3.5 h-3.5" />,             category: "advanced",  description: "GPS / map pin"             },
  { id: "temperature", label: "Temperature",  icon: <Thermometer className="w-3.5 h-3.5" />,        category: "advanced",  description: "Temperature reading"       },
  { id: "barcode",     label: "Barcode / QR", icon: <ScanLine className="w-3.5 h-3.5" />,           category: "advanced",  description: "Scan or enter code"        },
  { id: "formula",     label: "Formula",      icon: <Calculator className="w-3.5 h-3.5" />,         category: "advanced",  description: "Calculated value"          },
];

const CATEGORIES: CategoryKey[] = ["basic", "datetime", "media", "structure", "advanced"];

// ── Derive icon from typeId at render time (avoids JSON serialisation issues) ──
export function getFieldIcon(typeId: string): React.ReactNode {
  const def = FIELD_TYPES.find((f) => f.id === typeId);
  return def?.icon ?? <Square className="w-3.5 h-3.5" />;
}

// ── Canvas field instance ──────────────────────────────────────────
export interface CanvasField {
  uid: string;
  typeId: string;
  label: string;
  icon: React.ReactNode;
  category: CategoryKey;
  required: boolean;
  // Common properties
  placeholder?: string;
  helpText?: string;
  
  // Dropdown/multi-choice
  options?: string[];
  multiSelect?: boolean;
  allowOther?: boolean;
  searchable?: boolean;
  
  // Number
  minValue?: number;
  maxValue?: number;
  step?: number;
  strictNumeric?: boolean; // No e/E allowed
  localeFormat?: "en" | "fr"; // FR uses comma as decimal
  precision?: number; // Decimal places
  
  // Number + Unit
  primaryUnit?: string;
  subUnit?: string;
  enableConversion?: boolean;
  
  // Number with Thresholds
  thresholds?: Array<{
    id: string;
    operator: "<" | "<=" | "=" | ">=" | ">";
    value: number;
    color: "green" | "yellow" | "red";
    action?: "notify" | "block" | "warn";
    message?: string;
  }>;
  
  // Custom Buttons
  customButtons?: Array<{
    id: string;
    label: string;
    bgColor: string;
    textColor: string;
    score?: number | "N/A" | "reveal";
    isDefault?: boolean;
    notifyUsers?: string[]; // User IDs to notify
    revealSections?: string[]; // Section UIDs to reveal
  }>;
  
  // Rating
  maxRating?: number;
  ratingStyle?: "star" | "numeric";
  
  // Long text
  maxLength?: number;
  rows?: number;
  markdown?: boolean;
  
  // Date/Time
  defaultToNow?: boolean;
  minDate?: string;
  maxDate?: string;
  minTime?: string;
  maxTime?: string;
  timezone?: string;
  
  // Temperature/Unit fields
  unit?: "celsius" | "fahrenheit";
  
  // Media (photo/video/file)
  maxFileSize?: number; // in MB
  allowedFormats?: string[];
  compressImage?: boolean;
  captureCamera?: boolean;
  
  // Media Embed (SCRUM-2) — accepts both images and videos in one field
  maxImageMB?: number; // default 20
  maxVideoMB?: number; // default 50
  // Media Embed — creator-uploaded reference media shown to the filler
  embeddedMediaData?: {
    name: string;
    size: number;
    type: string;
    dataUrl: string;
    mediaType: "image" | "video";
  };
  
  // Signature
  requireSignature?: boolean;
  signBeforeSubmit?: boolean;
  
  // Section/Instruction
  content?: string;
  embeddedImage?: string; // URL or base64
  
  // Section - nested fields
  children?: CanvasField[];
  isCollapsed?: boolean;
  layout?: "vertical" | "horizontal"; // Section layout (default: vertical)
  revealCondition?: {
    fieldUid: string;
    buttonId: string;
  };
  // Trigger system
  triggers?: Trigger[];
}

// ── Library field (saved customised component) ─────────────────────
interface LibraryField {
  libId: string;
  typeId: string;
  label: string;
  icon: React.ReactNode;
  category: CategoryKey;
  required: boolean;
  savedAt: number;
}

let _uid = 0;
const genUid = () => `cf_${++_uid}_${Date.now()}`;
let _lid = 0;
const genLibId = () => `lib_${++_lid}_${Date.now()}`;

// ── Drag item payloads ─────────────────────────────────────────────
interface PaletteDragItem {
  field: FieldTypeDef;
  overrideLabel?: string;
  overrideRequired?: boolean;
}

// ── Standard palette item ──────────────────────────────────────────
function PaletteItem({ field }: { field: FieldTypeDef }) {
  const [{ isDragging }, drag] = useDrag<PaletteDragItem, void, { isDragging: boolean }>(
    () => ({ type: ITEM_TYPES.PALETTE, item: { field }, collect: (m) => ({ isDragging: m.isDragging() }) }),
    [field]
  );
  const c = CAT_COLORS[field.category];
  return (
    <div
      ref={drag as unknown as React.RefObject<HTMLDivElement>}
      className={`touch-none flex items-center gap-2.5 px-3 py-2 rounded-xl border border-transparent hover:border-gray-100 hover:bg-gray-50/80 cursor-grab active:cursor-grabbing transition-all duration-100 select-none group ${isDragging ? "opacity-25 scale-95" : ""}`}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
        {field.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700">{field.label}</p>
        <p className="text-[10px] text-gray-400 leading-tight mt-0.5 truncate">{field.description}</p>
      </div>
      <GripVertical className="w-3.5 h-3.5 text-gray-200 group-hover:text-gray-400 shrink-0 transition-colors" />
    </div>
  );
}

// ── Library palette item ───────────────────────────────────────────
function LibraryItem({
  field,
  onRemove,
}: {
  field: LibraryField;
  onRemove: (libId: string) => void;
}) {
  // Reconstruct a FieldTypeDef from LibraryField so it can be dropped
  const asDef: FieldTypeDef = {
    id: field.typeId,
    label: field.label,
    icon: field.icon,
    category: field.category,
    description: field.required ? "Required · from Library" : "Optional · from Library",
  };
  const dragItem: PaletteDragItem = {
    field: asDef,
    overrideLabel: field.label,
    overrideRequired: field.required,
  };

  const [{ isDragging }, drag] = useDrag<PaletteDragItem, void, { isDragging: boolean }>(
    () => ({ type: ITEM_TYPES.PALETTE, item: dragItem, collect: (m) => ({ isDragging: m.isDragging() }) }),
    [field]
  );

  const c = CAT_COLORS[field.category];

  return (
    <div
      ref={drag as unknown as React.RefObject<HTMLDivElement>}
      className={`touch-none group/lib flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:border-indigo-200 hover:bg-indigo-50/70 cursor-grab active:cursor-grabbing transition-all duration-100 select-none ${isDragging ? "opacity-25 scale-95" : ""}`}
    >
      {/* Icon with small library badge */}
      <div className="relative shrink-0">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.bg} ${c.text}`}>
          {getFieldIcon(field.typeId)}
        </span>
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center">
          <BookmarkCheck className="w-2 h-2 text-white" />
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 truncate">{field.label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] ${c.text} ${c.bg} px-1.5 py-px rounded-full`}>
            {CAT_LABELS[field.category].split(" ")[0]}
          </span>
          {field.required && (
            <span className="text-[10px] text-[#2abaad] bg-teal-50 px-1.5 py-px rounded-full">Required</span>
          )}
        </div>
      </div>

      {/* Grip + Remove */}
      <div className="flex items-center gap-1 shrink-0">
        <GripVertical className="w-3.5 h-3.5 text-indigo-200 group-hover/lib:text-indigo-400 transition-colors" />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(field.libId); }}
          className="w-5 h-5 flex items-center justify-center rounded-md text-indigo-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover/lib:opacity-100 transition-all duration-150"
          title="Remove from library"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Canvas card ────────────────────────────────────────────────────
interface CanvasCardProps {
  field: CanvasField;
  index: number;
  total: number;
  moveCard: (from: number, to: number) => void;
  onDelete: (uid: string) => void;
  onUpdateLabel: (uid: string, label: string) => void;
  onToggleRequired: (uid: string) => void;
  onSaveToLibrary: (uid: string) => void;
  isInLibrary: (uid: string) => boolean;
  isSelected: boolean;
  onSelect: (uid: string) => void;
  onDropIntoSection?: (sectionUid: string, fieldType: FieldTypeDef, overrideLabel?: string, overrideRequired?: boolean) => void;
  onUpdateField?: (uid: string, updates: Partial<CanvasField>) => void;
  onRemoveFromSection?: (sectionUid: string, childUid: string) => void;
  selectedChildUid?: string;
  onSelectChild?: (uid: string) => void;
  allFields?: CanvasField[];
}

function CanvasCard({
  field, index, total, moveCard,
  onDelete, onUpdateLabel, onToggleRequired,
  onSaveToLibrary, isInLibrary,
  isSelected, onSelect,
  onDropIntoSection,
  onUpdateField,
  onRemoveFromSection,
  selectedChildUid,
  onSelectChild,
  allFields,
}: CanvasCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const gripRef = useRef<HTMLSpanElement>(null);
  const c = CAT_COLORS[field.category];
  const [justSaved, setJustSaved] = useState(false);
  const [configTab, setConfigTab] = useState<"properties" | "triggers">("properties");
  const saved = isInLibrary(field.uid);
  const triggerCount = field.triggers?.length ?? 0;

  const [{ isDragging }, drag, dragPreview] = useDrag(
    () => ({
      type: ITEM_TYPES.CANVAS,
      item: () => ({ uid: field.uid, index }),
      collect: (m) => ({ isDragging: m.isDragging() }),
    }),
    [field.uid, index]
  );

  const [{ isOver }, drop] = useDrop<{ uid: string; index: number }, void, { isOver: boolean }>(
    () => ({
      accept: ITEM_TYPES.CANVAS,
      collect: (m) => ({ isOver: m.isOver() }),
      hover(item, monitor) {
        if (!cardRef.current) return;
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;
        const rect = cardRef.current.getBoundingClientRect();
        const midY = (rect.bottom - rect.top) / 2;
        const clientY = monitor.getClientOffset()!.y - rect.top;
        if (dragIndex < hoverIndex && clientY < midY) return;
        if (dragIndex > hoverIndex && clientY > midY) return;
        moveCard(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    }),
    [index, moveCard]
  );

  drag(gripRef);
  drop(dragPreview(cardRef));

  const handleSave = () => {
    onSaveToLibrary(field.uid);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  // If this is a section, render the section card instead
  if (field.typeId === "section") {
    return (
      <SectionCard
        field={field}
        index={index}
        moveCard={moveCard}
        onDelete={onDelete}
        onUpdateLabel={onUpdateLabel}
        onToggleRequired={onToggleRequired}
        onSaveToLibrary={onSaveToLibrary}
        isInLibrary={isInLibrary}
        isSelected={isSelected}
        onSelect={onSelect}
        onDropIntoSection={onDropIntoSection!}
        onUpdateField={onUpdateField!}
        onRemoveFromSection={onRemoveFromSection!}
        selectedChildUid={selectedChildUid || ""}
        onSelectChild={onSelectChild!}
      />
    );
  }

  const inputClass = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all";

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = value;
    onUpdateField!(field.uid, { options: newOptions });
  };

  const handleAddOption = () => {
    const newOptions = [...(field.options || []), ""];
    onUpdateField!(field.uid, { options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = [...(field.options || [])];
    newOptions.splice(index, 1);
    onUpdateField!(field.uid, { options: newOptions });
  };

  return (
    <div className="flex flex-col">
      <div
        ref={cardRef}
        onClick={() => onSelect(field.uid)}
        className={`group flex items-center gap-3 px-4 py-3.5 bg-white ${isSelected ? 'rounded-t-xl' : 'rounded-xl'} border-2 transition-all duration-150 cursor-pointer ${
          isDragging
            ? "opacity-30 border-dashed border-gray-200 shadow-none"
            : isOver
            ? "border-[#2abaad] shadow-lg shadow-teal-50"
            : isSelected
            ? "border-[#2abaad] shadow-md shadow-teal-50 border-b-0"
            : "border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md hover:shadow-gray-50"
        }`}
      >
        {/* Index badge */}
        <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] shrink-0 select-none">
          {index + 1}
        </span>

        {/* Drag grip */}
        <span ref={gripRef} className="cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 transition-colors shrink-0 touch-none">
          <GripVertical className="w-4 h-4" />
        </span>

        {/* Icon */}
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
          {getFieldIcon(field.typeId)}
        </span>

        {/* Editable label */}
        <input
          type="text"
          value={field.label}
          onChange={(e) => {
            e.stopPropagation();
            onUpdateLabel(field.uid, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 text-sm text-gray-700 bg-transparent border-b border-transparent focus:border-gray-200 outline-none py-0.5 transition-all placeholder:text-gray-300"
          placeholder="Field label…"
        />

        {/* Category pill */}
        <span className={`hidden sm:flex shrink-0 px-2 py-0.5 rounded-full text-[10px] tracking-wide ${c.bg} ${c.text}`}>
          {CAT_LABELS[field.category].split(" ")[0]}
        </span>

        {/* Required toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRequired(field.uid);
          }}
          className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] tracking-wide border transition-all duration-150 ${
            field.required
              ? "bg-[#2abaad] text-white border-[#2abaad]"
              : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
          }`}
        >
          {field.required ? "Required" : "Optional"}
        </button>

        {/* Trigger badge */}
        {triggerCount > 0 && (
          <span
            title={`${triggerCount} trigger${triggerCount !== 1 ? "s" : ""} configured`}
            className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[9px] font-bold"
          >
            <Zap className="w-2.5 h-2.5" />
            {triggerCount}
          </span>
        )}

        {/* Save to Library */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          title={saved ? "Already in library" : "Save to Library"}
          className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100 ${
            justSaved
              ? "text-indigo-500 bg-indigo-50 opacity-100 scale-110"
              : saved
              ? "text-indigo-400 bg-indigo-50 opacity-100"
              : "text-gray-300 hover:text-indigo-400 hover:bg-indigo-50"
          }`}
        >
          {justSaved || saved
            ? <BookmarkCheck className="w-3.5 h-3.5" />
            : <Bookmark className="w-3.5 h-3.5" />}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.uid);
          }}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all duration-150 opacity-0 group-hover:opacity-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Config panel — tabbed: Properties / Triggers */}
      {isSelected && (
        <div className="bg-teal-50/30 border-2 border-t-0 border-[#2abaad] rounded-b-xl overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-[#2abaad]/20">
            <button
              type="button"
              onClick={() => setConfigTab("properties")}
              className={`flex-1 py-2 text-[11px] font-semibold tracking-wide transition-colors ${
                configTab === "properties"
                  ? "bg-white text-[#2abaad] border-b-2 border-[#2abaad]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Properties
            </button>
            <button
              type="button"
              onClick={() => setConfigTab("triggers")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold tracking-wide transition-colors ${
                configTab === "triggers"
                  ? "bg-white text-orange-500 border-b-2 border-orange-400"
                  : "text-gray-400 hover:text-orange-400"
              }`}
            >
              <Zap className="w-3 h-3" />
              Triggers
              {triggerCount > 0 && (
                <span className="ml-0.5 px-1 py-px bg-orange-100 text-orange-600 rounded-full text-[9px] font-bold">
                  {triggerCount}
                </span>
              )}
            </button>
          </div>

          {/* Triggers tab */}
          {configTab === "triggers" && (
            <div className="px-4 py-4">
              <TriggerBuilder
                field={field}
                allFields={allFields ?? []}
                onUpdate={(triggers) => onUpdateField!(field.uid, { triggers })}
              />
            </div>
          )}

          {/* Properties tab */}
          {configTab === "properties" && (
          <div className="px-4 py-3">
          <div className="flex flex-col gap-4">
            {/* Title */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Field Title</label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdateLabel(field.uid, e.target.value)}
                placeholder="Enter field title…"
                className={inputClass}
              />
            </div>

            {/* Placeholder */}
            {(field.typeId === "short_text" || field.typeId === "long_text" || field.typeId === "number") && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Placeholder</label>
                <input
                  type="text"
                  value={field.placeholder || ""}
                  onChange={(e) => onUpdateField!(field.uid, { placeholder: e.target.value })}
                  placeholder="Enter placeholder text…"
                  className={inputClass}
                />
              </div>
            )}

            {/* Help Text */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Help Text</label>
              <textarea
                value={field.helpText || ""}
                onChange={(e) => onUpdateField!(field.uid, { helpText: e.target.value })}
                placeholder="Add helpful instructions…"
                rows={2}
                className={inputClass}
              />
            </div>

            {/* Dropdown Options */}
            {field.typeId === "dropdown" && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Options</label>
                <div className="flex flex-col gap-2">
                  {(field.options || []).map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-200 rounded-lg text-[10px] text-gray-400 hover:border-[#2abaad] hover:text-[#2abaad] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Option
                  </button>
                </div>
              </div>
            )}

            {/* Number Min/Max/Step */}
            {field.typeId === "number" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Min Value</label>
                    <input
                      type="number"
                      value={field.minValue ?? ""}
                      onChange={(e) => onUpdateField!(field.uid, { minValue: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Min"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Value</label>
                    <input
                      type="number"
                      value={field.maxValue ?? ""}
                      onChange={(e) => onUpdateField!(field.uid, { maxValue: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Max"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Step</label>
                  <input
                    type="number"
                    value={field.step ?? ""}
                    onChange={(e) => onUpdateField!(field.uid, { step: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="1"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* Rating */}
            {field.typeId === "rating" && (
              <>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Rating</label>
                  <input
                    type="number"
                    value={field.maxRating ?? 5}
                    onChange={(e) => onUpdateField!(field.uid, { maxRating: Number(e.target.value) || 5 })}
                    min="1"
                    max="10"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Rating Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateField!(field.uid, { ratingStyle: "star" })}
                      className={`px-3 py-2 rounded-lg text-xs transition-all ${
                        (field.ratingStyle || "star") === "star"
                          ? "bg-[#2abaad] text-white"
                          : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2abaad]"
                      }`}
                    >
                      Stars
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateField!(field.uid, { ratingStyle: "numeric" })}
                      className={`px-3 py-2 rounded-lg text-xs transition-all ${
                        field.ratingStyle === "numeric"
                          ? "bg-[#2abaad] text-white"
                          : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2abaad]"
                      }`}
                    >
                      Numeric
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Long Text */}
            {field.typeId === "long_text" && (
              <>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Rows</label>
                  <input
                    type="number"
                    value={field.rows ?? 3}
                    onChange={(e) => onUpdateField!(field.uid, { rows: Number(e.target.value) || 3 })}
                    min="2"
                    max="10"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Length</label>
                  <input
                    type="number"
                    value={field.maxLength ?? ""}
                    onChange={(e) => onUpdateField!(field.uid, { maxLength: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* Date/Time Default */}
            {(field.typeId === "date" || field.typeId === "time" || field.typeId === "datetime") && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id={`default-${field.uid}`}
                  checked={field.defaultToNow ?? false}
                  onChange={(e) => onUpdateField!(field.uid, { defaultToNow: e.target.checked })}
                  className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
                />
                <label htmlFor={`default-${field.uid}`} className="text-xs text-gray-600 cursor-pointer">
                  Default to current {field.typeId === "date" ? "date" : field.typeId === "time" ? "time" : "date & time"}
                </label>
              </div>
            )}

            {/* Temperature Unit */}
            {field.typeId === "temperature" && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Unit</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateField!(field.uid, { unit: "celsius" })}
                    className={`px-3 py-2 rounded-lg text-xs transition-all ${
                      (field.unit || "celsius") === "celsius"
                        ? "bg-[#2abaad] text-white"
                        : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2abaad]"
                    }`}
                  >
                    Celsius (°C)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateField!(field.uid, { unit: "fahrenheit" })}
                    className={`px-3 py-2 rounded-lg text-xs transition-all ${
                      field.unit === "fahrenheit"
                        ? "bg-[#2abaad] text-white"
                        : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2abaad]"
                    }`}
                  >
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>
            )}

            {/* Enhanced Field Configuration Panels */}
            <FieldConfigPanels field={field} inputClass={inputClass} onUpdateField={onUpdateField!} />

            {/* Section/Instruction Content */}
            {(field.typeId === "section" || field.typeId === "instruction") && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
                  {field.typeId === "section" ? "Section Title" : "Instruction Text"}
                </label>
                <textarea
                  value={field.content || ""}
                  onChange={(e) => onUpdateField!(field.uid, { content: e.target.value })}
                  placeholder={field.typeId === "section" ? "Enter section title…" : "Enter instruction text…"}
                  rows={3}
                  className={inputClass}
                />
              </div>
            )}
          </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Canvas drop zone ───────────────────────────────────────────────
function PaletteDropZone({
  onDrop, children, isEmpty,
}: {
  onDrop: (field: FieldTypeDef, overrideLabel?: string, overrideRequired?: boolean) => void;
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const [{ isOver, canDrop }, drop] = useDrop<PaletteDragItem, void, { isOver: boolean; canDrop: boolean }>(
    () => ({
      accept: ITEM_TYPES.PALETTE,
      drop: (item, monitor) => {
        // If a nested target (e.g. a SectionCard drop zone) already handled
        // this drop, do nothing — otherwise the field would be added to both
        // the section and the top-level canvas.
        if (monitor.didDrop()) return;
        onDrop(item.field, item.overrideLabel, item.overrideRequired);
      },
      collect: (m) => ({ isOver: m.isOver({ shallow: true }), canDrop: m.canDrop() }),
    }),
    [onDrop]
  );
  const active = isOver && canDrop;

  return (
    <div ref={drop as unknown as React.RefObject<HTMLDivElement>} className={`flex-1 min-h-full rounded-2xl transition-all duration-200 ${active ? "ring-2 ring-[#2abaad] ring-offset-4" : ""}`}>
      {isEmpty ? (
        <div className={`flex flex-col items-center justify-center h-full min-h-[420px] rounded-2xl border-2 border-dashed transition-all duration-200 ${active ? "border-[#2abaad] bg-teal-50/50" : "border-gray-200 bg-white/70 hover:border-gray-300"}`}>
          <div className="flex flex-col items-center gap-5 p-8 text-center max-w-sm">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-200 ${active ? "bg-[#2abaad] scale-110" : "bg-gradient-to-br from-teal-50 to-teal-100"}`}>
              <Plus className={`w-7 h-7 transition-colors ${active ? "text-white" : "text-[#2abaad]"}`} />
            </div>
            <div>
              <p className={`text-sm tracking-wide transition-colors ${active ? "text-[#2abaad]" : "text-gray-500"}`}>
                {active ? "Release to add field" : "Drop fields here"}
              </p>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Drag components from the left panel to start building your checklist
              </p>
            </div>
            {!active && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {["Short Text", "Checkbox", "Photo", "Date", "Yes / No"].map((label) => (
                  <span key={label} className="px-2.5 py-1 bg-gray-100 rounded-full text-[10px] text-gray-400">{label}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {children}
          <div className={`mt-1 py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all duration-200 ${active ? "border-[#2abaad] bg-teal-50/40 text-[#2abaad]" : "border-gray-100 text-gray-300 hover:border-gray-200 hover:text-gray-400"}`}>
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs">{active ? "Release to add here" : "Drop more fields"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mobile Step 2 ──────────────────────────────────────────────────
interface ChecklistStep2Props {
  onBack?: () => void;
  onNext?: () => void;
  canvasFields: CanvasField[];
  setCanvasFields: React.Dispatch<React.SetStateAction<CanvasField[]>>;
  onOpenNav?: () => void;
}

function Step2Mobile({ onBack, onNext, canvasFields, setCanvasFields, onOpenNav }: ChecklistStep2Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("basic");
  const [search, setSearch] = useState("");
  const [configField, setConfigField] = useState<string | null>(null);

  const handleAdd = (fieldType: FieldTypeDef) => {
    setCanvasFields((prev) => [
      ...prev,
      { uid: genUid(), typeId: fieldType.id, label: fieldType.label, icon: fieldType.icon, category: fieldType.category, required: false },
    ]);
    setPaletteOpen(false);
  };

  const handleDelete = (uid: string) => {
    setCanvasFields((prev) => prev.filter((f) => f.uid !== uid));
    if (configField === uid) setConfigField(null);
  };

  const handleMove = (uid: string, dir: -1 | 1) => {
    setCanvasFields((prev) => {
      const idx = prev.findIndex((f) => f.uid === uid);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const handleUpdateLabel = (uid: string, label: string) =>
    setCanvasFields((prev) => prev.map((f) => f.uid === uid ? { ...f, label } : f));

  const handleToggleRequired = (uid: string) =>
    setCanvasFields((prev) => prev.map((f) => f.uid === uid ? { ...f, required: !f.required } : f));

  const handleUpdateField = (uid: string, updates: Partial<CanvasField>) =>
    setCanvasFields((prev) => prev.map((f) => f.uid === uid ? { ...f, ...updates } : f));

  const filteredTypes = FIELD_TYPES.filter((f) =>
    search
      ? f.label.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase())
      : f.category === activeCategory
  );

  const requiredCount = canvasFields.filter((f) => f.required).length;
  const inputClass = "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all";

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={onOpenNav} aria-label="Open menu"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
            <button type="button" onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Build Checklist</p>
            <p className="text-[11px] text-gray-400">Step 2 of 3</p>
          </div>
          <div className="w-9 h-9" />
        </div>
        <div className="flex gap-1.5 px-4 pb-3">
          <div className="flex-1 h-1 rounded-full bg-[#2abaad]" />
          <div className="flex-1 h-1 rounded-full bg-[#2abaad]" />
          <div className="flex-1 h-1 rounded-full bg-gray-200" />
        </div>
      </header>

      {/* Scrollable canvas */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-36">

        {/* Stats bar */}
        {canvasFields.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-500 shadow-sm">
              {canvasFields.length} field{canvasFields.length !== 1 ? "s" : ""}
            </span>
            <span className="px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs text-[#2abaad]">
              {requiredCount} required
            </span>
            <button type="button" onClick={() => setCanvasFields([])}
              className="ml-auto px-2.5 py-1 rounded-full text-xs text-gray-400 bg-white border border-gray-200 flex items-center gap-1 active:bg-gray-50">
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>
        )}

        {/* Empty state */}
        {canvasFields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mb-4 shadow-sm">
              <Plus className="w-7 h-7 text-[#2abaad]" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1.5">No fields yet</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-5">
              Tap <span className="text-[#2abaad] font-medium">+ Add Field</span> below to start building
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {["Short Text", "Checkbox", "Photo", "Date", "Yes / No"].map((l) => (
                <span key={l} className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-400">{l}</span>
              ))}
            </div>
          </div>
        )}

        {/* Field cards */}
        <div className="flex flex-col gap-2.5">
          {canvasFields.map((field, idx) => {
            const c = CAT_COLORS[field.category];
            const isOpen = configField === field.uid;
            return (
              <div key={field.uid} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Row */}
                <div
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${isOpen ? "bg-teal-50/40" : "active:bg-gray-50"}`}
                  onClick={() => setConfigField(isOpen ? null : field.uid)}
                >
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] shrink-0 font-medium">{idx + 1}</span>
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{getFieldIcon(field.typeId)}</span>
                  <span className="flex-1 text-sm font-medium text-gray-700 truncate">{field.label || "Untitled"}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleRequired(field.uid); }}
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${field.required ? "bg-[#2abaad] text-white border-[#2abaad]" : "bg-white text-gray-400 border-gray-200"}`}>
                    {field.required ? "Req." : "Opt."}
                  </button>
                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </div>

                {/* Config panel */}
                {isOpen && (
                  <div className="border-t border-teal-100 bg-teal-50/20 px-4 py-4 flex flex-col gap-4">
                    {/* Move + Delete */}
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleMove(field.uid, -1)} disabled={idx === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-500 disabled:opacity-30 active:bg-gray-50">
                        <ChevronUp className="w-3.5 h-3.5" /> Move Up
                      </button>
                      <button type="button" onClick={() => handleMove(field.uid, 1)} disabled={idx === canvasFields.length - 1}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-500 disabled:opacity-30 active:bg-gray-50">
                        <ChevronDown className="w-3.5 h-3.5" /> Move Down
                      </button>
                      <button type="button" onClick={() => handleDelete(field.uid)}
                        className="w-10 h-9 flex items-center justify-center rounded-xl bg-red-50 border border-red-200 text-red-400 active:bg-red-100 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Label */}
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Field Label</label>
                      <input type="text" value={field.label} onChange={(e) => handleUpdateLabel(field.uid, e.target.value)} placeholder="Enter field label…" className={inputClass} />
                    </div>

                    {/* Placeholder */}
                    {(field.typeId === "short_text" || field.typeId === "long_text" || field.typeId === "number") && (
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Placeholder</label>
                        <input type="text" value={field.placeholder || ""} onChange={(e) => handleUpdateField(field.uid, { placeholder: e.target.value })} placeholder="Placeholder text…" className={inputClass} />
                      </div>
                    )}

                    {/* Help Text */}
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Help Text</label>
                      <textarea value={field.helpText || ""} onChange={(e) => handleUpdateField(field.uid, { helpText: e.target.value })} placeholder="Add helpful instructions…" rows={2} className={inputClass} />
                    </div>

                    {/* Dropdown options */}
                    {field.typeId === "dropdown" && (
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Options</label>
                        <div className="flex flex-col gap-2">
                          {(field.options || []).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="text" value={opt} onChange={(e) => { const n = [...(field.options||[])]; n[i]=e.target.value; handleUpdateField(field.uid,{options:n}); }} placeholder={`Option ${i+1}`} className={inputClass} />
                              <button type="button" onClick={() => { const n=[...(field.options||[])]; n.splice(i,1); handleUpdateField(field.uid,{options:n}); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                          <button type="button" onClick={() => handleUpdateField(field.uid, { options: [...(field.options||[]), ""] })}
                            className="flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 active:bg-gray-50">
                            <Plus className="w-3.5 h-3.5" /> Add Option
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Number min/max */}
                    {field.typeId === "number" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Min</label>
                          <input type="number" value={field.minValue??""} onChange={(e)=>handleUpdateField(field.uid,{minValue:e.target.value?Number(e.target.value):undefined})} placeholder="Min" className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max</label>
                          <input type="number" value={field.maxValue??""} onChange={(e)=>handleUpdateField(field.uid,{maxValue:e.target.value?Number(e.target.value):undefined})} placeholder="Max" className={inputClass} />
                        </div>
                      </div>
                    )}

                    {/* Rating */}
                    {field.typeId === "rating" && (
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Stars</label>
                        <input type="number" value={field.maxRating??5} min={2} max={10} onChange={(e)=>handleUpdateField(field.uid,{maxRating:Number(e.target.value)||5})} className={inputClass} />
                      </div>
                    )}

                    {/* Date/Time default now */}
                    {(field.typeId==="date"||field.typeId==="time"||field.typeId==="datetime") && (
                      <div className="flex items-center gap-3 px-3 py-3 bg-white border border-gray-200 rounded-xl cursor-pointer" onClick={()=>handleUpdateField(field.uid,{defaultToNow:!field.defaultToNow})}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${field.defaultToNow?"bg-[#2abaad] border-[#2abaad]":"border-gray-300"}`}>
                          {field.defaultToNow && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs text-gray-600">Default to current {field.typeId==="date"?"date":field.typeId==="time"?"time":"date & time"}</span>
                      </div>
                    )}

                    {/* Temperature */}
                    {field.typeId==="temperature" && (
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Unit</label>
                        <div className="flex gap-2">
                          {(["celsius","fahrenheit"] as const).map((u)=>(
                            <button key={u} type="button" onClick={()=>handleUpdateField(field.uid,{unit:u})}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${(field.unit||"celsius")===u?"bg-[#2abaad] text-white":"bg-white border border-gray-200 text-gray-500"}`}>
                              {u==="celsius"?"°C":"°F"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Long text rows */}
                    {field.typeId==="long_text" && (
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Rows</label>
                        <input type="number" value={field.rows??3} min={2} max={10} onChange={(e)=>handleUpdateField(field.uid,{rows:Number(e.target.value)||3})} className={inputClass} />
                      </div>
                    )}

                    {/* Category badge */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>{CAT_LABELS[field.category]}</span>
                      <span className="text-[10px] text-gray-400">{FIELD_TYPES.find(f=>f.id===field.typeId)?.description}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-100 active:bg-gray-200">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button type="button" onClick={() => setPaletteOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2abaad]/10 border-2 border-dashed border-[#2abaad]/40 text-[#2abaad] text-sm font-semibold active:bg-[#2abaad]/20">
            <Plus className="w-4 h-4" /> Add Field
          </button>
          <button type="button" onClick={onNext} disabled={canvasFields.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2abaad] text-white text-sm font-semibold active:bg-[#24a699] shadow-md shadow-teal-200 disabled:opacity-40">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Palette bottom sheet */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPaletteOpen(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh]">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Add a Field</p>
              <button type="button" onClick={() => setPaletteOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {/* Search */}
            <div className="px-4 py-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fields…"
                  className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all" />
                {search && <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
            </div>
            {/* Category tabs */}
            {!search && (
              <div className="px-4 shrink-0">
                <div className="flex gap-1.5 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
                  {CATEGORIES.map((cat) => {
                    const c = CAT_COLORS[cat];
                    return (
                      <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${activeCategory === cat ? `${c.bg} ${c.text}` : "bg-gray-100 text-gray-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        {CAT_LABELS[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Field grid */}
            <div className="overflow-y-auto px-4 pb-8">
              {filteredTypes.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <AlertCircle className="w-6 h-6 text-gray-200" />
                  <p className="text-xs text-gray-400">No fields match "{search}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredTypes.map((ft) => {
                    const c = CAT_COLORS[ft.category];
                    return (
                      <button key={ft.id} type="button" onClick={() => handleAdd(ft)}
                        className="flex items-center gap-3 px-3 py-3.5 bg-white border border-gray-100 rounded-2xl text-left active:bg-gray-50 active:border-[#2abaad]/30 shadow-sm transition-all">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{ft.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-700 leading-tight">{ft.label}</p>
                          <p className="text-[10px] text-gray-400 leading-tight mt-0.5 truncate">{ft.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

function Step2Inner({ onBack, onNext, canvasFields, setCanvasFields, onOpenNav }: ChecklistStep2Props) {
  const [search, setSearch] = useState("");
  const [libraryFields, setLibraryFields] = useState<LibraryField[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedChildUid, setSelectedChildUid] = useState<string>("");

  // ── Library actions ──────────────────────────────────────────────
  const saveToLibrary = useCallback((uid: string) => {
    setCanvasFields((prev) => {
      const field = prev.find((f) => f.uid === uid);
      if (!field) return prev;
      // Don't duplicate exact same label+typeId combo
      setLibraryFields((lib) => {
        const duplicate = lib.find(
          (l) => l.typeId === field.typeId && l.label === field.label
        );
        if (duplicate) return lib;
        return [
          {
            libId: genLibId(),
            typeId: field.typeId,
            label: field.label,
            icon: field.icon,
            category: field.category,
            required: field.required,
            savedAt: Date.now(),
          },
          ...lib,
        ];
      });
      return prev;
    });
  }, []);

  const removeFromLibrary = useCallback((libId: string) => {
    setLibraryFields((lib) => lib.filter((l) => l.libId !== libId));
  }, []);

  // A canvas field "isInLibrary" if same typeId+label exists in library
  const isInLibrary = useCallback(
    (uid: string) => {
      const field = canvasFields.find((f) => f.uid === uid);
      if (!field) return false;
      return libraryFields.some(
        (l) => l.typeId === field.typeId && l.label === field.label
      );
    },
    [canvasFields, libraryFields]
  );

  // ── Canvas actions ───────────────────────────────────────────────
  const handleDrop = useCallback(
    (fieldType: FieldTypeDef, overrideLabel?: string, overrideRequired?: boolean) => {
      setCanvasFields((prev) => [
        ...prev,
        {
          uid: genUid(),
          typeId: fieldType.id,
          label: overrideLabel ?? fieldType.label,
          icon: fieldType.icon,
          category: fieldType.category,
          required: overrideRequired ?? false,
        },
      ]);
    },
    []
  );

  const moveCard = useCallback((from: number, to: number) => {
    setCanvasFields((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const handleDelete = useCallback((uid: string) => {
    setCanvasFields((prev) => prev.filter((f) => f.uid !== uid));
  }, []);

  const handleUpdateLabel = useCallback((uid: string, label: string) => {
    setCanvasFields((prev) => prev.map((f) => {
      if (f.uid === uid) return { ...f, label };
      if (f.typeId === "section" && f.children) {
        return { ...f, children: f.children.map((c) => c.uid === uid ? { ...c, label } : c) };
      }
      return f;
    }));
  }, []);

  const handleToggleRequired = useCallback((uid: string) => {
    setCanvasFields((prev) => prev.map((f) => {
      if (f.uid === uid) return { ...f, required: !f.required };
      if (f.typeId === "section" && f.children) {
        return { ...f, children: f.children.map((c) => c.uid === uid ? { ...c, required: !c.required } : c) };
      }
      return f;
    }));
  }, []);

  const handleUpdateField = useCallback((uid: string, updates: Partial<CanvasField>) => {
    setCanvasFields((prev) => prev.map((f) => {
      if (f.uid === uid) return { ...f, ...updates };
      if (f.typeId === "section" && f.children) {
        return { ...f, children: f.children.map((c) => c.uid === uid ? { ...c, ...updates } : c) };
      }
      return f;
    }));
  }, []);

  // ── Section handlers ─────────────────────────────────────────────
  const handleDropIntoSection = useCallback((sectionUid: string, fieldType: FieldTypeDef, overrideLabel?: string, overrideRequired?: boolean) => {
    setCanvasFields((prev) =>
      prev.map((f) => {
        if (f.uid === sectionUid && f.typeId === "section") {
          const newChild: CanvasField = {
            uid: genUid(),
            typeId: fieldType.id,
            label: overrideLabel ?? fieldType.label,
            icon: fieldType.icon,
            category: fieldType.category,
            required: overrideRequired ?? false,
          };
          return {
            ...f,
            children: [...(f.children || []), newChild],
          };
        }
        return f;
      })
    );
  }, []);

  const handleRemoveFromSection = useCallback((sectionUid: string, childUid: string) => {
    setCanvasFields((prev) =>
      prev.map((f) => {
        if (f.uid === sectionUid && f.typeId === "section") {
          return {
            ...f,
            children: (f.children || []).filter((c) => c.uid !== childUid),
          };
        }
        return f;
      })
    );
  }, []);

  // ── Palette filtering ───────────────────────────────────────────
  const filteredTypes = FIELD_TYPES.filter(
    (f) =>
      f.label.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase())
  );

  const requiredCount = canvasFields.filter((f) => f.required).length;
  const triggerTotal = canvasFields.reduce((sum, f) => sum + (f.triggers?.length ?? 0), 0);

  return (
    <div className="hidden sm:flex h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenNav} aria-label="Open menu"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[#2abaad] tracking-wide uppercase text-xs">Checklist Master</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-700 tracking-wide uppercase text-xs">New Checklist</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-400 tracking-wide uppercase text-xs">Build</span>
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs transition-all ${s === 1 ? "bg-teal-50 text-[#2abaad] ring-2 ring-teal-100" : s === 2 ? "bg-[#2abaad] text-white shadow-md shadow-teal-200" : "bg-gray-100 text-gray-400"}`}>
                {s === 1 ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-px ${s < 2 ? "bg-[#2abaad]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <button type="button" className="flex items-center gap-2 px-4 py-2 bg-white border border-[#2abaad] text-[#2abaad] rounded-xl text-xs tracking-wide hover:bg-teal-50 transition-colors shadow-sm">
          <Copy className="w-3.5 h-3.5" />
          Copy From
        </button>
      </header>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: Palette ── */}
        <aside className="w-72 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">

          {/* Palette header + search */}
          <div className="px-4 pt-5 pb-3 border-b border-gray-50 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-600 tracking-widest uppercase">Components</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fields…"
                className="w-full pl-8 pr-7 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Field + Library list */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Library section ── */}
            {!search && (
              <div className="border-b border-gray-100">
                {/* Library header */}
                <button
                  type="button"
                  onClick={() => setLibraryOpen((o) => !o)}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-indigo-50/50 transition-colors group/lib-header"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <span className="text-xs text-indigo-600 tracking-widest uppercase flex-1 text-left">Library</span>
                  {libraryFields.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded-full text-[10px] leading-none">
                      {libraryFields.length}
                    </span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-indigo-300 transition-transform duration-200 ${libraryOpen ? "" : "-rotate-90"}`} />
                </button>

                {/* Library body */}
                {libraryOpen && (
                  <div className="px-2 pb-3">
                    {libraryFields.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-5 px-4 text-center">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-indigo-300" />
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          Save customised fields from the canvas using the{" "}
                          <span className="inline-flex items-center gap-0.5 text-indigo-400">
                            <Bookmark className="w-2.5 h-2.5" /> bookmark
                          </span>{" "}
                          button to reuse them here.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 mt-1">
                        {libraryFields.map((lf) => (
                          <LibraryItem key={lf.libId} field={lf} onRemove={removeFromLibrary} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Field categories ── */}
            <div className="px-2 py-2">
              {search ? (
                filteredTypes.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                    <AlertCircle className="w-6 h-6 text-gray-200" />
                    <p className="text-xs text-gray-400">No fields match "{search}"</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {filteredTypes.map((f) => <PaletteItem key={f.id} field={f} />)}
                  </div>
                )
              ) : (
                CATEGORIES.map((cat) => {
                  const fields = FIELD_TYPES.filter((f) => f.category === cat);
                  const c = CAT_COLORS[cat];
                  return (
                    <div key={cat} className="mb-3">
                      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest">{CAT_LABELS[cat]}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {fields.map((f) => <PaletteItem key={f.id} field={f} />)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Tip footer */}
          <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/60 shrink-0">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Drag fields onto the canvas. Click{" "}
              <span className="inline-flex items-center gap-0.5 text-indigo-400">
                <Bookmark className="w-2.5 h-2.5" /> bookmark
              </span>{" "}
              on any card to save it to your Library.
            </p>
          </div>
        </aside>

        {/* ── Right: Canvas ── */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Canvas toolbar */}
          <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {canvasFields.length === 0 ? "Canvas is empty" : `${canvasFields.length} field${canvasFields.length > 1 ? "s" : ""}`}
              </span>
              {canvasFields.length > 0 && (
                <>
                  <span className="w-px h-3.5 bg-gray-200" />
                  <span className="px-2 py-0.5 bg-[#2abaad]/10 text-[#2abaad] rounded-full text-[10px]">{requiredCount} required</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[10px]">{canvasFields.length - requiredCount} optional</span>
                  {triggerTotal > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[10px]">
                      <Zap className="w-2.5 h-2.5" />{triggerTotal} trigger{triggerTotal !== 1 ? "s" : ""}
                    </span>
                  )}
                </>
              )}
            </div>
            {canvasFields.length > 0 && (
              <button type="button" onClick={() => setCanvasFields([])} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50">
                <RotateCcw className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Canvas area */}
          <div
            className="flex-1 overflow-y-auto p-6"
            style={{ backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          >
            <PaletteDropZone onDrop={handleDrop} isEmpty={canvasFields.length === 0}>
              {canvasFields.map((field, idx) => (
                <CanvasCard
                  key={field.uid}
                  field={field}
                  index={idx}
                  total={canvasFields.length}
                  moveCard={moveCard}
                  onDelete={handleDelete}
                  onUpdateLabel={handleUpdateLabel}
                  onToggleRequired={handleToggleRequired}
                  onSaveToLibrary={saveToLibrary}
                  isInLibrary={isInLibrary}
                  isSelected={selectedField === field.uid}
                  onSelect={setSelectedField}
                  onDropIntoSection={handleDropIntoSection}
                  onUpdateField={handleUpdateField}
                  onRemoveFromSection={handleRemoveFromSection}
                  selectedChildUid={selectedChildUid}
                  onSelectChild={setSelectedChildUid}
                  allFields={canvasFields}
                />
              ))}
            </PaletteDropZone>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-40 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
            <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <button type="button" className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                Save Draft
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={canvasFields.length === 0}
                className="px-5 py-2.5 rounded-xl bg-[#2abaad] text-white text-sm hover:bg-[#24a699] transition-colors shadow-sm shadow-teal-200 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Continue
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function ChecklistStep2(props: ChecklistStep2Props) {
  const dndBackend = useMemo(() => getChecklistStep2DndBackend(), []);
  const dndOptions = useMemo(() => getChecklistStep2DndOptions(), []);

  return (
    <>
      {/* Mobile */}
      <div className="block sm:hidden">
        <Step2Mobile {...props} />
      </div>
      {/* Tablet / desktop: TouchBackend on touch devices, HTML5Backend otherwise */}
      <DndProvider backend={dndBackend} options={dndOptions}>
        <Step2Inner {...props} />
      </DndProvider>
    </>
  );
}