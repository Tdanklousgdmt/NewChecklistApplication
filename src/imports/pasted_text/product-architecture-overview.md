Objectives
•	Reduce data loss (robust autosave, crash recovery).
•	Speed up checklist completion (clear UI, adapted components, QR scan, Calendar).
•	Improve governance (reports, history, PDF, audit).
•	Increase user confidence (preview, validations, clear status).
•	Offline Mode 
•	MES connection (read/write states & process triggers).
•	Gamification (motivation & adoption).

1) Product Architecture (IA & Navigation)
1.1 IA (Information Architecture)
Dashboard
•	Filters: Status (Draft, Assigned, In Progress, Overdue/Expired, Completed), Permanent, Team, Category, Location, Date range.
•	Calendar view (month/week/day) — all checklists.
•	Quick actions: Create checklist, Scan QR, Reports.
•	Checklist tiles (expand/collapse) with metadata:
o	Expired: 4 Hrs 14 Min | Due: 14-01-2026
o	Assigned to: K7628360 – Kathavarayan, K | testteam
o	Frequency: Permanent / Recurring / One-off
•	Quick actions: Share, Report, Open.
Other sections
•	Checklist Master (list / search / category management)
•	Create / Edit (3-step wizard + Question Master)
•	Reports (global and per checklist, CSV/PDF export)
•	To-Do (assigned actions, views by user/team)
•	Settings (component library, Conditional checklist triggers , gamification, notification)

1.2 Routing Model (fix random “Back” behavior)
Route pattern (example):
/dashboard
/checklists
/checklists/:id           (view)
/checklists/:id/edit      (edit)
/checklists/new           (create)
/reports
/settings
•	Preserve real browser history (non-programmatic navigation for correct back behavior).
•	canDeactivate guard to protect against unsaved changes.
•	RouteReuseStrategy to preserve builder state.
•	Stable query params for filters (shareable permalinks).

2) UX / UI Design System
2.1 Dashboard
•	Sticky filter bar + Reset / Save filter sets.
•	Mixed view: List (tiles) / Calendar (FullCalendar).
•	Creation page
•	Configuration page
•	Notification 
•	Expandable tiles: metadata + status + Category badges + team avatar.
•	Accessibility: Desktop design and Mobile design ( easy completion and submission)

2.2 Creation (3-step Wizard)
Configuration
•	Title (auto-filled with a random name if empty, e.g. CHK-20260116-13h57-84A).
•	Priority : this features allow the user to assign a priority to the checklist 
o	A flag can be selected :  urgente / high / normal / low
o	Each flag have a number of reminder to the user assign to the checklist 
o	 
•	Category (mandatory).
•	Validity (due date / range / no deadline if “permanent”).
•	Frequency: Permanent / One-off / Recurring (cron-like or presets).
•	Assignment (user / role / team).
•	Location (site / zone / line).
Question Master (Drag & Drop Builder)
•	Left palette (all fields).
•	Right editor (sections, order, properties).
•	Preview (live preview).
•	Library: save a configured component (reusable).
•	Per-component actions:
o	Expand/edit (label, help, required, rules, thresholds, conditional logic…)
o	3-dot menu: Delete / Duplicate / Add to library
Summary & Validation
•	Final preview.
•	Checks (conflicts, required fields).
•	Buttons: Save draft, Publish, Share.

2.3 Builder Components (key properties)
INPUT TEXT / LONG TEXT
•	Label, Placeholder, Help, Required, Max length.
DATETIME PICKER
•	Date, time, constraints (min/max), time zones.
UNIT
•	Unit + sub-unit, precision (decimals), optional conversion.
NUMERIC TEXT
•	Strict numeric, no “e/E”, FR locale (comma), min/max.
NUMERIC WITH THRESHOLD
•	Thresholds: <, ≤, =, ≥, >; multi-thresholds with colors (green/yellow/red), actions (see Triggers).
DESCRIPTION
•	Text/markdown block, optional embedded image (info-only).
DROPDOWN (single/multi)
•	List, search, “other + text”, dependencies (cascading).
EMBEDDED IMAGE
•	Small inline media (displayed to executor).
INPUT ATTACHMENT (photo/doc)
•	Camera capture, compression, max size, allowed formats.
SIGNATURE
•	“Sign before submit” checkbox, typically enforced via canDeactivate.
CUSTOMIZED BUTTONS
•	I can creates the buttons the way I want them 
•	Name, background color, font color 
•	Score associated to the buttons : point score or Revealand Not Applicable 
•	Default answer option : that preselect a button 
•	Notify user option : if the user click on this button the user selected should receive a notification related to the button 
•	Reveal : make appear other section from the checklist one I click on the button that had this feature
3) End-to-End Autosave
3.1 Behavior
•	Auto-naming on creation (draft).
•	Autosave after critical events (blur, navigation).
•	Optimistic UI + subtle spinner + “Everything is saved ✓”.
•	Conflicts: versioning (updatedAt + version) → merge or “pick server/local”.
•	If the user click on cancel if will not overlap the saved version existing before edition.
•	Offline-first (optional): local cache (IndexedDB), resync. Point where the offline mode will be needed
4) Trigger Engine & MES Connection
Events: on open, on answer to field X, on threshold breach, on completion.
Actions:
•	Open another checklist or give access to  checklist (linked or remediation).
•	Notify (To-Do, email/Teams, banner).
•	Call MES (webhook/REST) – write a measurement, change order status.
•	Block submission until conditions are met. (to define)
Security: signatures, retries, idempotency.



5) Reports, PDF & Audit
•	Dashboard reports: statuses, delays, completions, non-conformities. :What’s data comes out the checklist : evolution / 
•	PDF summary: logo, headers, metadata, values, attachments, signature(s), authenticity QR code.
•	Traceability: audit trail (who, when, what changed), timestamp seal.
•	Exports: CSV/XLSX/JSON.




6) Gamification & To-Do
Gamification
•	Points per completed checklist, bonuses for “error-free”, “on time”.
•	Badges (“Hero of the Week”, “Zero rework 7d”).
•	Team leaderboards (opt-in, GDPR-compliant).
To-Do
•	Personal and team lists, priorities, deadlines, link to checklist/step.
•	Reminders (push/Teams/email), Snooze, Reassign.


 


Déclaration of a tag : 

As a user I want to be able to click on a button with a signal panel that allows me to create a tag from echeck 
A pop up will appear and asked me details of the checklist 
 

Immediate action component: 

As a user I want to be able to dclare an immediateaction in 2 way : 
First way would be an action  emoji that is a Flash and when I click on it it would open a pop upwith the immediate a ction risk 

The second one is a component in the second step of the creation Master, dra and drop the component.

Event declaration component
As a operator I want to be able to declare an event but  in a simple way through the checklist with emjy or label that open a pop  up 




