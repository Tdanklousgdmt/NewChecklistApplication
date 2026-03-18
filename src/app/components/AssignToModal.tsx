import React, { useState, useMemo, useCallback } from "react";
import { X, Search, Users, User, Building2, Check, ChevronDown, ChevronRight } from "lucide-react";

// ── Flat data (TEAM, USER) ─────────────────────────────────────────────────────

const USERS_LIST = [
  { id: "T0327462", name: "TETE DANKLOU" },
  { id: "L8322436", name: "LORRAINE MARIE-CLAIRE DE TALHOUËT" },
  { id: "S4221738", name: "SANTHOSHKUMAR R" },
  { id: "V8613266", name: "VINOTH S" },
  { id: "G2287461", name: "GUOWEI (STEVEN) WANG" },
  { id: "M7750665", name: "MANI MALA M" },
  { id: "R7454645", name: "RAJAKUMARI S" },
  { id: "O5344522", name: "OLIVER WAGNER" },
  { id: "S0538510", name: "SHANKARA NARAYANAN M" },
  { id: "P9123456", name: "PIERRE DURAND" },
  { id: "A8765432", name: "AMINA CISSÉ" },
  { id: "K0987651", name: "KEVIN ADJEI" },
  { id: "N1234567", name: "NADIA KOWALSKI" },
];

const TEAMS_LIST = [
  { id: "TM_SAFETY", name: "Safety Team" },
  { id: "TM_MAINT",  name: "Maintenance Team" },
  { id: "TM_OPS",    name: "Operations Team" },
  { id: "TM_ELEC",   name: "Electrical Team" },
  { id: "TM_INST",   name: "Instrumentation Team" },
  { id: "TM_CIVIL",  name: "Civil Works Team" },
  { id: "TM_QA",     name: "Quality Assurance Team" },
  { id: "TM_ENV",    name: "Environment Team" },
];

// ── Site hierarchy tree (PLANT tab) ───────────────────────────────────────────

interface SiteNode {
  id: string;
  label: string;
  level: "site" | "area" | "line" | "process_step" | "workstation" | "equipment";
  children?: SiteNode[];
}

const LEVEL_LABELS: Record<SiteNode["level"], string> = {
  site:         "Site",
  area:         "Area (Department)",
  line:         "Line (Workshop / Function)",
  process_step: "Process Step (Subfunction)",
  workstation:  "Workstation (Workshop)",
  equipment:    "Equipment",
};

const SITE_TREE: SiteNode[] = [
  {
    id: "site_north", label: "North Plant", level: "site",
    children: [
      {
        id: "area_prod_north", label: "Production Department", level: "area",
        children: [
          {
            id: "line_assembly_north", label: "Assembly Line A", level: "line",
            children: [
              {
                id: "ps_welding", label: "Welding Subfunction", level: "process_step",
                children: [
                  { id: "ws_welding_1", label: "Welding Station 1", level: "workstation",
                    children: [
                      { id: "eq_welder_mig",  label: "MIG Welder #1",       level: "equipment" },
                      { id: "eq_welder_tig",  label: "TIG Welder #2",       level: "equipment" },
                      { id: "eq_press_weld",  label: "Spot Welding Press",   level: "equipment" },
                    ],
                  },
                  { id: "ws_welding_2", label: "Welding Station 2", level: "workstation",
                    children: [
                      { id: "eq_welder_robot", label: "Robotic Welder R10", level: "equipment" },
                      { id: "eq_fume_ext",     label: "Fume Extractor",     level: "equipment" },
                    ],
                  },
                ],
              },
              {
                id: "ps_painting", label: "Painting Subfunction", level: "process_step",
                children: [
                  { id: "ws_paint_booth", label: "Paint Booth WS", level: "workstation",
                    children: [
                      { id: "eq_spray_gun_a", label: "Spray Gun A",   level: "equipment" },
                      { id: "eq_curing_oven", label: "Curing Oven",   level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: "line_packaging", label: "Packaging Line", level: "line",
            children: [
              {
                id: "ps_wrapping", label: "Wrapping Subfunction", level: "process_step",
                children: [
                  { id: "ws_wrap_1", label: "Wrap Station 1", level: "workstation",
                    children: [
                      { id: "eq_shrink_wrap",  label: "Shrink Wrap Machine", level: "equipment" },
                      { id: "eq_label_printer", label: "Label Printer LX2",  level: "equipment" },
                    ],
                  },
                ],
              },
              {
                id: "ps_palletizing", label: "Palletizing Subfunction", level: "process_step",
                children: [
                  { id: "ws_pallet_1", label: "Palletizing Station", level: "workstation",
                    children: [
                      { id: "eq_pallet_robot", label: "Palletizing Robot PR5", level: "equipment" },
                      { id: "eq_conveyor_out", label: "Outfeed Conveyor",       level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "area_maint_north", label: "Maintenance Department", level: "area",
        children: [
          {
            id: "line_mech_maint", label: "Mechanical Maintenance", level: "line",
            children: [
              {
                id: "ps_pm", label: "Preventive Maintenance", level: "process_step",
                children: [
                  { id: "ws_maint_shop", label: "Maintenance Workshop", level: "workstation",
                    children: [
                      { id: "eq_lathe",      label: "CNC Lathe L200",    level: "equipment" },
                      { id: "eq_drill_press", label: "Drill Press DP10", level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: "line_elec_maint", label: "Electrical Maintenance", level: "line",
            children: [
              {
                id: "ps_elec_inspect", label: "Electrical Inspection", level: "process_step",
                children: [
                  { id: "ws_elec_panel", label: "Electrical Panel Room", level: "workstation",
                    children: [
                      { id: "eq_mcc_a",       label: "Motor Control Center A", level: "equipment" },
                      { id: "eq_transformer", label: "Step-Down Transformer",  level: "equipment" },
                      { id: "eq_ups",         label: "UPS Unit #3",            level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "area_qc_north", label: "Quality Control Department", level: "area",
        children: [
          {
            id: "line_inspection", label: "Inspection Line", level: "line",
            children: [
              {
                id: "ps_visual_insp", label: "Visual Inspection", level: "process_step",
                children: [
                  { id: "ws_insp_station", label: "Inspection Station A", level: "workstation",
                    children: [
                      { id: "eq_microscope",    label: "Microscope MX500",       level: "equipment" },
                      { id: "eq_camera_system", label: "Vision Camera System",   level: "equipment" },
                    ],
                  },
                ],
              },
              {
                id: "ps_dimensional", label: "Dimensional Check", level: "process_step",
                children: [
                  { id: "ws_cmm", label: "CMM Room", level: "workstation",
                    children: [
                      { id: "eq_cmm_zeiss",   label: "CMM ZEISS Contura",  level: "equipment" },
                      { id: "eq_height_gauge", label: "Height Gauge HG300", level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "site_south", label: "South Plant", level: "site",
    children: [
      {
        id: "area_ops_south", label: "Operations Department", level: "area",
        children: [
          {
            id: "line_main_ops", label: "Main Operations Line", level: "line",
            children: [
              {
                id: "ps_mixing", label: "Mixing Subfunction", level: "process_step",
                children: [
                  { id: "ws_mix_1", label: "Mixing Station 1", level: "workstation",
                    children: [
                      { id: "eq_mixer_a", label: "Industrial Mixer A",   level: "equipment" },
                      { id: "eq_pump_1",  label: "Transfer Pump P-101",  level: "equipment" },
                    ],
                  },
                  { id: "ws_mix_2", label: "Mixing Station 2", level: "workstation",
                    children: [
                      { id: "eq_reactor",  label: "Reaction Vessel RV-02", level: "equipment" },
                      { id: "eq_agitator", label: "Agitator AG-02",        level: "equipment" },
                    ],
                  },
                ],
              },
              {
                id: "ps_filling", label: "Filling Subfunction", level: "process_step",
                children: [
                  { id: "ws_fill_line", label: "Filling Line WS", level: "workstation",
                    children: [
                      { id: "eq_filler_a",    label: "Bottle Filler FA-1",   level: "equipment" },
                      { id: "eq_capper",      label: "Capping Machine CM-1", level: "equipment" },
                      { id: "eq_checkweigher", label: "Check Weigher CW-2",  level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "area_safety_south", label: "Safety & Environment Dept.", level: "area",
        children: [
          {
            id: "line_safety_patrol", label: "Safety Patrol Line", level: "line",
            children: [
              {
                id: "ps_fire_safety", label: "Fire Safety Subfunction", level: "process_step",
                children: [
                  { id: "ws_fire_control", label: "Fire Control Room", level: "workstation",
                    children: [
                      { id: "eq_fire_panel",    label: "Fire Alarm Panel",      level: "equipment" },
                      { id: "eq_sprinkler_ctrl", label: "Sprinkler Controller", level: "equipment" },
                      { id: "eq_gas_detector",  label: "Gas Detector GD-10",   level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "site_refinery", label: "Refinery Unit 3", level: "site",
    children: [
      {
        id: "area_distill", label: "Distillation Department", level: "area",
        children: [
          {
            id: "line_crude_dist", label: "Crude Distillation Unit", level: "line",
            children: [
              {
                id: "ps_preheating", label: "Preheating Subfunction", level: "process_step",
                children: [
                  { id: "ws_furnace", label: "Furnace Area", level: "workstation",
                    children: [
                      { id: "eq_furnace_f101", label: "Furnace F-101",       level: "equipment" },
                      { id: "eq_hx_e101",      label: "Heat Exchanger E-101", level: "equipment" },
                    ],
                  },
                ],
              },
              {
                id: "ps_fractionation", label: "Fractionation Subfunction", level: "process_step",
                children: [
                  { id: "ws_column", label: "Distillation Column Area", level: "workstation",
                    children: [
                      { id: "eq_col_t101",  label: "Column T-101",    level: "equipment" },
                      { id: "eq_reboiler",  label: "Reboiler E-102",  level: "equipment" },
                      { id: "eq_condenser", label: "Condenser E-103", level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "site_offshore", label: "Offshore Platform A", level: "site",
    children: [
      {
        id: "area_drilling", label: "Drilling Department", level: "area",
        children: [
          {
            id: "line_drill_ops", label: "Drilling Operations", level: "line",
            children: [
              {
                id: "ps_drill_floor", label: "Drill Floor Subfunction", level: "process_step",
                children: [
                  { id: "ws_drill_floor", label: "Drill Floor WS", level: "workstation",
                    children: [
                      { id: "eq_top_drive", label: "Top Drive TD-500", level: "equipment" },
                      { id: "eq_mud_pump",  label: "Mud Pump MP-1",    level: "equipment" },
                      { id: "eq_bop",       label: "BOP Stack",        level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "area_process_off", label: "Process Department", level: "area",
        children: [
          {
            id: "line_sep", label: "Separation Train", level: "line",
            children: [
              {
                id: "ps_separation", label: "Oil/Gas Separation", level: "process_step",
                children: [
                  { id: "ws_separator", label: "Separator Skid", level: "workstation",
                    children: [
                      { id: "eq_sep_v101", label: "3-Phase Separator V-101", level: "equipment" },
                      { id: "eq_test_sep", label: "Test Separator V-102",    level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ── Tree helpers ───────────────────────────────────────────────────────────────

function subtreeIds(node: SiteNode): string[] {
  const ids: string[] = [node.id];
  if (node.children) node.children.forEach((c) => ids.push(...subtreeIds(c)));
  return ids;
}

function nodeMatchesSearch(node: SiteNode, q: string): boolean {
  if (node.label.toLowerCase().includes(q)) return true;
  return (node.children ?? []).some((c) => nodeMatchesSearch(c, q));
}

interface FlatNode { node: SiteNode; depth: number; hasChildren: boolean; }

function flattenTree(nodes: SiteNode[], expanded: Set<string>, search: string, depth = 0): FlatNode[] {
  const q = search.toLowerCase().trim();
  const result: FlatNode[] = [];
  for (const node of nodes) {
    if (q && !nodeMatchesSearch(node, q)) continue;
    result.push({ node, depth, hasChildren: !!(node.children?.length) });
    if (node.children?.length) {
      const open = q ? true : expanded.has(node.id);
      if (open) result.push(...flattenTree(node.children, expanded, search, depth + 1));
    }
  }
  return result;
}

function findNode(id: string, nodes: SiteNode[] = SITE_TREE): SiteNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const f = findNode(id, n.children); if (f) return f; }
  }
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TabType = "TEAM" | "USER" | "PLANT";

interface AssignEntry {
  id: string;
  name: string;
  type: TabType;
}

interface AssignToModalProps {
  initialSelections?: AssignEntry[];
  onConfirm: (selections: AssignEntry[]) => void;
  onClose: () => void;
}

// ── PlantTree sub-component ───────────────────────────────────────────────────

interface PlantTreeProps {
  search: string;
  selected: AssignEntry[];
  onToggle: (entry: AssignEntry) => void;
  onBulkToggle: (ids: string[], entries: AssignEntry[], allSelected: boolean) => void;
}

function PlantTree({ search, selected, onToggle, onBulkToggle }: PlantTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(SITE_TREE.map((s) => s.id))
  );

  const flat = useMemo(() => flattenTree(SITE_TREE, expanded, search), [expanded, search]);

  const selectedIds = useMemo(() => new Set(selected.filter((s) => s.type === "PLANT").map((s) => s.id)), [selected]);

  const isChecked = useCallback((node: SiteNode): boolean => {
    const ids = subtreeIds(node);
    return ids.every((id) => selectedIds.has(id));
  }, [selectedIds]);

  const isIndeterminate = useCallback((node: SiteNode): boolean => {
    if (!node.children?.length) return false;
    const ids = subtreeIds(node);
    const some = ids.some((id) => selectedIds.has(id));
    const all  = ids.every((id) => selectedIds.has(id));
    return some && !all;
  }, [selectedIds]);

  const handleToggle = (node: SiteNode) => {
    const ids = subtreeIds(node);
    const allSel = ids.every((id) => selectedIds.has(id));
    // Build entries for all nodes in subtree
    const entries: AssignEntry[] = [];
    const collect = (n: SiteNode) => {
      entries.push({ id: n.id, name: n.label, type: "PLANT" });
      n.children?.forEach(collect);
    };
    collect(node);
    onBulkToggle(ids, entries, allSel);
  };

  if (flat.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-400">No results found</p>;
  }

  return (
    <div>
      {flat.map(({ node, depth, hasChildren }) => {
        const checked = isChecked(node);
        const indet   = isIndeterminate(node);
        const open    = expanded.has(node.id);

        return (
          <div
            key={node.id}
            className="flex items-center gap-2 py-1.5 group hover:bg-gray-50 rounded-lg px-2 transition-colors"
            style={{ paddingLeft: `${6 + depth * 18}px` }}
          >
            {/* Chevron */}
            <button
              type="button"
              onClick={() => {
                if (!hasChildren) return;
                setExpanded((prev) => {
                  const next = new Set(prev);
                  next.has(node.id) ? next.delete(node.id) : next.add(node.id);
                  return next;
                });
              }}
              className={`w-4 h-4 flex items-center justify-center shrink-0 transition-colors ${
                hasChildren ? "text-gray-400 hover:text-[#2abaad] cursor-pointer" : "text-transparent cursor-default"
              }`}
            >
              {hasChildren ? (open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : null}
            </button>

            {/* Checkbox */}
            <button
              type="button"
              onClick={() => handleToggle(node)}
              className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                checked ? "bg-[#2abaad] border-[#2abaad]"
                : indet  ? "border-[#2abaad] bg-white"
                :          "border-gray-300 bg-white hover:border-[#2abaad]"
              }`}
            >
              {checked && <Check className="w-2.5 h-2.5 text-white" />}
              {indet && !checked && <span className="w-2 h-0.5 bg-[#2abaad] rounded-full" />}
            </button>

            {/* Label */}
            <button
              type="button"
              onClick={() => handleToggle(node)}
              className={`flex-1 text-left text-xs transition-colors ${checked ? "text-[#2abaad] font-semibold" : "text-gray-700"}`}
            >
              {node.label}
              <span className="ml-1.5 text-[9px] text-gray-300 group-hover:text-gray-400 normal-case tracking-normal">
                {LEVEL_LABELS[node.level]}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AssignToModal({ initialSelections = [], onConfirm, onClose }: AssignToModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("USER");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<AssignEntry[]>(initialSelections);

  // Flat list filtering (TEAM / USER)
  const listForTab = useMemo(() => {
    const raw = activeTab === "USER" ? USERS_LIST : activeTab === "TEAM" ? TEAMS_LIST : [];
    return raw.filter((item) =>
      `${item.id} ${item.name}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeTab, search]);

  const isSelected = (id: string) => selected.some((s) => s.id === id);

  const toggle = (item: { id: string; name: string }) => {
    if (isSelected(item.id)) {
      setSelected((prev) => prev.filter((s) => s.id !== item.id));
    } else {
      setSelected((prev) => [...prev, { ...item, type: activeTab }]);
    }
  };

  // Bulk toggle for plant tree (handles whole subtree)
  const bulkToggle = (ids: string[], entries: AssignEntry[], allSelected: boolean) => {
    setSelected((prev) => {
      if (allSelected) {
        return prev.filter((s) => !ids.includes(s.id));
      } else {
        const existing = new Set(prev.map((s) => s.id));
        const toAdd = entries.filter((e) => !existing.has(e.id));
        return [...prev, ...toAdd];
      }
    });
  };

  const removeChip = (id: string) => setSelected((prev) => prev.filter((s) => s.id !== id));

  const handleOk = () => { onConfirm(selected); onClose(); };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "TEAM",  label: "TEAM",  icon: <Users     className="w-3.5 h-3.5" /> },
    { key: "USER",  label: "USER",  icon: <User      className="w-3.5 h-3.5" /> },
    { key: "PLANT", label: "PLANT", icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: 640, height: "min(640px, 90vh)" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold tracking-widest text-gray-800 uppercase">Select Assign To</h2>

          {/* Tab switcher */}
          <div className="flex rounded-xl overflow-hidden border border-[#2abaad]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setActiveTab(tab.key); setSearch(""); }}
                className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${
                  activeTab === tab.key ? "bg-[#2abaad] text-white" : "bg-white text-[#2abaad] hover:bg-teal-50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-6 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl">
            <Search className="w-4 h-4 text-gray-300 shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === "PLANT" ? "Search location…" : `Search ${activeTab.toLowerCase()}s…`}
              className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── List / Tree ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#2abaad #e5e7eb" }}>
          {activeTab === "PLANT" ? (
            <PlantTree
              search={search}
              selected={selected}
              onToggle={(entry) => toggle({ id: entry.id, name: entry.name })}
              onBulkToggle={bulkToggle}
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {listForTab.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No results found</p>
              ) : (
                listForTab.map((item) => {
                  const sel = isSelected(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item)}
                      className={`w-full flex items-center gap-3 px-2 py-3 text-left text-sm transition-colors ${sel ? "bg-teal-50" : "hover:bg-gray-50"}`}
                    >
                      <span className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${sel ? "bg-[#2abaad] border-[#2abaad]" : "border-gray-300 bg-white"}`}>
                        {sel && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                      <span className="text-xs font-mono text-gray-400 shrink-0 w-20">{item.id}</span>
                      <span className="text-gray-200 shrink-0">—</span>
                      <span className={`font-medium ${sel ? "text-[#2abaad]" : "text-gray-700"}`}>{item.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Footer: chips + buttons ── */}
        <div className="shrink-0 border-t border-gray-100 bg-gray-50/60 px-5 py-3 flex items-center gap-3">
          {/* Chips */}
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0" style={{ scrollbarWidth: "none" }}>
            {selected.length === 0 ? (
              <span className="text-xs text-gray-300 italic">Nothing selected yet…</span>
            ) : (
              <>
                {selected.slice(0, 6).map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-white border border-gray-200 rounded-full text-[10px] font-medium text-gray-700 shadow-sm whitespace-nowrap shrink-0"
                  >
                    <span className="text-gray-400 uppercase">{s.type}</span>
                    <span>{s.name}</span>
                    <button
                      type="button"
                      onClick={() => removeChip(s.id)}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center bg-gray-200 hover:bg-red-100 hover:text-red-500 text-gray-500 transition-colors ml-0.5"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                ))}
                {selected.length > 6 && (
                  <span className="text-[10px] text-gray-400 shrink-0">+{selected.length - 6}</span>
                )}
              </>
            )}
          </div>

          {selected.length > 0 && (
            <span className="text-[10px] text-[#2abaad] font-semibold shrink-0 whitespace-nowrap">
              {selected.length} selected
            </span>
          )}

          <button
            type="button"
            onClick={handleOk}
            className="px-10 py-2 bg-[#2abaad] hover:bg-teal-600 text-white text-xs font-bold tracking-widest uppercase rounded-lg transition-colors shadow-sm shrink-0"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2 bg-gray-400 hover:bg-gray-500 text-white text-xs font-bold tracking-widest uppercase rounded-lg transition-colors shrink-0"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
export function formatAssignToLabel(selections: AssignEntry[]): string {
  if (selections.length === 0) return "";
  if (selections.length === 1) return `${selections[0].id} - ${selections[0].name}`;
  return `${selections[0].name} +${selections.length - 1} more`;
}