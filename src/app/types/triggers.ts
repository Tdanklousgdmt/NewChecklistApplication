// ── Trigger condition types ────────────────────────────────────────────────────
export type TriggerConditionType =
  // Text
  | "is_empty" | "is_filled" | "contains" | "not_contains" | "equals"
  | "not_equals" | "length_gt" | "length_lt" | "starts_with"
  // Numeric
  | "gt" | "gte" | "lt" | "lte" | "eq" | "between" | "outside_range"
  // Threshold
  | "threshold_red" | "threshold_yellow" | "threshold_green"
  // Boolean / enum
  | "is_checked" | "is_unchecked" | "is_yes" | "is_no" | "is_unanswered"
  | "is_one_of" | "button_clicked" | "score_lt" | "score_eq"
  // Date / Time
  | "is_past" | "is_future" | "is_today"
  | "days_from_today_gt" | "days_from_today_lt"
  | "before" | "after" | "outside_window"
  | "more_than_hours_ago" | "within_next_hours"
  // Media / Files
  | "has_photo" | "has_video" | "has_file" | "has_media"
  | "is_signed" | "is_unsigned" | "photo_count_lt"
  // Location
  | "outside_geofence"
  // Section
  | "all_children_completed" | "any_child_not_ok";

// ── Impact types ───────────────────────────────────────────────────────────────
export type TriggerImpactType =
  | "mark_not_ok"
  | "open_risk"
  | "open_tag"
  | "open_action"
  | "notify_inapp"
  | "notify_email"
  | "block_submit"
  | "require_photo"
  | "autofill_field"
  | "show_field"
  | "hide_field"
  | "escalate"
  | "add_note";

// ── Trigger event ─────────────────────────────────────────────────────────────
export interface TriggerEvent {
  condition: TriggerConditionType;
  value?: string | number;    // single comparison value
  value2?: number;             // second bound for 'between' / 'outside_range'
  buttonId?: string;           // for 'button_clicked'
  windowStart?: string;        // HH:mm for 'outside_window'
  windowEnd?: string;
}

// ── Impact payload ────────────────────────────────────────────────────────────
export interface TriggerImpactPayload {
  message?: string;
  targetFieldUid?: string;   // for autofill / show / hide
  targetValue?: string;       // for autofill
  emailAddress?: string;      // for notify_email
  userName?: string;          // for notify_inapp
  notePrompt?: string;        // for add_note
}

// ── Impact ────────────────────────────────────────────────────────────────────
export interface TriggerImpact {
  type: TriggerImpactType;
  payload?: TriggerImpactPayload;
}

// ── Trigger ───────────────────────────────────────────────────────────────────
export interface Trigger {
  id: string;
  event: TriggerEvent;
  impacts: TriggerImpact[];
}

// ── Condition meta (drives the builder UI) ────────────────────────────────────
export type ValueType = "text" | "number" | "range" | "option" | "button" | "time" | "time_window";

export interface ConditionDef {
  condition: TriggerConditionType;
  label: string;
  hasValue: boolean;
  valueType?: ValueType;
}

// ── Per-field-type condition catalogue ────────────────────────────────────────
export const FIELD_CONDITIONS: Record<string, ConditionDef[]> = {
  short_text: [
    { condition: "is_empty",     label: "is empty",            hasValue: false },
    { condition: "is_filled",    label: "is filled",           hasValue: false },
    { condition: "contains",     label: "contains",            hasValue: true, valueType: "text" },
    { condition: "not_contains", label: "does not contain",    hasValue: true, valueType: "text" },
    { condition: "equals",       label: "equals exactly",      hasValue: true, valueType: "text" },
    { condition: "length_gt",    label: "character count >",   hasValue: true, valueType: "number" },
  ],
  long_text: [
    { condition: "is_empty",     label: "is empty",            hasValue: false },
    { condition: "contains",     label: "contains",            hasValue: true, valueType: "text" },
    { condition: "length_gt",    label: "character count >",   hasValue: true, valueType: "number" },
    { condition: "length_lt",    label: "character count <",   hasValue: true, valueType: "number" },
  ],
  number: [
    { condition: "gt",           label: "> (greater than)",    hasValue: true, valueType: "number" },
    { condition: "gte",          label: ">= (greater or equal)",hasValue: true, valueType: "number" },
    { condition: "lt",           label: "< (less than)",       hasValue: true, valueType: "number" },
    { condition: "lte",          label: "<= (less or equal)",  hasValue: true, valueType: "number" },
    { condition: "eq",           label: "= (equals)",          hasValue: true, valueType: "number" },
    { condition: "between",      label: "between (range)",     hasValue: true, valueType: "range" },
    { condition: "outside_range",label: "outside range",       hasValue: true, valueType: "range" },
    { condition: "is_empty",     label: "not filled",          hasValue: false },
  ],
  number_unit: [
    { condition: "gt",           label: "> (greater than)",    hasValue: true, valueType: "number" },
    { condition: "lt",           label: "< (less than)",       hasValue: true, valueType: "number" },
    { condition: "eq",           label: "= (equals)",          hasValue: true, valueType: "number" },
    { condition: "between",      label: "between",             hasValue: true, valueType: "range" },
    { condition: "is_empty",     label: "not filled",          hasValue: false },
  ],
  number_threshold: [
    { condition: "threshold_red",   label: "hits RED zone",    hasValue: false },
    { condition: "threshold_yellow",label: "hits YELLOW zone", hasValue: false },
    { condition: "threshold_green", label: "hits GREEN zone",  hasValue: false },
    { condition: "is_empty",        label: "not filled",       hasValue: false },
  ],
  checkbox: [
    { condition: "is_checked",   label: "is checked",          hasValue: false },
    { condition: "is_unchecked", label: "is unchecked",        hasValue: false },
  ],
  yes_no: [
    { condition: "is_yes",       label: "= Yes",               hasValue: false },
    { condition: "is_no",        label: "= No",                hasValue: false },
    { condition: "is_unanswered",label: "is unanswered",       hasValue: false },
  ],
  custom_buttons: [
    { condition: "button_clicked",label: "button clicked",     hasValue: true, valueType: "button" },
    { condition: "score_lt",      label: "score <",            hasValue: true, valueType: "number" },
    { condition: "score_eq",      label: "score =",            hasValue: true, valueType: "number" },
  ],
  dropdown: [
    { condition: "equals",       label: "= selected value",    hasValue: true, valueType: "option" },
    { condition: "not_equals",   label: "≠ selected value",    hasValue: true, valueType: "option" },
    { condition: "is_one_of",    label: "is one of",           hasValue: true, valueType: "option" },
    { condition: "is_empty",     label: "nothing selected",    hasValue: false },
  ],
  date: [
    { condition: "is_past",      label: "is in the past",      hasValue: false },
    { condition: "is_future",    label: "is in the future",    hasValue: false },
    { condition: "is_today",     label: "is today",            hasValue: false },
    { condition: "days_from_today_gt", label: "more than N days from today", hasValue: true, valueType: "number" },
    { condition: "days_from_today_lt", label: "less than N days from today", hasValue: true, valueType: "number" },
    { condition: "is_empty",     label: "not filled",          hasValue: false },
  ],
  time: [
    { condition: "before",       label: "before",              hasValue: true, valueType: "time" },
    { condition: "after",        label: "after",               hasValue: true, valueType: "time" },
    { condition: "outside_window",label: "outside time window",hasValue: true, valueType: "time_window" },
    { condition: "is_empty",     label: "not filled",          hasValue: false },
  ],
  datetime: [
    { condition: "is_past",      label: "is in the past",      hasValue: false },
    { condition: "more_than_hours_ago", label: "more than N hours ago", hasValue: true, valueType: "number" },
    { condition: "within_next_hours",   label: "within next N hours",   hasValue: true, valueType: "number" },
    { condition: "is_empty",     label: "not filled",          hasValue: false },
  ],
  photo: [
    { condition: "is_empty",     label: "no photo attached",   hasValue: false },
    { condition: "has_photo",    label: "photo is attached",   hasValue: false },
  ],
  video: [
    { condition: "is_empty",     label: "no video attached",   hasValue: false },
    { condition: "has_video",    label: "video is attached",   hasValue: false },
  ],
  media_embed: [
    { condition: "is_empty",     label: "no media provided",   hasValue: false },
    { condition: "has_media",    label: "media is present",    hasValue: false },
  ],
  signature: [
    { condition: "is_signed",    label: "is signed",           hasValue: false },
    { condition: "is_unsigned",  label: "not signed",          hasValue: false },
  ],
  file: [
    { condition: "is_empty",     label: "no file uploaded",    hasValue: false },
    { condition: "has_file",     label: "file is uploaded",    hasValue: false },
  ],
  rating: [
    { condition: "lt",           label: "< (less than)",       hasValue: true, valueType: "number" },
    { condition: "lte",          label: "<= (less or equal)",  hasValue: true, valueType: "number" },
    { condition: "gt",           label: "> (greater than)",    hasValue: true, valueType: "number" },
    { condition: "eq",           label: "= (equals)",          hasValue: true, valueType: "number" },
  ],
  location: [
    { condition: "is_empty",      label: "no location captured", hasValue: false },
    { condition: "is_filled",     label: "location captured",    hasValue: false },
    { condition: "outside_geofence", label: "outside geofence (placeholder)", hasValue: false },
  ],
  temperature: [
    { condition: "gt",           label: "> (greater than)",    hasValue: true, valueType: "number" },
    { condition: "lt",           label: "< (less than)",       hasValue: true, valueType: "number" },
    { condition: "between",      label: "between",             hasValue: true, valueType: "range" },
    { condition: "outside_range",label: "outside range",       hasValue: true, valueType: "range" },
    { condition: "is_empty",     label: "not filled",          hasValue: false },
  ],
  barcode: [
    { condition: "is_empty",     label: "not scanned",         hasValue: false },
    { condition: "equals",       label: "equals",              hasValue: true, valueType: "text" },
    { condition: "not_equals",   label: "does not equal",      hasValue: true, valueType: "text" },
    { condition: "starts_with",  label: "starts with",         hasValue: true, valueType: "text" },
  ],
  formula: [
    { condition: "gt",           label: "computed value >",    hasValue: true, valueType: "number" },
    { condition: "lt",           label: "computed value <",    hasValue: true, valueType: "number" },
    { condition: "between",      label: "computed between",    hasValue: true, valueType: "range" },
    { condition: "outside_range",label: "computed outside range",hasValue: true, valueType: "range" },
  ],
  section: [
    { condition: "all_children_completed", label: "all fields completed", hasValue: false },
    { condition: "any_child_not_ok",       label: "any field is NOT OK",  hasValue: false },
  ],
  instruction: [
    { condition: "is_empty",     label: "not acknowledged",    hasValue: false },
    { condition: "is_filled",    label: "acknowledged",        hasValue: false },
  ],
};

// ── Impact catalogue ──────────────────────────────────────────────────────────
export interface ImpactDef {
  type: TriggerImpactType;
  label: string;
  emoji: string;
  color: string;          // Tailwind bg class
  textColor: string;      // Tailwind text class
  borderColor: string;
  needs: Array<"message" | "targetFieldUid" | "targetValue" | "emailAddress" | "userName" | "notePrompt">;
}

export const IMPACT_DEFS: ImpactDef[] = [
  { type: "mark_not_ok",    label: "Mark NOT OK",          emoji: "🔴", color: "bg-red-50",    textColor: "text-red-700",    borderColor: "border-red-200",    needs: ["message"] },
  { type: "block_submit",   label: "Block Submission",     emoji: "🚫", color: "bg-red-50",    textColor: "text-red-700",    borderColor: "border-red-200",    needs: ["message"] },
  { type: "open_risk",      label: "Open Risk Pop-up",     emoji: "⚠️", color: "bg-orange-50", textColor: "text-orange-700", borderColor: "border-orange-200", needs: ["message"] },
  { type: "open_tag",       label: "Declare Tag/Anomaly",  emoji: "🏷️", color: "bg-yellow-50", textColor: "text-yellow-700", borderColor: "border-yellow-200", needs: ["message"] },
  { type: "open_action",    label: "Create Action Item",   emoji: "⚡", color: "bg-amber-50",  textColor: "text-amber-700",  borderColor: "border-amber-200",  needs: ["message"] },
  { type: "escalate",       label: "Escalate to Manager",  emoji: "🚨", color: "bg-rose-50",   textColor: "text-rose-700",   borderColor: "border-rose-200",   needs: ["message"] },
  { type: "notify_inapp",   label: "In-App Notification",  emoji: "📢", color: "bg-blue-50",   textColor: "text-blue-700",   borderColor: "border-blue-200",   needs: ["userName", "message"] },
  { type: "notify_email",   label: "Send Email",           emoji: "📧", color: "bg-sky-50",    textColor: "text-sky-700",    borderColor: "border-sky-200",    needs: ["emailAddress", "message"] },
  { type: "add_note",       label: "Require Note",         emoji: "📝", color: "bg-indigo-50", textColor: "text-indigo-700", borderColor: "border-indigo-200", needs: ["notePrompt"] },
  { type: "require_photo",  label: "Require Photo",        emoji: "📷", color: "bg-violet-50", textColor: "text-violet-700", borderColor: "border-violet-200", needs: ["message"] },
  { type: "hide_field",     label: "Hide Field",           emoji: "👁️", color: "bg-slate-50",  textColor: "text-slate-700",  borderColor: "border-slate-200",  needs: ["targetFieldUid"] },
  { type: "show_field",     label: "Show Field",           emoji: "👁", color: "bg-teal-50",   textColor: "text-teal-700",   borderColor: "border-teal-200",   needs: ["targetFieldUid"] },
  { type: "autofill_field", label: "Auto-fill Field",      emoji: "✍️", color: "bg-green-50",  textColor: "text-green-700",  borderColor: "border-green-200",  needs: ["targetFieldUid", "targetValue"] },
];

export function getImpactDef(type: TriggerImpactType): ImpactDef {
  return IMPACT_DEFS.find((d) => d.type === type) ?? IMPACT_DEFS[0];
}

// Helper — human-readable summary of a trigger event
export function summariseEvent(event: TriggerEvent, fieldTypeId: string): string {
  const cond = FIELD_CONDITIONS[fieldTypeId]?.find((c) => c.condition === event.condition);
  const label = cond?.label ?? event.condition;
  if (event.condition === "between" || event.condition === "outside_range") {
    return `${label} ${event.value} – ${event.value2}`;
  }
  if (event.value !== undefined && event.value !== "") {
    return `${label} "${event.value}"`;
  }
  return label;
}
