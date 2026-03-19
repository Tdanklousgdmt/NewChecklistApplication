# Trigger System — Full Specification

## Architecture

Each trigger is a JSON object stored on the `CanvasField`:

```json
{
  "id": "string",
  "event": {
    "condition": "string",
    "value": "any (optional)",
    "operator": "string (optional)"
  },
  "impact": {
    "type": "string",
    "payload": "any"
  }
}
```

Stored as `triggers: Trigger[]` on each `CanvasField`.

---

## Available IMPACT Types (shared across all fields)

| Code | Label | What it does |
|---|---|---|
| `mark_not_ok` | Mark NOT OK | Flags the submission with a "NOT OK" badge |
| `open_risk` | Open Risk Pop-up | Fires the Risk Assessment modal |
| `open_tag` | Declare Tag | Opens the Tag Declaration modal |
| `open_action` | Create Action | Opens Immediate Action modal |
| `notify_inapp` | In-App Notification | Sends notification to a named user |
| `notify_email` | Send Email | Sends email to a defined address |
| `block_submit` | Block Submission | Prevents submit until condition is resolved |
| `require_photo` | Require Photo | Makes a photo field mandatory |
| `autofill_field` | Auto-fill Field | Sets another field's value automatically |
| `show_field` | Show Field | Makes a hidden field visible |
| `hide_field` | Hide Field | Hides a field |
| `escalate` | Escalate to Manager | Flags for manager review |
| `add_note` | Add Mandatory Note | Forces a text note before continuing |

---

## Per-Component Trigger Specification

---

### 1. `short_text` — Short Text

| Part | Value |
|---|---|
| **EVENT conditions** | `is_empty`, `contains`, `not_contains`, `equals`, `length_gt` |
| **Example EVENT** | `contains` → `"defect"` |
| **Example IMPACT** | `open_action` — auto-open Immediate Action modal |
| **Real example** | *"If the technician types the word 'crack' or 'broken', immediately open a corrective action"* |

---

### 2. `long_text` — Long Text

| Part | Value |
|---|---|
| **EVENT conditions** | `is_empty`, `contains`, `length_gt`, `length_lt` |
| **Example EVENT** | `is_empty` at submit time |
| **Example IMPACT** | `block_submit` — block submission until the field is filled |
| **Real example** | *"Observation notes must be filled before the checklist can be submitted"* |

---

### 3. `number` — Number

| Part | Value |
|---|---|
| **EVENT conditions** | `gt`, `gte`, `lt`, `lte`, `eq`, `between`, `outside_range` |
| **Example EVENT** | `gt` → `50` |
| **Example IMPACT** | `mark_not_ok` + `open_risk` |
| **Real example** | *"If pressure reading > 50 bar, flag checklist NOT OK and open Risk Assessment"* |

---

### 4. `number_unit` — Number + Unit

| Part | Value |
|---|---|
| **EVENT conditions** | `gt`, `lt`, `eq`, `between` (evaluated after unit conversion) |
| **Example EVENT** | `lt` → `0` (any unit) |
| **Example IMPACT** | `notify_inapp` to supervisor |
| **Real example** | *"If voltage reading drops below 0 V, notify supervisor immediately"* |

---

### 5. `number_threshold` — Number (Thresholds)

| Part | Value |
|---|---|
| **EVENT conditions** | `threshold_red`, `threshold_yellow`, `threshold_green` (built into the field's own threshold config) |
| **Example EVENT** | `threshold_red` fires |
| **Example IMPACT** | `block_submit` + `escalate` |
| **Real example** | *"When temperature hits the RED zone, block submission and escalate to the safety manager"* |

---

### 6. `checkbox` — Checkbox

| Part | Value |
|---|---|
| **EVENT conditions** | `is_checked`, `is_unchecked` |
| **Example EVENT** | `is_unchecked` |
| **Example IMPACT** | `require_photo` — make a photo field mandatory |
| **Real example** | *"If 'Equipment inspected' is NOT ticked, require a photo of the equipment before proceeding"* |

---

### 7. `yes_no` — Yes / No

| Part | Value |
|---|---|
| **EVENT conditions** | `is_yes`, `is_no`, `is_unanswered` |
| **Example EVENT** | `is_no` |
| **Example IMPACT** | `open_tag` — open Tag Declaration modal |
| **Real example** | *"If 'Is the area safe?' = No, immediately trigger a Tag / Anomaly declaration"* |

---

### 8. `custom_buttons` — Custom Buttons

| Part | Value |
|---|---|
| **EVENT conditions** | `button_clicked` (specific button by ID), `score_lt`, `score_eq` |
| **Example EVENT** | `button_clicked` → "Poor" button |
| **Example IMPACT** | `mark_not_ok` + `open_action` |
| **Real example** | *"If inspector clicks 'Poor', mark the checklist NOT OK and open an Immediate Action"* |

---

### 9. `dropdown` — Dropdown

| Part | Value |
|---|---|
| **EVENT conditions** | `equals`, `not_equals`, `is_one_of`, `is_empty` |
| **Example EVENT** | `equals` → `"Not Applicable"` |
| **Example IMPACT** | `autofill_field` + `hide_field` |
| **Real example** | *"If category = 'Not Applicable', auto-fill the next field and hide the sub-question"* |

---

### 10. `date` — Date

| Part | Value |
|---|---|
| **EVENT conditions** | `is_past`, `is_future`, `is_today`, `days_from_today_lt`, `days_from_today_gt` |
| **Example EVENT** | `is_past` |
| **Example IMPACT** | `notify_inapp` + `add_note` |
| **Real example** | *"If selected date is in the past, warn the user and force them to add a justification note"* |

---

### 11. `time` — Time

| Part | Value |
|---|---|
| **EVENT conditions** | `before`, `after`, `outside_window` |
| **Example EVENT** | `outside_window` (before 06:00 or after 22:00) |
| **Example IMPACT** | `escalate` to night supervisor |
| **Real example** | *"If maintenance time is logged outside of working hours, escalate to the night supervisor"* |

---

### 12. `datetime` — Date & Time

| Part | Value |
|---|---|
| **EVENT conditions** | `is_past`, `more_than_hours_ago`, `within_next_hours` |
| **Example EVENT** | `more_than_hours_ago` → `24` |
| **Example IMPACT** | `block_submit` + `add_note` |
| **Real example** | *"If the recorded date/time is more than 24 hours ago, block submit and force a note explaining the delay"* |

---

### 13. `photo` — Photo

| Part | Value |
|---|---|
| **EVENT conditions** | `is_empty`, `has_photo`, `photo_count_lt` |
| **Example EVENT** | `is_empty` |
| **Example IMPACT** | `block_submit` |
| **Real example** | *"No photo attached → the checklist cannot be submitted"* |

---

### 14. `video` — Video

| Part | Value |
|---|---|
| **EVENT conditions** | `is_empty`, `has_video` |
| **Example EVENT** | `is_empty` (video field required for safety procedure) |
| **Example IMPACT** | `add_note` + `notify_inapp` to QA manager |
| **Real example** | *"If video evidence is missing, add a mandatory note and notify the QA manager"* |

---

### 15. `media_embed` — Media Embed

| Part | Value |
|---|---|
| **EVENT conditions** | `is_empty`, `has_media` |
| **Example EVENT** | `is_empty` on a critical safety section |
| **Example IMPACT** | `block_submit` |
| **Real example** | *"Media evidence is mandatory for confined space entry — block submit if not provided"* |

---

### 16. `signature` — Signature

| Part | Value |
|---|---|
| **EVENT conditions** | `is_signed`, `is_unsigned` |
| **Example EVENT** | `is_unsigned` at submission |
| **Example IMPACT** | `block_submit` |
| **Real example** | *"Operator signature is required before the permit-to-work checklist can be submitted"* |

---

### 17. `file` — File Upload

| Part | Value |
|---|---|
| **EVENT conditions** | `is_empty`, `has_file`, `file_type_is` |
| **Example EVENT** | `is_empty` |
| **Example IMPACT** | `add_note` as alternative evidence |
| **Real example** | *"If the calibration certificate is not uploaded, add a note explaining the absence"* |

---

### 18. `rating` — Rating

| Part | Value |
|---|---|
| **EVENT conditions** | `lt`, `lte`, `eq`, `gt` |
| **Example EVENT** | `lte` → `2` (out of 5) |
| **Example IMPACT** | `mark_not_ok` + `open_risk` |
| **Real example** | *"If cleanliness rated ≤ 2 stars, mark NOT OK and open a Risk Assessment"* |

---

### 19. `location` — Location

| Part | Value |
|---|---|
| **EVENT conditions** | `is_empty`, `outside_geofence`, `is_filled` |
| **Example EVENT** | `outside_geofence` (location recorded outside allowed zone) |
| **Example IMPACT** | `block_submit` + `notify_inapp` |
| **Real example** | *"If GPS location is outside the plant perimeter, block submit and notify security"* |

---

### 20. `temperature` — Temperature

| Part | Value |
|---|---|
| **EVENT conditions** | `gt`, `lt`, `between`, `outside_range` |
| **Example EVENT** | `gt` → `80` (°C) |
| **Example IMPACT** | `open_action` + `mark_not_ok` + `notify_email` to engineer |
| **Real example** | *"If temperature > 80°C, open corrective action, flag NOT OK, and email the site engineer"* |

---

### 21. `barcode` — Barcode / QR

| Part | Value |
|---|---|
| **EVENT conditions** | `is_empty`, `equals`, `not_equals`, `starts_with` |
| **Example EVENT** | `not_equals` → expected asset ID |
| **Example IMPACT** | `block_submit` + `add_note` |
| **Real example** | *"If scanned barcode doesn't match the expected equipment ID, block submit and force a note"* |

---

### 22. `formula` — Formula

| Part | Value |
|---|---|
| **EVENT conditions** | `gt`, `lt`, `eq`, `between`, `outside_range` (on the computed result) |
| **Example EVENT** | `gt` → `100` (computed score exceeds 100%) |
| **Example IMPACT** | `mark_not_ok` + `notify_inapp` |
| **Real example** | *"If the computed efficiency score exceeds 100%, flag as anomaly and notify the supervisor"* |

---

### 23. `section` — Section

| Part | Value |
|---|---|
| **EVENT conditions** | `all_children_completed`, `any_child_not_ok`, `child_count_lt` |
| **Example EVENT** | `any_child_not_ok` |
| **Example IMPACT** | `escalate` + `add_note` |
| **Real example** | *"If any field inside the 'Safety Checks' section is NOT OK, escalate the entire section to the manager"* |

---

### 24. `instruction` — Instruction

| Part | Value |
|---|---|
| **EVENT conditions** | `is_read` (user scrolled past / acknowledged) |
| **Example EVENT** | `is_read` = false at submit |
| **Example IMPACT** | `block_submit` |
| **Real example** | *"The safety briefing instruction must be acknowledged before the form can be submitted"* |

---

### 25. `separator` — Separator

> Structural element only — no trigger conditions applicable.

---

## Summary Table

| Field Type | Example Condition | Example Impact |
|---|---|---|
| Short Text | contains "defect" | Open Action |
| Long Text | is_empty | Block Submit |
| Number | > 50 | Mark NOT OK + Open Risk |
| Number + Unit | < 0 | Notify In-App |
| Number (Threshold) | threshold_red | Block Submit + Escalate |
| Checkbox | unchecked | Require Photo |
| Yes / No | = No | Open Tag |
| Custom Buttons | "Poor" clicked | Mark NOT OK + Open Action |
| Dropdown | = "Not Applicable" | Auto-fill + Hide Field |
| Date | is past | Notify + Add Note |
| Time | outside 06–22h | Escalate |
| Date & Time | > 24h ago | Block Submit + Add Note |
| Photo | is_empty | Block Submit |
| Video | is_empty | Add Note + Notify |
| Media Embed | is_empty | Block Submit |
| Signature | unsigned | Block Submit |
| File Upload | is_empty | Add Note |
| Rating | ≤ 2 stars | Mark NOT OK + Open Risk |
| Location | outside geofence | Block Submit + Notify |
| Temperature | > 80°C | Open Action + Email |
| Barcode | mismatch | Block Submit + Add Note |
| Formula | computed > 100 | Mark NOT OK + Notify |
| Section | any child NOT OK | Escalate + Add Note |
| Instruction | unread | Block Submit |
| Separator | — | — |

---

## Proposed UI Implementation

- A **Triggers tab** inside the existing field config panel (visible when a field is selected in Step 2)
- A **compact trigger builder row** using the pattern: `WHEN [condition] → DO [impact]` with a `+ Add Trigger` button
- A small **orange lightning bolt badge** on canvas cards that have at least one active trigger
- Triggers stored as `field.triggers[]` array on `CanvasField`
- Triggers evaluated at runtime inside `ChecklistExecution.tsx` as each field value changes
