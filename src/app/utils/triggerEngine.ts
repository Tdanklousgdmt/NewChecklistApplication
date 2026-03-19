import { Trigger, TriggerEvent, TriggerConditionType } from "../types/triggers";

// ── Helper: get numeric value from an answer ───────────────────────────────────
function numVal(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

// ── Helper: check if value is "empty" per field type ──────────────────────────
function isEmpty(value: any, typeId: string): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (typeId === "checkbox" && value === false) return true;
  if (typeId === "yes_no" && value === null) return true;
  if ((typeId === "photo" || typeId === "video" || typeId === "file" || typeId === "media_embed") && !value) return true;
  if (typeId === "signature" && !value) return true;
  if (typeId === "location" && (!value || value.lat === undefined)) return true;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return true;
  return false;
}

// ── Helper: evaluate a date string vs "today" etc. ────────────────────────────
function parseDateStr(s: string): Date {
  return new Date(s);
}

// ── Core condition evaluator ──────────────────────────────────────────────────
export function evaluateCondition(
  condition: TriggerConditionType,
  event: TriggerEvent,
  value: any,
  field: any,
  allAnswers: Record<string, any>
): boolean {
  const typeId: string = field.typeId;

  switch (condition) {
    // ── Generic ────────────────────────────────────────────────────────────────
    case "is_empty":  return isEmpty(value, typeId);
    case "is_filled": return !isEmpty(value, typeId);

    // ── Text ───────────────────────────────────────────────────────────────────
    case "contains": {
      const str = String(value ?? "").toLowerCase();
      const target = String(event.value ?? "").toLowerCase();
      return str.includes(target);
    }
    case "not_contains": {
      const str = String(value ?? "").toLowerCase();
      const target = String(event.value ?? "").toLowerCase();
      return !str.includes(target);
    }
    case "equals":     return String(value ?? "") === String(event.value ?? "");
    case "not_equals": return String(value ?? "") !== String(event.value ?? "");
    case "starts_with": return String(value ?? "").startsWith(String(event.value ?? ""));
    case "length_gt": {
      const len = String(value ?? "").length;
      return len > Number(event.value ?? 0);
    }
    case "length_lt": {
      const len = String(value ?? "").length;
      return len < Number(event.value ?? 0);
    }

    // ── Numeric ────────────────────────────────────────────────────────────────
    case "gt": {
      const n = numVal(typeId === "number_unit" ? value?.primary : value);
      return n !== undefined && n > Number(event.value ?? 0);
    }
    case "gte": {
      const n = numVal(typeId === "number_unit" ? value?.primary : value);
      return n !== undefined && n >= Number(event.value ?? 0);
    }
    case "lt": {
      const n = numVal(typeId === "number_unit" ? value?.primary : value);
      return n !== undefined && n < Number(event.value ?? 0);
    }
    case "lte": {
      const n = numVal(typeId === "number_unit" ? value?.primary : value);
      return n !== undefined && n <= Number(event.value ?? 0);
    }
    case "eq": {
      const n = numVal(typeId === "number_unit" ? value?.primary : value);
      return n !== undefined && n === Number(event.value ?? 0);
    }
    case "between": {
      const n = numVal(typeId === "number_unit" ? value?.primary : value);
      if (n === undefined) return false;
      return n >= Number(event.value ?? 0) && n <= Number(event.value2 ?? 0);
    }
    case "outside_range": {
      const n = numVal(typeId === "number_unit" ? value?.primary : value);
      if (n === undefined) return false;
      return n < Number(event.value ?? 0) || n > Number(event.value2 ?? 0);
    }

    // ── Number threshold ────────────────────────────────────────────────────────
    case "threshold_red":
    case "threshold_yellow":
    case "threshold_green": {
      const n = numVal(value);
      if (n === undefined || !field.thresholds?.length) return false;
      const targetColor = condition.replace("threshold_", "") as "red" | "yellow" | "green";
      const matched = field.thresholds.find((t: any) => {
        let hit = false;
        switch (t.operator) {
          case "<":  hit = n < t.value;  break;
          case "<=": hit = n <= t.value; break;
          case "=":  hit = n === t.value; break;
          case ">=": hit = n >= t.value; break;
          case ">":  hit = n > t.value;  break;
        }
        return hit && t.color === targetColor;
      });
      return !!matched;
    }

    // ── Boolean ────────────────────────────────────────────────────────────────
    case "is_checked":   return value === true;
    case "is_unchecked": return value === false || value === null || value === undefined;
    case "is_yes":       return value === "yes";
    case "is_no":        return value === "no";
    case "is_unanswered": return value === null || value === undefined;

    // ── Custom Buttons ──────────────────────────────────────────────────────────
    case "button_clicked": return value === event.buttonId;
    case "score_lt": {
      const score = allAnswers[field.uid]?.score;
      return score !== undefined && score < Number(event.value ?? 0);
    }
    case "score_eq": {
      const score = allAnswers[field.uid]?.score;
      return score !== undefined && score === Number(event.value ?? 0);
    }

    // ── Dropdown ────────────────────────────────────────────────────────────────
    case "is_one_of": {
      const opts = String(event.value ?? "").split(",").map((s) => s.trim());
      return opts.includes(String(value ?? ""));
    }

    // ── Date ────────────────────────────────────────────────────────────────────
    case "is_past": {
      if (!value) return false;
      return new Date(value) < new Date();
    }
    case "is_future": {
      if (!value) return false;
      return new Date(value) > new Date();
    }
    case "is_today": {
      if (!value) return false;
      const d = new Date(value);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    case "days_from_today_gt": {
      if (!value) return false;
      const diff = (new Date(value).getTime() - Date.now()) / 86400000;
      return Math.abs(diff) > Number(event.value ?? 0);
    }
    case "days_from_today_lt": {
      if (!value) return false;
      const diff = (new Date(value).getTime() - Date.now()) / 86400000;
      return Math.abs(diff) < Number(event.value ?? 0);
    }

    // ── Time ────────────────────────────────────────────────────────────────────
    case "before": {
      if (!value || !event.value) return false;
      return value < String(event.value);
    }
    case "after": {
      if (!value || !event.value) return false;
      return value > String(event.value);
    }
    case "outside_window": {
      if (!value || !event.windowStart || !event.windowEnd) return false;
      return value < event.windowStart || value > event.windowEnd;
    }

    // ── DateTime ────────────────────────────────────────────────────────────────
    case "more_than_hours_ago": {
      if (!value) return false;
      const hoursAgo = (Date.now() - new Date(value).getTime()) / 3600000;
      return hoursAgo > Number(event.value ?? 0);
    }
    case "within_next_hours": {
      if (!value) return false;
      const hoursUntil = (new Date(value).getTime() - Date.now()) / 3600000;
      return hoursUntil >= 0 && hoursUntil <= Number(event.value ?? 0);
    }

    // ── Media / Files ────────────────────────────────────────────────────────────
    case "has_photo":  return !!value && !!value.dataUrl;
    case "has_video":  return !!value && !!value.dataUrl;
    case "has_file":   return !!value && !!value.dataUrl;
    case "has_media":  return !!value;
    case "is_signed":  return !!value && value !== "";
    case "is_unsigned": return !value || value === "";
    case "photo_count_lt": return !value; // simplified

    // ── Location ─────────────────────────────────────────────────────────────────
    case "outside_geofence": {
      // Simplified: always false unless no location (for demo purposes)
      return !value || value.lat === undefined;
    }

    // ── Section ──────────────────────────────────────────────────────────────────
    case "all_children_completed": {
      const children: any[] = field.children || [];
      if (children.length === 0) return false;
      return children.every((c: any) => {
        const a = allAnswers[c.uid];
        return a && a.value !== null && a.value !== undefined && a.value !== "";
      });
    }
    case "any_child_not_ok": {
      // Check if any child uid is in notOkFields — pass via allAnswers meta key
      const notOkSet: Set<string> = allAnswers["__notOkFields__"] || new Set();
      const children: any[] = field.children || [];
      return children.some((c: any) => notOkSet.has(c.uid));
    }

    default:
      return false;
  }
}

// ── Public: evaluate all triggers for a field ─────────────────────────────────
export function evaluateTriggers(
  field: any,
  value: any,
  allAnswers: Record<string, any>
): Trigger[] {
  if (!field?.triggers?.length) return [];
  return field.triggers.filter((t: Trigger) =>
    evaluateCondition(t.event.condition, t.event, value, field, allAnswers)
  );
}
