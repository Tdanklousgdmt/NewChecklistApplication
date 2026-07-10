import { useMemo, useState } from "react";
import {
  Menu,
  Search,
  CalendarDays,
  Award,
  Wrench,
  ShieldAlert,
  Leaf,
  HardHat,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Plus,
  Loader2,
  FileText,
} from "lucide-react";
import { checklistService } from "../services/checklistService";
import { toast } from "sonner";

/* ─────────────────────────────────────────────────────────────────────────────
 * Standard Checklist Library
 * A curated catalogue of EHS standard checklists grouped by domain
 * (Event, Quality, Turnaround, Risk Declaration, Environment, Safety).
 * Each template can be used to spin up a new editable draft.
 * ──────────────────────────────────────────────────────────────────────────── */

// Map a field typeId to its palette category (must match ChecklistStep2 FIELD_TYPES).
const FIELD_CATEGORY: Record<string, string> = {
  short_text: "basic", long_text: "basic", number: "basic", number_unit: "basic",
  number_threshold: "basic", checkbox: "basic", yes_no: "basic", custom_buttons: "basic",
  dropdown: "basic", date: "datetime", time: "datetime", datetime: "datetime",
  photo: "media", signature: "media", file: "media", rating: "advanced",
  temperature: "advanced", location: "advanced", barcode: "advanced",
};

interface StdField {
  uid: string;
  typeId: string;
  label: string;
  required: boolean;
  category: string;
  options?: string[];
}

let uidCounter = 0;
function f(typeId: string, label: string, required = false, options?: string[]): StdField {
  return {
    uid: `std_${Date.now().toString(36)}_${uidCounter++}`,
    typeId,
    label,
    required,
    category: FIELD_CATEGORY[typeId] ?? "basic",
    ...(options ? { options } : {}),
  };
}

interface StdTemplate {
  id: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  frequency: string;
  fields: StdField[];
}

interface StdDomain {
  key: string;
  name: string;
  blurb: string;
  appCategory: string; // maps to the app's checklist category
  color: string;       // tailwind text/border accent base (e.g. "teal")
  icon: React.ReactNode;
  templates: StdTemplate[];
}

/* ── The curated catalogue ─────────────────────────────────────────────────── */
const CATALOG: StdDomain[] = [
  {
    key: "event",
    name: "Event",
    blurb: "Incident, near-miss and event reporting",
    appCategory: "Operations",
    color: "indigo",
    icon: <CalendarDays className="w-5 h-5" />,
    templates: [
      {
        id: "evt_incident",
        title: "Incident Report",
        description: "Record and classify a workplace incident with immediate actions taken.",
        priority: "High",
        frequency: "ON_EVENT",
        fields: [
          f("datetime", "Date & time of incident", true),
          f("location", "Location", true),
          f("dropdown", "Incident type", true, ["Injury", "Property damage", "Environmental", "Process safety", "Other"]),
          f("long_text", "Description of what happened", true),
          f("dropdown", "Severity", true, ["Minor", "Moderate", "Serious", "Major"]),
          f("long_text", "Immediate actions taken", true),
          f("photo", "Photos of the scene"),
          f("signature", "Reporter signature", true),
        ],
      },
      {
        id: "evt_nearmiss",
        title: "Near-Miss Report",
        description: "Capture near-misses to prevent future incidents.",
        priority: "Medium",
        frequency: "ON_EVENT",
        fields: [
          f("datetime", "When did it occur?", true),
          f("location", "Where?", true),
          f("long_text", "What could have happened?", true),
          f("dropdown", "Potential severity", true, ["Low", "Medium", "High"]),
          f("long_text", "Suggested corrective action"),
          f("photo", "Photo evidence"),
        ],
      },
      {
        id: "evt_readiness",
        title: "Event Safety Readiness",
        description: "Pre-event safety verification for on-site activities.",
        priority: "Medium",
        frequency: "ON_EVENT",
        fields: [
          f("short_text", "Event name", true),
          f("date", "Event date", true),
          f("yes_no", "Emergency exits clear?", true),
          f("yes_no", "First-aid available on site?", true),
          f("yes_no", "Attendees briefed on safety?", true),
          f("number", "Expected number of attendees"),
        ],
      },
    ],
  },
  {
    key: "quality",
    name: "Quality",
    blurb: "Product conformity, inspections and audits",
    appCategory: "Quality",
    color: "violet",
    icon: <Award className="w-5 h-5" />,
    templates: [
      {
        id: "qa_inspection",
        title: "Quality Inspection",
        description: "Standard incoming/outgoing product quality inspection.",
        priority: "Medium",
        frequency: "DAILY",
        fields: [
          f("short_text", "Batch / lot number", true),
          f("number", "Sample size", true),
          f("number", "Defects found", true),
          f("custom_buttons", "Overall result", true),
          f("long_text", "Non-conformity notes"),
          f("photo", "Defect photo"),
        ],
      },
      {
        id: "qa_conformity",
        title: "Product Conformity Check",
        description: "Verify a product against its specification.",
        priority: "High",
        frequency: "PER_BATCH",
        fields: [
          f("short_text", "Product reference", true),
          f("number_unit", "Measured dimension"),
          f("yes_no", "Within tolerance?", true),
          f("yes_no", "Labelling correct?", true),
          f("dropdown", "Disposition", true, ["Accept", "Rework", "Reject"]),
        ],
      },
      {
        id: "qa_audit",
        title: "Internal Quality Audit",
        description: "Periodic quality management system audit checklist.",
        priority: "Medium",
        frequency: "MONTHLY",
        fields: [
          f("short_text", "Area audited", true),
          f("yes_no", "Procedures documented?", true),
          f("yes_no", "Records up to date?", true),
          f("yes_no", "Corrective actions closed?", true),
          f("rating", "Overall compliance rating"),
          f("long_text", "Findings & observations"),
        ],
      },
    ],
  },
  {
    key: "turnaround",
    name: "Turnaround (TA)",
    blurb: "Shutdown, startup and turnaround readiness",
    appCategory: "Maintenance",
    color: "amber",
    icon: <Wrench className="w-5 h-5" />,
    templates: [
      {
        id: "ta_readiness",
        title: "Turnaround Readiness",
        description: "Confirm readiness before a plant turnaround begins.",
        priority: "Critical",
        frequency: "ON_EVENT",
        fields: [
          f("short_text", "Unit / area", true),
          f("yes_no", "Scope frozen?", true),
          f("yes_no", "Permits prepared?", true),
          f("yes_no", "Contractors inducted?", true),
          f("yes_no", "Spare parts staged?", true),
          f("date", "Planned start date", true),
        ],
      },
      {
        id: "ta_shutdown",
        title: "Shutdown Safety Checklist",
        description: "Safe isolation and shutdown verification.",
        priority: "Critical",
        frequency: "ON_EVENT",
        fields: [
          f("yes_no", "Equipment de-energised (LOTO)?", true),
          f("yes_no", "Lines depressurised & drained?", true),
          f("yes_no", "Isolation verified by second person?", true),
          f("barcode", "Isolation tag / lock ID"),
          f("signature", "Authorised person signature", true),
        ],
      },
      {
        id: "ta_startup",
        title: "Startup Checklist",
        description: "Verify safe conditions before restarting equipment.",
        priority: "High",
        frequency: "ON_EVENT",
        fields: [
          f("yes_no", "All permits closed?", true),
          f("yes_no", "Guards & safety devices reinstated?", true),
          f("yes_no", "Area clear of personnel & tools?", true),
          f("temperature", "Startup temperature reading"),
          f("signature", "Supervisor sign-off", true),
        ],
      },
    ],
  },
  {
    key: "risk",
    name: "Risk Declaration",
    blurb: "Risk assessment, hazard ID and job safety analysis",
    appCategory: "Compliance",
    color: "rose",
    icon: <ShieldAlert className="w-5 h-5" />,
    templates: [
      {
        id: "risk_assessment",
        title: "Risk Assessment Declaration",
        description: "Declare and rate the risks of a planned activity.",
        priority: "High",
        frequency: "ON_EVENT",
        fields: [
          f("short_text", "Activity / task", true),
          f("long_text", "Hazards identified", true),
          f("dropdown", "Likelihood", true, ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"]),
          f("dropdown", "Consequence", true, ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"]),
          f("long_text", "Control measures", true),
          f("dropdown", "Residual risk", true, ["Low", "Medium", "High", "Extreme"]),
          f("signature", "Assessor declaration", true),
        ],
      },
      {
        id: "risk_hazard",
        title: "Hazard Identification (HazID)",
        description: "Systematic identification of workplace hazards.",
        priority: "Medium",
        frequency: "WEEKLY",
        fields: [
          f("location", "Area inspected", true),
          f("dropdown", "Hazard category", true, ["Mechanical", "Electrical", "Chemical", "Ergonomic", "Environmental"]),
          f("long_text", "Hazard description", true),
          f("photo", "Hazard photo"),
          f("long_text", "Recommended action"),
        ],
      },
      {
        id: "risk_jsa",
        title: "Job Safety Analysis (JSA)",
        description: "Step-by-step safety analysis of a job task.",
        priority: "High",
        frequency: "ON_EVENT",
        fields: [
          f("short_text", "Job / task name", true),
          f("long_text", "Job steps", true),
          f("long_text", "Potential hazards per step", true),
          f("long_text", "Controls per step", true),
          f("yes_no", "PPE requirements confirmed?", true),
          f("signature", "Team acknowledgement", true),
        ],
      },
    ],
  },
  {
    key: "environment",
    name: "Environment",
    blurb: "Environmental compliance and waste management",
    appCategory: "Compliance",
    color: "emerald",
    icon: <Leaf className="w-5 h-5" />,
    templates: [
      {
        id: "env_compliance",
        title: "Environmental Compliance Check",
        description: "Verify compliance with environmental requirements.",
        priority: "Medium",
        frequency: "MONTHLY",
        fields: [
          f("yes_no", "Emissions within limits?", true),
          f("yes_no", "Effluent monitored?", true),
          f("yes_no", "Permits valid & displayed?", true),
          f("number_unit", "Recorded emission value"),
          f("long_text", "Observations"),
        ],
      },
      {
        id: "env_waste",
        title: "Waste Management",
        description: "Track waste segregation, storage and disposal.",
        priority: "Low",
        frequency: "WEEKLY",
        fields: [
          f("dropdown", "Waste stream", true, ["General", "Recyclable", "Hazardous", "Organic"]),
          f("number_unit", "Quantity"),
          f("yes_no", "Segregated correctly?", true),
          f("yes_no", "Storage area compliant?", true),
          f("photo", "Storage photo"),
        ],
      },
      {
        id: "env_spill",
        title: "Spill Response",
        description: "Record a spill event and the response actions.",
        priority: "High",
        frequency: "ON_EVENT",
        fields: [
          f("datetime", "Time of spill", true),
          f("dropdown", "Substance", true, ["Oil", "Chemical", "Fuel", "Other"]),
          f("number_unit", "Estimated volume"),
          f("long_text", "Containment actions", true),
          f("yes_no", "Reported to authorities?", true),
        ],
      },
    ],
  },
  {
    key: "safety",
    name: "Safety",
    blurb: "PPE, LOTO and general workplace safety",
    appCategory: "Safety",
    color: "teal",
    icon: <HardHat className="w-5 h-5" />,
    templates: [
      {
        id: "saf_ppe",
        title: "PPE Compliance",
        description: "Verify personal protective equipment usage.",
        priority: "Medium",
        frequency: "DAILY",
        fields: [
          f("yes_no", "Head protection worn?", true),
          f("yes_no", "Eye protection worn?", true),
          f("yes_no", "Hand protection worn?", true),
          f("yes_no", "Foot protection worn?", true),
          f("long_text", "Non-compliance notes"),
        ],
      },
      {
        id: "saf_loto",
        title: "LOTO Verification",
        description: "Lock-out / tag-out isolation verification.",
        priority: "Critical",
        frequency: "ON_EVENT",
        fields: [
          f("short_text", "Equipment ID", true),
          f("yes_no", "Energy sources identified?", true),
          f("yes_no", "Locks & tags applied?", true),
          f("yes_no", "Zero-energy state verified?", true),
          f("signature", "Authorised person", true),
        ],
      },
      {
        id: "saf_fire",
        title: "Fire Safety Inspection",
        description: "Routine fire prevention and equipment inspection.",
        priority: "High",
        frequency: "MONTHLY",
        fields: [
          f("yes_no", "Extinguishers charged & accessible?", true),
          f("yes_no", "Exit routes clear?", true),
          f("yes_no", "Alarms functional?", true),
          f("date", "Next inspection due"),
          f("photo", "Inspection photo"),
        ],
      },
    ],
  },
];

/* ── Color helpers ─────────────────────────────────────────────────────────── */
const ACCENT: Record<string, { text: string; bg: string; border: string; ring: string }> = {
  indigo:  { text: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-200",  ring: "bg-indigo-500"  },
  violet:  { text: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200",  ring: "bg-violet-500"  },
  amber:   { text: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   ring: "bg-amber-500"   },
  rose:    { text: "text-rose-600",    bg: "bg-rose-50",    border: "border-rose-200",    ring: "bg-rose-500"    },
  emerald: { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", ring: "bg-emerald-500" },
  teal:    { text: "text-teal-600",    bg: "bg-teal-50",    border: "border-teal-200",    ring: "bg-teal-500"    },
};

const PRIORITY_STYLE: Record<string, string> = {
  Low:      "bg-gray-100 text-gray-600",
  Medium:   "bg-blue-100 text-blue-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

interface StandardLibraryProps {
  onOpenNav?: () => void;
  onGoToLibrary?: () => void;
}

export function StandardLibrary({ onOpenNav, onGoToLibrary }: StandardLibraryProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);

  const domains = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG
      .map((d) => ({
        ...d,
        templates: d.templates.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            d.name.toLowerCase().includes(q),
        ),
      }))
      .filter((d) => d.templates.length > 0);
  }, [search]);

  const totalTemplates = CATALOG.reduce((n, d) => n + d.templates.length, 0);

  const handleUseTemplate = async (domain: StdDomain, tpl: StdTemplate) => {
    setUsingId(tpl.id);
    try {
      await checklistService.createDraft(
        {
          title: tpl.title,
          category: domain.appCategory,
          priority: tpl.priority,
          frequency: tpl.frequency,
          notes: tpl.description,
          validateChecklist: true,
          canvasFields: tpl.fields,
        } as any,
        true,
      );
      toast.success("Draft created from standard template", {
        description: `"${tpl.title}" is ready to edit in the Checklist Library.`,
        action: onGoToLibrary ? { label: "Open Library", onClick: onGoToLibrary } : undefined,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create draft from template");
    } finally {
      setUsingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          {onOpenNav && (
            <button
              type="button"
              onClick={onOpenNav}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">Standard Checklist Library</h1>
              <p className="text-xs text-gray-500">EHS standard templates — {totalTemplates} ready to use</p>
            </div>
          </div>
        </div>
        {/* Search */}
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search standard checklists…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-5xl mx-auto px-4 py-5 space-y-6">
        {domains.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No standard checklists match “{search}”.
          </div>
        )}

        {domains.map((domain) => {
          const accent = ACCENT[domain.color];
          const isCollapsed = collapsed[domain.key];
          return (
            <section key={domain.key} className={`rounded-xl border ${accent.border} bg-white overflow-hidden`}>
              {/* Domain header */}
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [domain.key]: !c[domain.key] }))}
                className={`w-full flex items-center gap-3 px-4 py-3 ${accent.bg} text-left`}
              >
                <div className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center ${accent.text} shrink-0`}>
                  {domain.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-gray-800">{domain.name}</h2>
                  <p className="text-xs text-gray-500 truncate">{domain.blurb}</p>
                </div>
                <span className={`text-xs font-semibold ${accent.text}`}>{domain.templates.length}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Templates grid */}
              {!isCollapsed && (
                <div className="p-4 grid gap-3 sm:grid-cols-2">
                  {domain.templates.map((tpl) => {
                    const open = previewId === tpl.id;
                    const busy = usingId === tpl.id;
                    return (
                      <div key={tpl.id} className="rounded-lg border border-gray-200 p-3.5 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-gray-800">{tpl.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLE[tpl.priority]}`}>
                            {tpl.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex-1">{tpl.description}</p>

                        <div className="flex items-center gap-3 mt-2.5 text-[11px] text-gray-400">
                          <span>{tpl.fields.length} fields</span>
                          <span>·</span>
                          <span>{tpl.frequency.replace(/_/g, " ").toLowerCase()}</span>
                        </div>

                        {open && (
                          <ul className="mt-2.5 space-y-1 border-t border-gray-100 pt-2.5">
                            {tpl.fields.map((fld) => (
                              <li key={fld.uid} className="text-xs text-gray-600 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${accent.ring}`} />
                                {fld.label}
                                {fld.required && <span className="text-red-400">*</span>}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => setPreviewId(open ? null : tpl.id)}
                            className="text-xs font-medium text-gray-600 hover:text-gray-800 px-2 py-1.5 rounded-md hover:bg-gray-100"
                          >
                            {open ? "Hide" : "Preview"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleUseTemplate(domain, tpl)}
                            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-60 px-3 py-1.5 rounded-md"
                          >
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            {busy ? "Creating…" : "Use template"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
