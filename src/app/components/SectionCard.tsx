import { useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  GripVertical,
  X,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Plus,
  Heading1,
  Trash2,
  AlignLeft,
  Columns2,
  AlertTriangle,
} from "lucide-react";
import { CanvasField, getFieldIcon } from "./ChecklistStep2";
import { FieldConfigPanels } from "./FieldConfigPanels";

const ITEM_TYPES = { PALETTE: "PALETTE", CANVAS: "CANVAS" } as const;

const CAT_COLORS = {
  basic:     { bg: "bg-teal-100",   text: "text-teal-600",   dot: "bg-teal-400",   border: "border-teal-200"   },
  datetime:  { bg: "bg-sky-100",    text: "text-sky-600",    dot: "bg-sky-400",    border: "border-sky-200"    },
  media:     { bg: "bg-violet-100", text: "text-violet-600", dot: "bg-violet-400", border: "border-violet-200" },
  structure: { bg: "bg-amber-100",  text: "text-amber-600",  dot: "bg-amber-400",  border: "border-amber-200"  },
  advanced:  { bg: "bg-rose-100",   text: "text-rose-600",   dot: "bg-rose-400",   border: "border-rose-200"   },
} as const;

type CategoryKey = keyof typeof CAT_COLORS;

interface FieldTypeDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: CategoryKey;
  description: string;
}

interface PaletteDragItem {
  field: FieldTypeDef;
  overrideLabel?: string;
  overrideRequired?: boolean;
}

interface SectionCardProps {
  field: CanvasField;
  index: number;
  moveCard: (from: number, to: number) => void;
  onDelete: (uid: string) => void;
  onUpdateLabel: (uid: string, label: string) => void;
  onSaveToLibrary: (uid: string) => void;
  isInLibrary: (uid: string) => boolean;
  isSelected: boolean;
  onSelect: (uid: string) => void;
  onDropIntoSection: (sectionUid: string, fieldType: FieldTypeDef, overrideLabel?: string, overrideRequired?: boolean) => void;
  onUpdateField: (uid: string, updates: Partial<CanvasField>) => void;
  onRemoveFromSection: (sectionUid: string, childUid: string) => void;
  onToggleRequired: (uid: string) => void;
  selectedChildUid?: string;
  onSelectChild: (uid: string) => void;
}

// Nested field card component with collapsible properties
function NestedFieldCard({
  child,
  childIndex,
  sectionUid,
  isSelected,
  onSelect,
  onUpdateLabel,
  onToggleRequired,
  onUpdateField,
  onRemoveFromSection,
  compact,
}: {
  child: CanvasField;
  childIndex: number;
  sectionUid: string;
  isSelected: boolean;
  onSelect: (uid: string) => void;
  onUpdateLabel: (uid: string, label: string) => void;
  onToggleRequired: (uid: string) => void;
  onUpdateField: (uid: string, updates: Partial<CanvasField>) => void;
  onRemoveFromSection: (sectionUid: string, childUid: string) => void;
  compact?: boolean;
}) {
  const c = CAT_COLORS[child.category];
  const inputClass = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all";

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(child.options || [])];
    newOptions[index] = value;
    onUpdateField(child.uid, { options: newOptions });
  };

  const handleAddOption = () => {
    const newOptions = [...(child.options || []), ""];
    onUpdateField(child.uid, { options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = [...(child.options || [])];
    newOptions.splice(index, 1);
    onUpdateField(child.uid, { options: newOptions });
  };

  return (
    <div className="flex flex-col">
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(child.uid);
        }}
        className={`group/child flex items-center gap-2 px-3 py-2 bg-white ${isSelected ? 'rounded-t-lg' : 'rounded-lg'} border ${isSelected ? 'border-[#2abaad] border-b-0' : 'border-amber-100'} transition-all cursor-pointer`}
      >
        <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] shrink-0">
          {childIndex + 1}
        </span>
        <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
          {getFieldIcon(child.typeId)}
        </span>
        <input
          type="text"
          value={child.label}
          onChange={(e) => {
            e.stopPropagation();
            onUpdateLabel(child.uid, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs text-gray-700 bg-transparent border-b border-transparent focus:border-gray-200 outline-none py-0.5 transition-all placeholder:text-gray-300 min-w-0"
          placeholder="Field label…"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRequired(child.uid);
          }}
          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] tracking-wide border transition-all duration-150 ${
            child.required
              ? "bg-[#2abaad] text-white border-[#2abaad]"
              : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
          }`}
        >
          {child.required ? "Req." : "Opt."}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFromSection(sectionUid, child.uid);
          }}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover/child:opacity-100"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Properties - Only show when selected */}
      {isSelected && (
        <div className="px-3 py-2.5 bg-teal-50/30 border border-t-0 border-[#2abaad] rounded-b-lg">
          <div className="flex flex-col gap-3">
            {/* Title */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Field Title</label>
              <input
                type="text"
                value={child.label}
                onChange={(e) => onUpdateLabel(child.uid, e.target.value)}
                placeholder="Enter field title…"
                className={inputClass}
              />
            </div>

            {/* Placeholder */}
            {(child.typeId === "short_text" || child.typeId === "long_text" || child.typeId === "number") && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Placeholder</label>
                <input
                  type="text"
                  value={child.placeholder || ""}
                  onChange={(e) => onUpdateField(child.uid, { placeholder: e.target.value })}
                  placeholder="Enter placeholder text…"
                  className={inputClass}
                />
              </div>
            )}

            {/* Help Text */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Help Text</label>
              <textarea
                value={child.helpText || ""}
                onChange={(e) => onUpdateField(child.uid, { helpText: e.target.value })}
                placeholder="Add helpful instructions…"
                rows={2}
                className={inputClass}
              />
            </div>

            {/* Dropdown Options */}
            {child.typeId === "dropdown" && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Options</label>
                <div className="flex flex-col gap-2">
                  {(child.options || []).map((opt, idx) => (
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
            {child.typeId === "number" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Min Value</label>
                    <input
                      type="number"
                      value={child.minValue ?? ""}
                      onChange={(e) => onUpdateField(child.uid, { minValue: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Min"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Value</label>
                    <input
                      type="number"
                      value={child.maxValue ?? ""}
                      onChange={(e) => onUpdateField(child.uid, { maxValue: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Max"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Step</label>
                  <input
                    type="number"
                    value={child.step ?? ""}
                    onChange={(e) => onUpdateField(child.uid, { step: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="1"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* Rating */}
            {child.typeId === "rating" && (
              <>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Rating</label>
                  <input
                    type="number"
                    value={child.maxRating ?? 5}
                    onChange={(e) => onUpdateField(child.uid, { maxRating: Number(e.target.value) || 5 })}
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
                      onClick={() => onUpdateField(child.uid, { ratingStyle: "star" })}
                      className={`px-3 py-2 rounded-lg text-xs transition-all ${
                        (child.ratingStyle || "star") === "star"
                          ? "bg-[#2abaad] text-white"
                          : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2abaad]"
                      }`}
                    >
                      Stars
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateField(child.uid, { ratingStyle: "numeric" })}
                      className={`px-3 py-2 rounded-lg text-xs transition-all ${
                        child.ratingStyle === "numeric"
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
            {child.typeId === "long_text" && (
              <>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Rows</label>
                  <input
                    type="number"
                    value={child.rows ?? 3}
                    onChange={(e) => onUpdateField(child.uid, { rows: Number(e.target.value) || 3 })}
                    min="2"
                    max="10"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Length</label>
                  <input
                    type="number"
                    value={child.maxLength ?? ""}
                    onChange={(e) => onUpdateField(child.uid, { maxLength: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Unlimited"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* Date/Time Default */}
            {(child.typeId === "date" || child.typeId === "time" || child.typeId === "datetime") && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id={`default-${child.uid}`}
                  checked={child.defaultToNow ?? false}
                  onChange={(e) => onUpdateField(child.uid, { defaultToNow: e.target.checked })}
                  className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
                />
                <label htmlFor={`default-${child.uid}`} className="text-xs text-gray-600 cursor-pointer">
                  Default to current {child.typeId === "date" ? "date" : child.typeId === "time" ? "time" : "date & time"}
                </label>
              </div>
            )}

            {/* Temperature Unit */}
            {child.typeId === "temperature" && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Unit</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateField(child.uid, { unit: "celsius" })}
                    className={`px-3 py-2 rounded-lg text-xs transition-all ${
                      (child.unit || "celsius") === "celsius"
                        ? "bg-[#2abaad] text-white"
                        : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2abaad]"
                    }`}
                  >
                    Celsius (°C)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateField(child.uid, { unit: "fahrenheit" })}
                    className={`px-3 py-2 rounded-lg text-xs transition-all ${
                      child.unit === "fahrenheit"
                        ? "bg-[#2abaad] text-white"
                        : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2abaad]"
                    }`}
                  >
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>
            )}

            {/* ── FieldConfigPanels handles all advanced types:
                   media_embed, number_unit, number_threshold, custom_buttons,
                   photo, video, file, date/time constraints, dropdown toggles, etc. ── */}
            <FieldConfigPanels
              field={child}
              inputClass={inputClass}
              onUpdateField={onUpdateField}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SectionCard({
  field,
  index,
  moveCard,
  onDelete,
  onUpdateLabel,
  onSaveToLibrary,
  isInLibrary,
  isSelected,
  onSelect,
  onDropIntoSection,
  onUpdateField,
  onRemoveFromSection,
  onToggleRequired,
  selectedChildUid,
  onSelectChild,
}: SectionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const gripRef = useRef<HTMLSpanElement>(null);
  const c = CAT_COLORS[field.category];
  const [justSaved, setJustSaved] = useState(false);
  const [layoutWarning, setLayoutWarning] = useState(false);
  const saved = isInLibrary(field.uid);
  const isOpen = !field.isCollapsed;
  const layout = field.layout || "vertical";
  const children = field.children || [];

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

  // Drop zone for adding fields into the section
  const [{ isOverSection, canDropSection }, dropSection] = useDrop<PaletteDragItem, void, { isOverSection: boolean; canDropSection: boolean }>(
    () => ({
      accept: ITEM_TYPES.PALETTE,
      canDrop: () => {
        // Horizontal layout: max 2 children
        if (layout === "horizontal" && children.length >= 2) return false;
        return true;
      },
      drop: (item) => onDropIntoSection(field.uid, item.field, item.overrideLabel, item.overrideRequired),
      collect: (m) => ({ isOverSection: m.isOver(), canDropSection: m.canDrop() }),
    }),
    [onDropIntoSection, field.uid, layout, children.length]
  );

  drag(gripRef);
  drop(dragPreview(cardRef));

  const handleSave = () => {
    onSaveToLibrary(field.uid);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  const toggleCollapse = () => {
    onUpdateField(field.uid, { isCollapsed: !field.isCollapsed });
  };

  // ── Layout switching ──────────────────────────────────────────────
  const switchToHorizontal = () => {
    if (children.length > 2) {
      setLayoutWarning(true);
      return;
    }
    onUpdateField(field.uid, { layout: "horizontal" });
  };

  const switchToVertical = () => {
    onUpdateField(field.uid, { layout: "vertical" });
  };

  const forceHorizontal = () => {
    // Trim to first 2 children, then switch
    const trimmed = children.slice(0, 2);
    onUpdateField(field.uid, { layout: "horizontal", children: trimmed });
    setLayoutWarning(false);
  };

  const activeSection = isOverSection && canDropSection;
  const isHorizontalFull = layout === "horizontal" && children.length >= 2;

  return (
    <div
      ref={cardRef}
      onClick={() => onSelect(field.uid)}
      className={`group rounded-xl border-2 transition-all duration-150 cursor-pointer overflow-hidden ${
        isDragging
          ? "opacity-30 border-dashed border-gray-200 shadow-none"
          : isOver
          ? "border-[#2abaad] shadow-lg shadow-teal-50"
          : isSelected
          ? "border-[#2abaad] shadow-md shadow-teal-50"
          : "border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md hover:shadow-amber-50"
      } bg-amber-50/30`}
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-amber-100/50 to-transparent">
        {/* Index badge */}
        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-[10px] shrink-0 select-none">
          {index + 1}
        </span>

        {/* Drag grip */}
        <span ref={gripRef} className="cursor-grab active:cursor-grabbing text-amber-300 hover:text-amber-500 transition-colors shrink-0 touch-none">
          <GripVertical className="w-4 h-4" />
        </span>

        {/* Icon */}
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
          <Heading1 className="w-4 h-4" />
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
          className="flex-1 min-w-0 text-sm text-gray-700 bg-transparent border-b border-transparent focus:border-amber-300 outline-none py-0.5 transition-all placeholder:text-gray-300"
          placeholder="Section title…"
        />

        {/* Layout toggle pills */}
        <div
          className="shrink-0 flex items-center rounded-lg border border-amber-200 bg-white overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Vertical layout – stack fields"
            onClick={switchToVertical}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] transition-all ${
              layout === "vertical"
                ? "bg-amber-500 text-white"
                : "text-amber-400 hover:bg-amber-50"
            }`}
          >
            <AlignLeft className="w-3 h-3" />
            <span className="hidden lg:inline">V</span>
          </button>
          <div className="w-px h-4 bg-amber-200" />
          <button
            type="button"
            title="Horizontal layout – two fields side by side (max 2)"
            onClick={switchToHorizontal}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] transition-all ${
              layout === "horizontal"
                ? "bg-amber-500 text-white"
                : "text-amber-400 hover:bg-amber-50"
            }`}
          >
            <Columns2 className="w-3 h-3" />
            <span className="hidden lg:inline">H</span>
          </button>
        </div>

        {/* Field count */}
        {children.length > 0 && (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] tracking-wide bg-amber-200 text-amber-700">
            {children.length}{layout === "horizontal" ? "/2" : ""} field{children.length > 1 ? "s" : ""}
          </span>
        )}

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapse();
          }}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-all"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

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
              : "text-amber-300 hover:text-indigo-400 hover:bg-indigo-50"
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
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-amber-300 hover:text-red-400 hover:bg-red-50 transition-all duration-150 opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Layout Warning Modal (inline) */}
      {layoutWarning && (
        <div
          className="px-4 py-3 bg-orange-50 border-t border-orange-200 flex items-start gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-orange-800">Too many fields for horizontal layout</p>
            <p className="text-[11px] text-orange-600 mt-0.5">
              Horizontal layout supports a maximum of <strong>2 fields</strong> side by side. You currently have <strong>{children.length} fields</strong>. Only the first 2 will be kept.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLayoutWarning(false)}
              className="px-2.5 py-1 rounded-lg text-[10px] text-orange-600 border border-orange-300 hover:bg-orange-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={forceHorizontal}
              className="px-2.5 py-1 rounded-lg text-[10px] text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              Keep first 2
            </button>
          </div>
        </div>
      )}

      {/* Section Body - Collapsible */}
      {isOpen && (
        <div
          ref={dropSection as unknown as React.RefObject<HTMLDivElement>}
          className={`px-4 py-3 bg-white/50 border-t border-amber-200 transition-all ${
            activeSection ? "ring-2 ring-[#2abaad] ring-inset" : ""
          }`}
        >
          {children.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed transition-all ${
              activeSection ? "border-[#2abaad] bg-teal-50/50" : "border-amber-200 bg-amber-50/20"
            }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-all ${
                activeSection ? "bg-[#2abaad] scale-110" : "bg-amber-100"
              }`}>
                <Plus className={`w-5 h-5 ${activeSection ? "text-white" : "text-amber-400"}`} />
              </div>
              <p className={`text-xs transition-colors ${activeSection ? "text-[#2abaad]" : "text-amber-500"}`}>
                {activeSection ? "Release to add field" : "Drag fields here"}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {layout === "horizontal"
                  ? "Drop up to 2 fields — they'll appear side by side"
                  : "Fields dropped here will be grouped in this section"}
              </p>
            </div>
          ) : layout === "horizontal" ? (
            /* ── Horizontal layout ─────────────────────────────── */
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                {children.slice(0, 2).map((child, childIndex) => (
                  <NestedFieldCard
                    key={child.uid}
                    child={child}
                    childIndex={childIndex}
                    sectionUid={field.uid}
                    isSelected={selectedChildUid === child.uid}
                    onSelect={onSelectChild}
                    onUpdateLabel={onUpdateLabel}
                    onToggleRequired={onToggleRequired}
                    onUpdateField={onUpdateField}
                    onRemoveFromSection={onRemoveFromSection}
                    compact
                  />
                ))}
                {/* Empty slot if only 1 child */}
                {children.length === 1 && (
                  <div className={`flex items-center justify-center rounded-lg border-2 border-dashed min-h-[52px] transition-all ${
                    activeSection ? "border-[#2abaad] bg-teal-50/40 text-[#2abaad]" : "border-amber-200 text-amber-300"
                  }`}>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Plus className="w-3 h-3" />
                      {activeSection ? "Release here" : "Drop 2nd field"}
                    </div>
                  </div>
                )}
              </div>
              {/* Horizontal full indicator */}
              {isHorizontalFull ? (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <Columns2 className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="text-[10px] text-amber-600">Horizontal section is full (max 2 fields). Switch to Vertical to add more.</span>
                </div>
              ) : (
                <div className={`py-2 rounded-lg border border-dashed flex items-center justify-center gap-1.5 text-[10px] transition-all ${
                  activeSection ? "border-[#2abaad] bg-teal-50/40 text-[#2abaad]" : "border-amber-200 text-amber-400"
                }`}>
                  <Plus className="w-3 h-3" />
                  {activeSection ? "Release to add here" : "Drop 2nd field"}
                </div>
              )}
            </div>
          ) : (
            /* ── Vertical layout ───────────────────────────────── */
            <div className="flex flex-col gap-2">
              {children.map((child, childIndex) => (
                <NestedFieldCard
                  key={child.uid}
                  child={child}
                  childIndex={childIndex}
                  sectionUid={field.uid}
                  isSelected={selectedChildUid === child.uid}
                  onSelect={onSelectChild}
                  onUpdateLabel={onUpdateLabel}
                  onToggleRequired={onToggleRequired}
                  onUpdateField={onUpdateField}
                  onRemoveFromSection={onRemoveFromSection}
                />
              ))}
              <div className={`mt-1 py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-all ${
                activeSection ? "border-[#2abaad] bg-teal-50/40 text-[#2abaad]" : "border-amber-200 text-amber-400 hover:border-amber-300"
              }`}>
                <Plus className="w-3 h-3" />
                <span className="text-[10px]">{activeSection ? "Release to add here" : "Drop more fields"}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}