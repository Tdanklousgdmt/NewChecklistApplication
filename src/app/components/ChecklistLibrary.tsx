import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, Plus, Search, Filter, FileEdit, Copy, Trash2,
  CheckCircle2, Clock, Library, Tag, X, ArrowUpDown, BookMarked,
  FileCheck2, LayoutList, SlidersHorizontal, AlertTriangle, Loader2,
  RefreshCw,
} from "lucide-react";
import { checklistService } from "../services/checklistService";
import { toast } from "sonner";

type ChecklistStatus = "active" | "draft" | "archived";

interface Checklist {
  id: string;
  version: number;
  updatedAt: number;
  data: {
    title: string;
    category?: string;
    status?: ChecklistStatus;
    priority?: string;
    frequency?: string;
    location?: string;
    canvasFields?: any[];
    [key: string]: any;
  };
}

const CATEGORIES = ["All Categories", "Safety", "Maintenance", "Quality", "Compliance", "HR", "Operations", "Other"];

/* ─────────────────────────────────────────────────────────────────────────── */

interface ChecklistLibraryProps {
  onCreateNew: () => void;
  onEditChecklist: (id: string) => void;
  onViewDetail: (id: string) => void;
}

export function ChecklistLibrary({ onCreateNew, onEditChecklist, onViewDetail }: ChecklistLibraryProps) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<"all" | "active" | "draft">("all");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [sortBy, setSortBy]               = useState<"updated" | "title">("updated");
  const [showFilters, setShowFilters]     = useState(false);

  const [deleteConfirmId, setDeleteConfirmId]   = useState<string | null>(null);
  const [deletingId, setDeletingId]             = useState<string | null>(null);
  const [templateLoadingId, setTemplateLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both active and draft in parallel
      const [active, drafts] = await Promise.allSettled([
        checklistService.listChecklists("active"),
        checklistService.listChecklists("draft"),
      ]);
      const all: Checklist[] = [
        ...(active.status === "fulfilled" ? active.value : []),
        ...(drafts.status === "fulfilled" ? drafts.value : []),
      ];
      // Sort by most recently updated first
      all.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      setChecklists(all as Checklist[]);
    } catch (err) {
      setError("Failed to load checklists. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await checklistService.deleteChecklist(id);
      setChecklists((prev) => prev.filter((c) => c.id !== id));
      toast.success("Checklist deleted");
    } catch {
      toast.error("Failed to delete checklist");
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleUseAsTemplate = async (checklist: Checklist) => {
    setTemplateLoadingId(checklist.id);
    try {
      const templateData = {
        ...checklist.data,
        title: `${checklist.data.title} (Copy)`,
        status: "draft",
      };
      await checklistService.createDraft(templateData, true);
      toast.success("New draft created from template", { description: `"${templateData.title}" is ready to edit.` });
      load(); // reload to show the new draft
    } catch {
      toast.error("Failed to create template copy");
    } finally {
      setTemplateLoadingId(null);
    }
  };

  /* ── Filtering & sorting ── */
  const filtered = checklists
    .filter((c) => {
      const status: ChecklistStatus = c.data.status ?? (c.data.canvasFields ? "active" : "draft");
      const matchSearch   = !search || c.data.title?.toLowerCase().includes(search.toLowerCase()) || c.data.category?.toLowerCase().includes(search.toLowerCase());
      const matchStatus   = statusFilter === "all" || status === statusFilter;
      const matchCategory = categoryFilter === "All Categories" || c.data.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === "title") return (a.data.title ?? "").localeCompare(b.data.title ?? "");
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });

  const publishedCount = checklists.filter((c) => (c.data.status ?? "active") === "active").length;
  const draftCount     = checklists.filter((c) => c.data.status === "draft").length;

  const formatDate = (ts: number) => {
    if (!ts) return "—";
    const d   = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  };

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundSize: "12px", backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.5rem center", paddingRight: "2rem",
  };
  const selectClass = "px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all appearance-none cursor-pointer";

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#2abaad] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading library…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[#2abaad] tracking-wide uppercase text-xs font-medium shrink-0">eCheck</span>
          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
          <span className="text-gray-700 tracking-wide uppercase text-xs truncate">Checklist Library</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={load}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-500" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button type="button" onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#2abaad] text-white rounded-xl text-xs tracking-wide hover:bg-[#24a699] transition-colors shadow-sm shadow-teal-100">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create Checklist</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
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
            <p className="text-sm text-gray-500 pl-12">All your checklists in one place — edit, duplicate, or use as templates.</p>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button type="button" onClick={load} className="text-xs font-medium text-red-600 hover:underline">Retry</button>
            </div>
          )}

          {/* ── Quick stats ── */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-8">
            <StatCard label="Total" value={checklists.length}
              icon={<LayoutList className="w-5 h-5 text-[#2abaad]" />} iconBg="bg-teal-50"
              active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            <StatCard label="Published" value={publishedCount}
              icon={<FileCheck2 className="w-5 h-5 text-teal-600" />} iconBg="bg-teal-50"
              active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
            <StatCard label="Drafts" value={draftCount}
              icon={<FileEdit className="w-5 h-5 text-slate-600" />} iconBg="bg-slate-100"
              active={statusFilter === "draft"} onClick={() => setStatusFilter("draft")} />
          </div>

          {/* ── Search + Filters ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 sm:mb-6 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Search by title or category…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all" />
                {search && (
                  <button type="button" onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded transition-colors">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setShowFilters(!showFilters)}
                className={`sm:hidden flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${showFilters ? "bg-teal-50 border-teal-200 text-[#2abaad]" : "border-gray-200 text-gray-600"}`}>
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className={`${showFilters ? "flex" : "hidden"} sm:flex flex-wrap items-center gap-2`}>
              <div className="flex items-center gap-1.5 text-gray-500 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Filter:</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(["all", "active", "draft"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${statusFilter === s ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {s === "all" ? "All" : s === "active" ? "Published" : "Draft"}
                  </button>
                ))}
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectClass} style={selectStyle}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <div className="ml-auto flex items-center gap-1.5 text-gray-500 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className={selectClass + " text-xs"} style={selectStyle}>
                  <option value="updated">Last updated</option>
                  <option value="title">Title A–Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── List ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Desktop header */}
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_110px_120px_80px_210px] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/60">
              {["Checklist", "Status", "Category", "Version", "Actions"].map((h) => (
                <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookMarked className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">{search || statusFilter !== "all" ? "No checklists match your filters" : "No checklists yet"}</p>
                <p className="text-sm text-gray-400 mt-1">{search ? "Try a different search term." : "Create your first checklist to get started."}</p>
                {!search && statusFilter === "all" && (
                  <button type="button" onClick={onCreateNew}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#2abaad] text-white rounded-xl text-sm font-medium hover:bg-[#24a699] transition-colors">
                    <Plus className="w-4 h-4" /> Create Checklist
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((checklist) => (
                  <ChecklistRow
                    key={checklist.id}
                    checklist={checklist}
                    formatDate={formatDate}
                    deleteConfirm={deleteConfirmId === checklist.id}
                    deleting={deletingId === checklist.id}
                    templateLoading={templateLoadingId === checklist.id}
                    onViewDetail={() => onViewDetail(checklist.id)}
                    onEdit={() => onEditChecklist(checklist.id)}
                    onUseAsTemplate={() => handleUseAsTemplate(checklist)}
                    onDeleteRequest={() => setDeleteConfirmId(checklist.id)}
                    onDeleteCancel={() => setDeleteConfirmId(null)}
                    onDeleteConfirm={() => handleDelete(checklist.id)}
                  />
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <div className="px-4 sm:px-6 py-3 border-t border-gray-50 bg-gray-50/40">
                <p className="text-xs text-gray-400">
                  Showing <span className="font-medium text-gray-600">{filtered.length}</span> of{" "}
                  <span className="font-medium text-gray-600">{checklists.length}</span> checklists
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
function StatCard({ label, value, icon, iconBg, active, onClick }: {
  label: string; value: number; icon: React.ReactNode; iconBg: string; active: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`bg-white rounded-xl p-4 sm:p-5 shadow-sm border text-left transition-all ${active ? "border-[#2abaad]/40 ring-1 ring-[#2abaad]/20" : "border-gray-100 hover:border-gray-200"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${iconBg} rounded-xl flex items-center justify-center`}>{icon}</div>
      </div>
    </button>
  );
}

/* ─────────────── Checklist Row ─────────────── */
function ChecklistRow({
  checklist, formatDate,
  deleteConfirm, deleting, templateLoading,
  onViewDetail, onEdit, onUseAsTemplate,
  onDeleteRequest, onDeleteCancel, onDeleteConfirm,
}: {
  checklist: Checklist; formatDate: (ts: number) => string;
  deleteConfirm: boolean; deleting: boolean; templateLoading: boolean;
  onViewDetail: () => void; onEdit: () => void; onUseAsTemplate: () => void;
  onDeleteRequest: () => void; onDeleteCancel: () => void; onDeleteConfirm: () => void;
}) {
  const status: ChecklistStatus = checklist.data.status ?? "active";
  const isPublished = status === "active";
  const fieldsCount = checklist.data.canvasFields?.length ?? 0;

  const statusBadge = isPublished ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap">
      <CheckCircle2 className="w-3 h-3" />Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
      <Clock className="w-3 h-3" />Draft
    </span>
  );

  if (deleteConfirm) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-red-50 border-l-4 border-red-400">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">Delete "<span className="text-red-600">{checklist.data.title}</span>"?</p>
            <p className="text-xs text-gray-500 mt-0.5">This cannot be undone.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={onDeleteCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onDeleteConfirm} disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_110px_120px_80px_210px] gap-4 items-center px-6 py-4 hover:bg-gray-50/60 transition-colors">
        <button type="button" onClick={onViewDetail} className="min-w-0 text-left group/title">
          <p className="font-medium text-gray-800 truncate mb-0.5 group-hover/title:text-[#2abaad] transition-colors">{checklist.data.title || "Untitled"}</p>
          <div className="flex items-center gap-2 mt-1">
            {fieldsCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400"><Tag className="w-2.5 h-2.5" />{fieldsCount} fields</span>
            )}
            {fieldsCount > 0 && <span className="text-[10px] text-gray-300">·</span>}
            <span className="flex items-center gap-1 text-[10px] text-gray-400"><Clock className="w-2.5 h-2.5" />{formatDate(checklist.updatedAt)}</span>
          </div>
        </button>
        <div>{statusBadge}</div>
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
            {checklist.data.category || "—"}
          </span>
        </div>
        <div><span className="text-sm font-mono text-gray-500">v{checklist.version}</span></div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors">
            <FileEdit className="w-3.5 h-3.5" />Edit
          </button>
          <button type="button" onClick={onUseAsTemplate} disabled={templateLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2abaad] bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-60">
            {templateLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
            Template
          </button>
          <button type="button" onClick={onDeleteRequest}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="sm:hidden px-4 py-4 hover:bg-gray-50/40 transition-colors">
        <button type="button" onClick={onViewDetail} className="w-full text-left mb-2">
          <p className="font-medium text-gray-800 leading-snug mb-1.5 hover:text-[#2abaad] transition-colors">{checklist.data.title || "Untitled"}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {statusBadge}
            {checklist.data.category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">{checklist.data.category}</span>
            )}
            <span className="text-xs font-mono text-gray-400">v{checklist.version}</span>
          </div>
        </button>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <Clock className="w-3 h-3" />{formatDate(checklist.updatedAt)}
          {fieldsCount > 0 && <><span>·</span><Tag className="w-3 h-3" />{fieldsCount} fields</>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <FileEdit className="w-3.5 h-3.5" />Edit
          </button>
          <button type="button" onClick={onUseAsTemplate} disabled={templateLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#2abaad] bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-60">
            {templateLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
            Template
          </button>
          <button type="button" onClick={onDeleteRequest}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
