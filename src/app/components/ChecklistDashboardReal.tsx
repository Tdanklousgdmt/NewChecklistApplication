import { useState, useEffect } from "react";
import {
  ChevronRight,
  Plus,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  List,
  FileEdit,
  Loader2,
  Bell,
  PlayCircle,
  Eye,
  BookOpen,
  RotateCcw,
  Save,
  ChevronDown,
  Menu,
  BarChart3,
} from "lucide-react";
import { checklistService } from "../services/checklistService";
import { CalendarView } from "./CalendarView";

interface ChecklistDashboardProps {
  role: "user" | "manager";
  onCreateNew: () => void;
  onExecuteChecklist?: (checklistId: string, assignmentId?: string) => void;
  onViewChecklist?: (checklistId: string) => void;
  onValidateSubmission?: (submissionId: string) => void;
  onOpenLibrary?: () => void;
  onOpenNav?: () => void;
  onOpenReports?: () => void;
}

export function ChecklistDashboardReal({
  role,
  onCreateNew,
  onExecuteChecklist,
  onViewChecklist,
  onValidateSubmission,
  onOpenLibrary,
  onOpenNav,
  onOpenReports,
}: ChecklistDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshingValidations, setRefreshingValidations] = useState(false);
  const [activeChecklists, setActiveChecklists] = useState<any[]>([]);
  const [draftChecklists, setDraftChecklists] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [draftSubmissions, setDraftSubmissions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"my-tasks" | "all-checklists" | "drafts" | "validations" | "in-progress">(
    role === "manager" ? "validations" : "my-tasks"
  );

  // View toggle state
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Mobile filter panel toggle
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    return today.toISOString().split("T")[0];
  });
  const [teamFilter, setTeamFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const refreshPendingValidations = async () => {
    if (role !== "manager") return;

    setRefreshingValidations(true);
    try {
      const submissions = await checklistService.getSubmissions(undefined, "submitted");
      setPendingSubmissions(submissions);
    } catch (error) {
      console.error("Error refreshing validation submissions:", error);
    } finally {
      setRefreshingValidations(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (role === "user") {
        const [assignmentsRes, draftsRes, draftSubsRes, notificationsRes] = await Promise.allSettled([
          checklistService.getAssignments("pending"),
          checklistService.listChecklists("draft"),
          checklistService.listDraftSubmissions(),
          checklistService.getNotifications(true),
        ]);
        setAssignments(assignmentsRes.status === "fulfilled" ? assignmentsRes.value : []);
        setDraftChecklists(draftsRes.status === "fulfilled" ? draftsRes.value : []);
        setDraftSubmissions(draftSubsRes.status === "fulfilled" ? draftSubsRes.value : []);
        setNotifications(notificationsRes.status === "fulfilled" ? notificationsRes.value : []);
      } else {
        const [activeRes, draftsRes, submissionsRes, draftSubsRes, notificationsRes] = await Promise.allSettled([
          checklistService.listChecklists("active"),
          checklistService.listChecklists("draft"),
          checklistService.getSubmissions(undefined, "submitted"),
          checklistService.listDraftSubmissions(),
          checklistService.getNotifications(true),
        ]);
        setActiveChecklists(activeRes.status === "fulfilled" ? activeRes.value : []);
        setDraftChecklists(draftsRes.status === "fulfilled" ? draftsRes.value : []);
        setPendingSubmissions(submissionsRes.status === "fulfilled" ? submissionsRes.value : []);
        setDraftSubmissions(draftSubsRes.status === "fulfilled" ? draftSubsRes.value : []);
        setNotifications(notificationsRes.status === "fulfilled" ? notificationsRes.value : []);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent": return "text-red-600 bg-red-50 border-red-200";
      case "high":   return "text-orange-600 bg-orange-50 border-orange-200";
      case "normal": return "text-blue-600 bg-blue-50 border-blue-200";
      case "low":    return "text-gray-600 bg-gray-50 border-gray-200";
      default:       return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)  return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7)  return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Reusable select style
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundSize: "12px",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.5rem center",
    paddingRight: "2rem",
  };

  const selectClass = "px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all appearance-none cursor-pointer";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#2abaad] animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BurgerBtn onClick={() => onOpenNav?.()} />
          <span className="text-[#2abaad] tracking-wide uppercase text-xs font-medium shrink-0">eCheck</span>
          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
          <span className="text-gray-700 tracking-wide uppercase text-xs truncate">
            {role === "manager" ? "Manager Dashboard" : "My Dashboard"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          {onOpenLibrary && (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs tracking-wide hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Library</span>
            </button>
          )}
          {role === "manager" && onOpenReports && (
            <button
              type="button"
              onClick={onOpenReports}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs tracking-wide hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reports</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#2abaad] text-white rounded-xl text-xs tracking-wide hover:bg-[#24a699] transition-colors shadow-sm shadow-teal-100"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create New</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto">

          {/* ── Welcome ── */}
          <div className="mb-5 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Welcome back! 👋</h1>
            <p className="text-sm text-gray-500">
              {role === "manager"
                ? "Manage checklists, review submissions, and monitor your team's progress"
                : "View your assigned tasks and track your progress"}
            </p>
          </div>

          {/* ── Quick Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-8">
            {role === "user" ? (
              <>
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">Pending Tasks</p>
                      <p className="text-2xl font-bold text-gray-800">{assignments.length}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">My Drafts</p>
                      <p className="text-2xl font-bold text-gray-800">{draftChecklists.length}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                      <FileEdit className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
                    </div>
                  </div>
                </div>
                <div
                  className="col-span-2 sm:col-span-1 bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-amber-100 cursor-pointer hover:border-amber-300 transition-colors"
                  onClick={() => setActiveTab("in-progress")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">In Progress</p>
                      <p className="text-2xl font-bold text-gray-800">{draftSubmissions.length}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                    </div>
                  </div>
                  {draftSubmissions.length > 0 && (
                    <p className="text-xs text-amber-600 mt-2 font-medium">Tap to resume →</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">Active</p>
                      <p className="text-2xl font-bold text-gray-800">{activeChecklists.length}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">Validations</p>
                      <p className="text-2xl font-bold text-gray-800">{pendingSubmissions.length}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">Drafts</p>
                      <p className="text-2xl font-bold text-gray-800">{draftChecklists.length}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                      <FileEdit className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">In Progress</p>
                      <p className="text-2xl font-bold text-gray-800">{draftSubmissions.length}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── View Controls & Filters ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 sm:mb-6 px-4 sm:px-6 py-4 sm:py-5">
            {/* View Toggle */}
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-all relative ${
                  viewMode === "list" ? "text-[#2abaad]" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List className="w-4 h-4" />
                List View
                {viewMode === "list" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2abaad]" />}
              </button>
              {role === "manager" && (
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-all relative ${
                    viewMode === "calendar" ? "text-[#2abaad]" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Calendar
                  {viewMode === "calendar" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2abaad]" />}
                </button>
              )}
            </div>

            {/* Date Range */}
            {viewMode === "list" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
                <div className="flex items-center gap-2 text-gray-600 shrink-0">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Date Range</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all"
                  />
                  <span className="text-sm text-gray-400 shrink-0">→</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Filters — collapsible on mobile */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-600 w-full sm:w-auto sm:cursor-default"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform sm:hidden ml-auto ${showFilters ? "rotate-180" : ""}`}
              />
            </button>

            <div className={`${showFilters ? "grid" : "hidden"} sm:grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-3`}>
              <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={selectClass} style={selectStyle}>
                <option value="all">All Teams</option>
                <option value="team_a">Team A</option>
                <option value="team_b">Team B</option>
                <option value="team_c">Team C</option>
              </select>
              <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)} className={selectClass} style={selectStyle}>
                <option value="all">All Frequencies</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="one_off">One Off</option>
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass} style={selectStyle}>
                <option value="all">All Categories</option>
                <option value="safety">Safety</option>
                <option value="quality">Quality</option>
                <option value="maintenance">Maintenance</option>
                <option value="compliance">Compliance</option>
              </select>
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={selectClass} style={selectStyle}>
                <option value="all">All Locations</option>
                <option value="building_a">Building A</option>
                <option value="building_b">Building B</option>
                <option value="warehouse">Warehouse</option>
              </select>
              <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)} className={selectClass} style={selectStyle}>
                <option value="all">All Shifts</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass} style={selectStyle}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* ── Calendar View ── */}
          {viewMode === "calendar" && role === "manager" && <CalendarView />}

          {/* ── List View ── */}
          {viewMode === "list" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
              {/* Tab bar — scrollable on mobile */}
              <div className="flex items-center gap-1 p-2 border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {role === "user" ? (
                  <>
                    <TabBtn active={activeTab === "my-tasks"} onClick={() => setActiveTab("my-tasks")}>
                      My Tasks ({assignments.length})
                    </TabBtn>
                    <TabBtn active={activeTab === "in-progress"} onClick={() => setActiveTab("in-progress")} dot={draftSubmissions.length > 0} amber>
                      In Progress ({draftSubmissions.length})
                    </TabBtn>
                    <TabBtn active={activeTab === "drafts"} onClick={() => setActiveTab("drafts")}>
                      Drafts ({draftChecklists.length})
                    </TabBtn>
                  </>
                ) : (
                  <>
                    <TabBtn active={activeTab === "all-checklists"} onClick={() => setActiveTab("all-checklists")}>
                      All ({activeChecklists.length})
                    </TabBtn>
                    <TabBtn active={activeTab === "validations"} onClick={() => setActiveTab("validations")}>
                      Validations ({pendingSubmissions.length})
                    </TabBtn>
                    <TabBtn active={activeTab === "in-progress"} onClick={() => setActiveTab("in-progress")} dot={draftSubmissions.length > 0} amber>
                      In Progress ({draftSubmissions.length})
                    </TabBtn>
                    <TabBtn active={activeTab === "drafts"} onClick={() => setActiveTab("drafts")}>
                      Drafts ({draftChecklists.length})
                    </TabBtn>
                  </>
                )}
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-6">

                {/* My Tasks (User) */}
                {activeTab === "my-tasks" && (
                  <div className="space-y-3">
                    {assignments.length === 0 ? (
                      <EmptyState icon={<CheckCircle2 className="w-12 h-12 text-gray-300" />} title="No pending tasks" subtitle="You're all caught up!" />
                    ) : (
                      assignments.map((assignment: any) => (
                        <div key={assignment.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-teal-200 hover:shadow-sm transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-800 mb-1 truncate">
                                {assignment.checklist?.title || "Untitled Checklist"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Assigned {formatDate(assignment.assignedAt)}
                                </span>
                                {assignment.checklist?.category && <><span>•</span><span>{assignment.checklist.category}</span></>}
                                {assignment.checklist?.priority && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(assignment.checklist.priority)}`}>
                                    {assignment.checklist.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onExecuteChecklist?.(assignment.checklistId, assignment.id)}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2abaad] text-white rounded-lg text-sm font-medium hover:bg-[#24a699] transition-colors w-full sm:w-auto shrink-0"
                            >
                              <PlayCircle className="w-4 h-4" />
                              Start
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* All Checklists (Manager) */}
                {activeTab === "all-checklists" && (
                  <div className="space-y-3">
                    {activeChecklists.length === 0 ? (
                      <EmptyState icon={<List className="w-12 h-12 text-gray-300" />} title="No active checklists" subtitle="Create your first checklist to get started" />
                    ) : (
                      activeChecklists.map((checklist: any) => (
                        <div key={checklist.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-teal-200 hover:shadow-sm transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-800 mb-1 truncate">{checklist.data.title}</h3>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Updated {formatDate(checklist.data.updatedAt)}</span>
                                {checklist.data.category && <><span>•</span><span>{checklist.data.category}</span></>}
                                {checklist.data.location && <><span>•</span><span>{checklist.data.location}</span></>}
                                {checklist.data.priority && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(checklist.data.priority)}`}>
                                    {checklist.data.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onViewChecklist?.(checklist.id)}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors w-full sm:w-auto shrink-0"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Pending Validations (Manager) */}
                {activeTab === "validations" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <p className="text-xs text-gray-500">
                        Use refresh after a submission to confirm it appears here.
                      </p>
                      <button
                        type="button"
                        onClick={refreshPendingValidations}
                        disabled={refreshingValidations}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {refreshingValidations ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Refresh
                      </button>
                    </div>
                    {pendingSubmissions.length === 0 ? (
                      <EmptyState icon={<CheckCircle2 className="w-12 h-12 text-gray-300" />} title="No pending validations" subtitle="All submissions have been reviewed" />
                    ) : (
                      pendingSubmissions.map((submission: any) => (
                        <div key={submission.id} className="bg-orange-50 rounded-xl p-4 border border-orange-200 hover:shadow-sm transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                                <h3 className="font-medium text-gray-800">Awaiting Validation</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                                <span className="truncate max-w-[200px]">{submission.submittedByEmail}</span>
                                <span>•</span>
                                <span>{formatDate(submission.submittedAt)}</span>
                                <span>•</span>
                                <span className="font-medium">Score: {submission.totalScore}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onValidateSubmission?.(submission.id)}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2abaad] text-white rounded-lg text-sm font-medium hover:bg-[#24a699] transition-colors w-full sm:w-auto shrink-0"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Review
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* In Progress — Draft Submissions */}
                {activeTab === "in-progress" && (
                  <div className="space-y-3">
                    {draftSubmissions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="w-7 h-7 text-amber-400" />
                        </div>
                        <p className="text-gray-600 font-medium">No saved drafts yet</p>
                        <p className="text-sm text-gray-400 mt-1">Start filling a checklist and click "Save as Draft" to resume later</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl mb-2">
                          <Save className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700">
                            These are in-progress submissions you saved earlier. Tap <strong>Resume</strong> to continue.
                          </p>
                        </div>
                        {draftSubmissions.map((sub: any) => {
                          const answeredCount = Array.isArray(sub.answers)
                            ? sub.answers.filter((a: any) => a.value !== null && a.value !== undefined && a.value !== "").length
                            : 0;
                          const savedAt = new Date(sub.updatedAt || sub.submittedAt);
                          const mins = Math.floor((Date.now() - savedAt.getTime()) / 60000);
                          const savedLabel = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : savedAt.toLocaleDateString();

                          return (
                            <div key={sub.id} className="relative bg-white rounded-xl border-2 border-amber-100 hover:border-amber-300 shadow-sm transition-all overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl" />
                              <div className="flex items-center gap-3 px-4 py-3.5 pl-5">
                                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                                  <BookOpen className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                      {sub.checklistId ? `Checklist · ${sub.checklistId.slice(-8)}` : "Draft"}
                                    </p>
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wide">Draft</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Saved {savedLabel}</span>
                                    <span>·</span>
                                    <span>{answeredCount} field{answeredCount !== 1 ? "s" : ""} answered</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onExecuteChecklist?.(sub.checklistId, sub.assignmentId || undefined)}
                                  className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Resume
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* Drafts */}
                {activeTab === "drafts" && (
                  <div className="space-y-3">
                    {draftChecklists.length === 0 ? (
                      <EmptyState icon={<FileEdit className="w-12 h-12 text-gray-300" />} title="No drafts" subtitle="Your draft checklists will appear here" />
                    ) : (
                      draftChecklists.map((draft: any) => (
                        <div key={draft.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-teal-200 hover:shadow-sm transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <FileEdit className="w-4 h-4 text-slate-600 shrink-0" />
                                <h3 className="font-medium text-gray-800 truncate">{draft.data.title}</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                                <span>Last edited {formatDate(draft.data.updatedAt)}</span>
                                {draft.data.category && <><span>•</span><span>{draft.data.category}</span></>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onViewChecklist?.(draft.id)}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors w-full sm:w-auto shrink-0"
                            >
                              <FileEdit className="w-4 h-4" />
                              Continue Editing
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small helpers ── */

function TabBtn({
  children,
  active,
  onClick,
  dot,
  amber,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  dot?: boolean;
  amber?: boolean;
}) {
  const activeClass = amber
    ? "bg-amber-50 text-amber-700"
    : "bg-teal-50 text-[#2abaad]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
        active ? activeClass : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
      {dot && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
      )}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-4">{icon}</div>
      <p className="text-gray-500 font-medium">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

function BurgerBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation menu"
      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 shrink-0"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
