import React, { useState, useMemo, useCallback } from "react";
import { X, Search, Check, ChevronDown, ChevronRight, MapPin } from "lucide-react";

// ── Site hierarchy ────────────────────────────────────────────────────────────

export interface SiteNode {
  id: string;
  label: string;
  level: "site" | "area" | "line" | "process_step" | "workstation" | "equipment";
  children?: SiteNode[];
}

const LEVEL_LABELS: Record<SiteNode["level"], string> = {
  site:         "Site",
  area:         "Area (Department)",
  line:         "Line (Workshop, Function)",
  process_step: "ProcessStep (Subfunction)",
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
            id: "line_assembly_a", label: "Assembly Line A", level: "line",
            children: [
              {
                id: "ps_welding", label: "Welding Subfunction", level: "process_step",
                children: [
                  { id: "ws_weld_1", label: "Welding Station 1", level: "workstation",
                    children: [
                      { id: "eq_mig_1",      label: "MIG Welder #1",       level: "equipment" },
                      { id: "eq_tig_2",      label: "TIG Welder #2",       level: "equipment" },
                      { id: "eq_spot_press", label: "Spot Welding Press",   level: "equipment" },
                    ],
                  },
                  { id: "ws_weld_2", label: "Welding Station 2", level: "workstation",
                    children: [
                      { id: "eq_robot_w",  label: "Robotic Welder R10", level: "equipment" },
                      { id: "eq_fume_ext", label: "Fume Extractor",     level: "equipment" },
                    ],
                  },
                ],
              },
              {
                id: "ps_painting", label: "Painting Subfunction", level: "process_step",
                children: [
                  { id: "ws_paint_booth", label: "Paint Booth WS", level: "workstation",
                    children: [
                      { id: "eq_spray_a",    label: "Spray Gun A",  level: "equipment" },
                      { id: "eq_curing_oven", label: "Curing Oven", level: "equipment" },
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
                      { id: "eq_shrink",   label: "Shrink Wrap Machine", level: "equipment" },
                      { id: "eq_lbl_prnt", label: "Label Printer LX2",  level: "equipment" },
                    ],
                  },
                ],
              },
              {
                id: "ps_palletizing", label: "Palletizing Subfunction", level: "process_step",
                children: [
                  { id: "ws_pallet", label: "Palletizing Station", level: "workstation",
                    children: [
                      { id: "eq_pal_robot",  label: "Palletizing Robot PR5", level: "equipment" },
                      { id: "eq_conv_out",   label: "Outfeed Conveyor",       level: "equipment" },
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
                      { id: "eq_lathe",      label: "CNC Lathe L200",   level: "equipment" },
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
                id: "ps_elec_insp", label: "Electrical Inspection", level: "process_step",
                children: [
                  { id: "ws_elec_panel", label: "Electrical Panel Room", level: "workstation",
                    children: [
                      { id: "eq_mcc_a",       label: "Motor Control Center A", level: "equipment" },
                      { id: "eq_transformer", label: "Step-Down Transformer",  level: "equipment" },
                      { id: "eq_ups_3",       label: "UPS Unit #3",            level: "equipment" },
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
                id: "ps_visual", label: "Visual Inspection", level: "process_step",
                children: [
                  { id: "ws_insp_a", label: "Inspection Station A", level: "workstation",
                    children: [
                      { id: "eq_scope",  label: "Microscope MX500",     level: "equipment" },
                      { id: "eq_camera", label: "Vision Camera System", level: "equipment" },
                    ],
                  },
                ],
              },
              {
                id: "ps_dimensional", label: "Dimensional Check", level: "process_step",
                children: [
                  { id: "ws_cmm", label: "CMM Room", level: "workstation",
                    children: [
                      { id: "eq_cmm_zeiss",  label: "CMM ZEISS Contura", level: "equipment" },
                      { id: "eq_hgt_gauge",  label: "Height Gauge HG300", level: "equipment" },
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
                      { id: "eq_mixer_a",  label: "Industrial Mixer A",  level: "equipment" },
                      { id: "eq_pump_101", label: "Transfer Pump P-101", level: "equipment" },
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
                      { id: "eq_filler_a",     label: "Bottle Filler FA-1",   level: "equipment" },
                      { id: "eq_capper_1",     label: "Capping Machine CM-1", level: "equipment" },
                      { id: "eq_checkweigher", label: "Check Weigher CW-2",   level: "equipment" },
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
            id: "line_safety", label: "Safety Patrol Line", level: "line",
            children: [
              {
                id: "ps_fire", label: "Fire Safety Subfunction", level: "process_step",
                children: [
                  { id: "ws_fire_ctrl", label: "Fire Control Room", level: "workstation",
                    children: [
                      { id: "eq_fire_panel",  label: "Fire Alarm Panel",      level: "equipment" },
                      { id: "eq_sprinkler",   label: "Sprinkler Controller",  level: "equipment" },
                      { id: "eq_gas_det",     label: "Gas Detector GD-10",    level: "equipment" },
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
            id: "line_crude", label: "Crude Distillation Unit", level: "line",
            children: [
              {
                id: "ps_preheating", label: "Preheating Subfunction", level: "process_step",
                children: [
                  { id: "ws_furnace", label: "Furnace Area", level: "workstation",
                    children: [
                      { id: "eq_furnace_f101", label: "Furnace F-101",        level: "equipment" },
                      { id: "eq_hx_e101",      label: "Heat Exchanger E-101", level: "equipment" },
                    ],
                  },
                ],
              },
              {
                id: "ps_fraction", label: "Fractionation Subfunction", level: "process_step",
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
                id: "ps_oil_gas_sep", label: "Oil/Gas Separation", level: "process_step",
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
  {
    id: "site_central", label: "Central Facility", level: "site",
    children: [
      {
        id: "area_admin", label: "Administration Department", level: "area",
        children: [
          {
            id: "line_admin_ops", label: "Admin Operations", level: "line",
            children: [
              {
                id: "ps_it", label: "IT Subfunction", level: "process_step",
                children: [
                  { id: "ws_server_room", label: "Server Room", level: "workstation",
                    children: [
                      { id: "eq_srv_rack_a", label: "Server Rack A",    level: "equipment" },
                      { id: "eq_srv_rack_b", label: "Server Rack B",    level: "equipment" },
                      { id: "eq_network_sw", label: "Core Network Switch", level: "equipment" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "area_storage", label: "Storage & Logistics Dept.", level: "area",
        children: [
          {
            id: "line_warehouse", label: "Warehouse Function", level: "line",
            children: [
              {
                id: "ps_receiving", label: "Receiving Subfunction", level: "process_step",
                children: [
                  { id: "ws_dock_a", label: "Loading Dock A", level: "workstation",
                    children: [
                      { id: "eq_forklift_1", label: "Forklift FL-01",       level: "equipment" },
                      { id: "eq_pallet_jack", label: "Pallet Jack PJ-05",   level: "equipment" },
                      { id: "eq_barcode_sc",  label: "Barcode Scanner SC3", level: "equipment" },
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

// ── Tree helpers ──────────────────────────────────────────────────────────────

function subtreeIds(node: SiteNode): string[] {
  const ids: string[] = [node.id];
  (node.children ?? []).forEach((c) => ids.push(...subtreeIds(c)));
  return ids;
}

function nodeMatchesSearch(node: SiteNode, q: string): boolean {
  if (node.label.toLowerCase().includes(q)) return true;
  return (node.children ?? []).some((c) => nodeMatchesSearch(c, q));
}

interface FlatRow { node: SiteNode; depth: number; hasChildren: boolean; }

function flattenTree(
  nodes: SiteNode[],
  expanded: Set<string>,
  search: string,
  depth = 0,
): FlatRow[] {
  const q = search.toLowerCase().trim();
  const out: FlatRow[] = [];
  for (const node of nodes) {
    if (q && !nodeMatchesSearch(node, q)) continue;
    out.push({ node, depth, hasChildren: !!(node.children?.length) });
    const open = q ? true : expanded.has(node.id);
    if (open && node.children?.length) {
      out.push(...flattenTree(node.children, expanded, search, depth + 1));
    }
  }
  return out;
}

function findNodeById(id: string, nodes: SiteNode[] = SITE_TREE): SiteNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNodeById(id, n.children ?? []);
    if (f) return f;
  }
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocationSelection {
  id: string;
  label: string;
  level: SiteNode["level"];
}

interface LocationModalProps {
  initialSelected?: Set<string>;
  onConfirm: (selections: LocationSelection[]) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LocationModal({ initialSelected = new Set(), onConfirm, onClose }: LocationModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(SITE_TREE.map((s) => s.id))
  );

  const flat = useMemo(() => flattenTree(SITE_TREE, expanded, search), [expanded, search]);

  const isChecked = useCallback((node: SiteNode): boolean => {
    const ids = subtreeIds(node);
    return ids.every((id) => selected.has(id));
  }, [selected]);

  const isIndeterminate = useCallback((node: SiteNode): boolean => {
    if (!node.children?.length) return false;
    const ids = subtreeIds(node);
    const some = ids.some((id) => selected.has(id));
    const all  = ids.every((id) => selected.has(id));
    return some && !all;
  }, [selected]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelect = (node: SiteNode) => {
    const ids = subtreeIds(node);
    const allSel = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSel) ids.forEach((id) => next.delete(id));
      else        ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const removeById = (id: string) => {
    const node = findNodeById(id);
    if (!node) return;
    const ids = subtreeIds(node);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => next.delete(i));
      return next;
    });
  };

  const handleOk = () => {
    const selections: LocationSelection[] = Array.from(selected).map((id) => {
      const node = findNodeById(id);
      return { id, label: node?.label ?? id, level: node?.level ?? "equipment" };
    });
    onConfirm(selections);
    onClose();
  };

  // Leaf-only chips (most specific selected nodes — avoids parent + all-children duplication)
  const selectedCount = selected.size;
  const chipNodes: SiteNode[] = Array.from(selected)
    .map((id) => findNodeById(id))
    .filter((n): n is SiteNode => !!n)
    .slice(0, 8);

  // Indent per depth level (px)
  const INDENT = 20;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 600, height: "min(640px, 90vh)" }}
      >
        {/* ── Header ── */}
        <div className="relative flex items-center justify-center px-6 pt-5 pb-2 shrink-0">
          <h2 className="text-xl font-bold tracking-wide" style={{ color: "#2abaad" }}>Location</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-5 pb-2 shrink-0">
          <div className="flex items-center gap-2 border-b-2 border-gray-200 pb-1.5 focus-within:border-[#2abaad] transition-colors">
            <Search className="w-4 h-4 text-gray-300 shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 outline-none bg-transparent"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Tree ── */}
        <div
          className="flex-1 overflow-y-auto px-4 py-1"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#2abaad #e5e7eb" }}
        >
          {flat.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No results found</p>
          ) : (
            flat.map(({ node, depth, hasChildren }) => {
              const checked      = isChecked(node);
              const indeterminate = isIndeterminate(node);
              const isOpen       = expanded.has(node.id);
              const isEquipment  = node.level === "equipment";

              return (
                <div
                  key={node.id}
                  className="flex items-center gap-1.5 py-2 group hover:bg-gray-50 rounded-lg transition-colors"
                  style={{ paddingLeft: `${8 + depth * INDENT}px`, paddingRight: 8 }}
                >
                  {/* Expand/collapse — hidden for equipment leaf */}
                  {!isEquipment ? (
                    <button
                      type="button"
                      onClick={() => hasChildren && toggleExpand(node.id)}
                      className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                        hasChildren
                          ? "text-gray-500 hover:text-[#2abaad] cursor-pointer"
                          : "text-transparent cursor-default"
                      }`}
                    >
                      {hasChildren
                        ? isOpen
                          ? <ChevronDown  className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        : null}
                    </button>
                  ) : (
                    /* equipment indent spacer */
                    <span className="w-5 h-5 shrink-0" />
                  )}

                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(node)}
                    className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                      checked
                        ? "bg-[#2abaad] border-[#2abaad]"
                        : indeterminate
                        ? "border-[#2abaad] bg-white"
                        : "border-gray-400 bg-white hover:border-[#2abaad]"
                    }`}
                  >
                    {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    {indeterminate && !checked && (
                      <span className="w-2 h-0.5 rounded-full bg-[#2abaad]" />
                    )}
                  </button>

                  {/* Label + level badge */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(node)}
                    className="flex-1 text-left flex items-baseline gap-1.5 min-w-0"
                  >
                    <span className={`text-sm truncate transition-colors ${checked ? "text-[#2abaad] font-semibold" : "text-gray-700"}`}>
                      {node.label}
                    </span>
                    <span className="text-[10px] text-gray-300 group-hover:text-gray-400 whitespace-nowrap shrink-0 normal-case">
                      {LEVEL_LABELS[node.level]}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-gray-100 bg-gray-50/60 px-5 py-3 flex items-center gap-3">
          {/* Chip strip */}
          <div
            className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0"
            style={{ scrollbarWidth: "none" }}
          >
            {selectedCount === 0 ? (
              <span className="text-xs text-gray-300 italic">No location selected</span>
            ) : (
              <>
                {chipNodes.map((node) => (
                  <span
                    key={node.id}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-full text-[10px] whitespace-nowrap shrink-0"
                  >
                    <MapPin className="w-2.5 h-2.5 text-teal-400" />
                    {node.label}
                    <button
                      type="button"
                      onClick={() => removeById(node.id)}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center bg-teal-200 hover:bg-red-200 hover:text-red-600 text-teal-600 transition-colors ml-0.5"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                ))}
                {selectedCount > 8 && (
                  <span className="text-[10px] text-gray-400 shrink-0">+{selectedCount - 8}</span>
                )}
              </>
            )}
          </div>

          {/* Count */}
          {selectedCount > 0 && (
            <span className="text-[10px] font-semibold whitespace-nowrap shrink-0" style={{ color: "#2abaad" }}>
              {selectedCount} selected
            </span>
          )}

          {/* Buttons */}
          <button
            type="button"
            onClick={handleOk}
            className="px-8 py-2 text-white text-sm font-bold tracking-widest uppercase rounded-lg transition-colors shadow-sm shrink-0"
            style={{ background: "#4caf79" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#43a06c")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#4caf79")}
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm font-bold tracking-widest uppercase rounded-lg transition-colors shrink-0"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatLocationLabel(selections: LocationSelection[]): string {
  if (selections.length === 0) return "";
  if (selections.length === 1) return selections[0].label;
  return `${selections[0].label} +${selections.length - 1} more`;
}