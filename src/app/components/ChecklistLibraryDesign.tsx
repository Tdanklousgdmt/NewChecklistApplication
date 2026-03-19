/**
 * DESIGN MOCKUP – Checklist Library Page
 * Uses mock data so the design can be reviewed before wiring up real services.
 */

import { useState } from "react";
import {
  ChevronRight,
  Plus,
  Search,
  Filter,
  MoreVertical,
  FileEdit,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  Library,
  Tag,
  ChevronDown,
  X,
  ArrowUpDown,
  BookMarked,
  FileCheck2,
  LayoutList,
  SlidersHorizontal,
} from "lucide-react";

/* ─────────────── Mock data ─────────────── */

type ChecklistStatus = "published" | "draft";

interface MockChecklist {
  id: string;
  title: string;
  description: string;
  status: ChecklistStatus;
  version: string;
  category: string;
  updatedAt: string;
  fieldsCount: number;
  createdBy: string;
}

const MOCK_CHECKLISTS: MockChecklist[] = [
  {
    id: "1",
    title: "Morning Safety Inspection",
    description: "Daily safety walkthrough for production floor before shift start.",
    status: "published",
    version: "v3.1",
    category: "Safety",
    updatedAt: "2 hours ago",
    fieldsCount: 24,
    createdBy: "J. Martin",
  },
  {
    id: "2",
    title: "Equipment Maintenance — Line A",
    description: "Weekly preventive maintenance checklist for conveyor line A.",
    status: "published",
    version: "v1.4",
    category: "Maintenance",
    updatedAt: "1 day ago",
    fieldsCount: 18,
    createdBy: "S. Dupont",
  },
  {
    id: "3",
    title: "Quality Control — Batch Review",
    description: "End-of-batch quality sign-off with photo evidence and scoring.",
    status: "draft",
    version: "v2.0-draft",
    category: "Quality",
    updatedAt: "3 days ago",
    fieldsCount: 31,
    createdBy: "J. Martin",
  },
  {
    id: "4",
    title: "ISO 9001 Compliance Audit",
    description: "Quarterly compliance self-assessment aligned with ISO 9001 requirements.",
    status: "published",
    version: "v5.0",
    category: "Compliance",
    updatedAt: "1 week ago",
    fieldsCount: 47,
    createdBy: "A. Bernard",
  },
  {
    id: "5",
    title: "New Employee Onboarding",
    description: "Step-by-step checklist for first-day onboarding process.",
    status: "draft",
    version: "v0.2-draft",
    category: "HR",
    updatedAt: "5 days ago",
    fieldsCount: 12,
    createdBy: "S. Dupont",
  },
  {
    id: "6",
    title: "Cold Chain Monitoring",
    description: "Temperature control verification for cold-storage areas.",
    status: "published",
    version: "v2.3",
    category: "Quality",
    updatedAt: "2 days ago",
    fieldsCount: 9,
    createdBy: "J. Martin",
  },
  {
    id: "7",
    title: "Fire Safety Monthly Check",
    description: "Monthly fire extinguisher, exit, and sprinkler system verification.",
    status: "published",
    version: "v1.0",
    category: "Safety",
    updatedAt: "3 weeks ago",
    fieldsCount: 15,
    createdBy: "A. Bernard",
  },
  {
    id: "8",
    title: "Shift Handover Report",
    description: "End-of-shift summary and open-issue handover form.",
    status: "draft",
    version: "v1.1-draft",
    category: "Operations",
    updatedAt: "6 hours ago",
    fieldsCount: 20,
    createdBy: "J. Martin",
  },
];

const CATEGORIES = ["All Categories", "Safety", "Maintenance", "Quality", "Compliance", "HR", "Operations"];

/* ─────────────── Component ─────────────── */

interface ChecklistLibraryDesignProps {
  onCreateNew?: () => void;
  onBack?: () => void;
}

export function ChecklistLibraryDesign({
  onCreateNew,
  onBack: _onBack,
}: ChecklistLibraryDesignProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [sortBy, setSortBy] = useState<"updated" | "title" | "version">("updated");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = MOCK_CHECKLISTS.filter((c) => {
    const matchSearch =
      search === "" ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchCategory = categoryFilter === "All Categories" || c.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  }).sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "version") return b.version.localeCompare(a.version);
    return 0; // keep original order for "updated" (mock data already sorted)
  });

  const publishedCount = MOCK_CHECKLISTS.filter((c) => c.status === "published").length;
  const draftCount = MOCK_CHECKLISTS.filter((c) => c.status === "draft").length;

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundSize: "12px",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.5rem center",
    paddingRight: "2rem",
  };
  const selectClass =
    "px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[#2abaad] tracking-wide uppercase text-xs font-medium shrink-0">eCheck</span>
          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
          <span className="text-gray-700 tracking-wide uppercase text-xs truncate">Checklist Library</span>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#2abaad] text-white rounded-xl text-xs tracking-wide hover:bg-[#24a699] transition-colors shadow-sm shadow-teal-100"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create Checklist</span>
          <span className="sm:hidden">New</span>
        </button>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto">

          {/* ── Page title ── */}
          <div className="mb-5 sm:mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                <Library className="w-5 h-5 text-[#2abaad]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Checklist Library</h1>
            </div>
            <p className="text-sm text-gray-500 pl-12">
              All your checklists in one place — edit, duplicate, or use as templates.
            </p>
          </div>

          {/* ── Quick stats ── */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-8">
            <StatCard
              label="Total"
              value={MOCK_CHECKLISTS.length}
              icon={<LayoutList className="w-5 h-5 text-[#2abaad]" />}
              iconBg="bg-teal-50"
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <StatCard
              label="Published"
              value={publishedCount}
              icon={<FileCheck2 className="w-5 h-5 text-teal-600" />}
              iconBg="bg-teal-50"
              active={statusFilter === "published"}
              onClick={() => setStatusFilter("published")}
            />
            <StatCard
              label="Drafts"
              value={draftCount}
              icon={<FileEdit className="w-5 h-5 text-slate-600" />}
              iconBg="bg-slate-100"
              active={statusFilter === "draft"}
              onClick={() => setStatusFilter("draft")}
            />
          </div>

          {/* ── Search + Filters ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 sm:mb-6 px-4 sm:px-6 py-4">

            {/* Search row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Mobile filter toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`sm:hidden flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
                  showFilters ? "bg-teal-50 border-teal-200 text-[#2abaad]" : "border-gray-200 text-gray-600"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Filters row */}
            <div className={`${showFilters ? "flex" : "hidden"} sm:flex flex-wrap items-center gap-2`}>
              <div className="flex items-center gap-1.5 text-gray-500 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Filter:</span>
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(["all", "published", "draft"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      statusFilter === s
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {s === "all" ? "All" : s === "published" ? "Published" : "Draft"}
                  </button>
                ))}
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectClass}
                style={selectStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <div className="ml-auto flex items-center gap-1.5 text-gray-500 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="text-xs font-medium hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className={selectClass + " text-xs"}
                  style={selectStyle}
                >
                  <option value="updated">Last updated</option>
                  <option value="title">Title A–Z</option>
                  <option value="version">Version</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Checklist table / list ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Desktop table header */}
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_120px_130px_90px_130px] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/60">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Checklist</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Version</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</span>
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookMarked className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No checklists found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((checklist) => (
                  <ChecklistRow
                    key={checklist.id}
                    checklist={checklist}
                    menuOpen={openMenuId === checklist.id}
                    onToggleMenu={() =>
                      setOpenMenuId((prev) => (prev === checklist.id ? null : checklist.id))
                    }
                    onCloseMenu={() => setOpenMenuId(null)}
                    deleteConfirm={deleteConfirmId === checklist.id}
                    onDeleteRequest={() => setDeleteConfirmId(checklist.id)}
                    onDeleteCancel={() => setDeleteConfirmId(null)}
                    onDeleteConfirm={() => setDeleteConfirmId(null)} // mock: no real deletion
                  />
                ))}
              </div>
            )}

            {/* Footer count */}
            {filtered.length > 0 && (
              <div className="px-4 sm:px-6 py-3 border-t border-gray-50 bg-gray-50/40 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Showing <span className="font-medium text-gray-600">{filtered.length}</span> of{" "}
                  <span className="font-medium text-gray-600">{MOCK_CHECKLISTS.length}</span> checklists
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─────────────── Stat Card ─────────────── */

function StatCard({
  label,
  value,
  icon,
  iconBg,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-white rounded-xl p-4 sm:p-5 shadow-sm border text-left transition-all ${
        active
          ? "border-[#2abaad]/40 ring-1 ring-[#2abaad]/20"
          : "border-gray-100 hover:border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </button>
  );
}

/* ─────────────── Checklist Row ─────────────── */

function ChecklistRow({
  checklist,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  deleteConfirm,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  checklist: MockChecklist;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  deleteConfirm: boolean;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  const isPublished = checklist.status === "published";

  const statusBadge = isPublished ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
      <CheckCircle2 className="w-3 h-3" />
      Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      <Clock className="w-3 h-3" />
      Draft
    </span>
  );

  /* Delete confirmation inline banner */
  if (deleteConfirm) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-red-50 border-l-4 border-red-400">
        <div className="flex items-center gap-3 min-w-0">
          <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">Delete "{checklist.title}"?</p>
            <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDeleteCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDeleteConfirm}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">

      {/* ── Desktop row (sm+) ── */}
      <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_120px_130px_90px_130px] gap-4 items-center px-6 py-4 hover:bg-gray-50/60 transition-colors">

        {/* Title + meta */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-medium text-gray-800 truncate">{checklist.title}</p>
          </div>
          <p className="text-xs text-gray-400 truncate">{checklist.description}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Tag className="w-2.5 h-2.5" />
              {checklist.fieldsCount} fields
            </span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-gray-400">by {checklist.createdBy}</span>
          </div>
        </div>

        {/* Status */}
        <div>{statusBadge}</div>

        {/* Category */}
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
            {checklist.category}
          </span>
        </div>

        {/* Version */}
        <div>
          <span className="text-sm font-mono text-gray-500">{checklist.version}</span>
        </div>

        {/* Updated + actions */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-400 truncate">{checklist.updatedAt}</span>

          {/* 3-dot menu (visible on row hover) */}
          <div className="relative">
            <button
              type="button"
              onClick={onToggleMenu}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                {/* backdrop */}
                <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
                <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
                  <MenuAction icon={<FileEdit className="w-4 h-4" />} label="Edit" onClick={onCloseMenu} />
                  <MenuAction icon={<Copy className="w-4 h-4" />} label="Use as Template" onClick={onCloseMenu} />
                  <div className="my-1 border-t border-gray-100" />
                  <MenuAction
                    icon={<Trash2 className="w-4 h-4" />}
                    label="Delete"
                    danger
                    onClick={() => { onCloseMenu(); onDeleteRequest(); }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile card (< sm) ── */}
      <div className="sm:hidden px-4 py-4 hover:bg-gray-50/60 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-800 leading-snug mb-1">{checklist.title}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {statusBadge}
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                {checklist.category}
              </span>
              <span className="text-xs font-mono text-gray-400">{checklist.version}</span>
            </div>
          </div>

          {/* 3-dot menu */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onToggleMenu}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
                <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
                  <MenuAction icon={<FileEdit className="w-4 h-4" />} label="Edit" onClick={onCloseMenu} />
                  <MenuAction icon={<Copy className="w-4 h-4" />} label="Use as Template" onClick={onCloseMenu} />
                  <div className="my-1 border-t border-gray-100" />
                  <MenuAction
                    icon={<Trash2 className="w-4 h-4" />}
                    label="Delete"
                    danger
                    onClick={() => { onCloseMenu(); onDeleteRequest(); }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-2 line-clamp-1">{checklist.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {checklist.updatedAt}
            <span>·</span>
            <Tag className="w-3 h-3" />
            {checklist.fieldsCount} fields
          </div>

          {/* Inline action buttons (mobile) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileEdit className="w-3 h-3" />
              Edit
            </button>
            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#2abaad] bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
            >
              <Copy className="w-3 h-3" />
              Template
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ─────────────── Drop-down menu action ─────────────── */

function MenuAction({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* Needed so Tailwind picks up line-clamp utility */
// line-clamp-1
