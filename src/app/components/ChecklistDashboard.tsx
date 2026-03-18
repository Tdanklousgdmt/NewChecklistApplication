import { useState, useEffect } from "react";
import {
  ChevronRight,
  Plus,
  MoreVertical,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Copy,
  ScanLine,
  ChevronDown,
  List,
  FileEdit,
  Loader2,
  Bell,
} from "lucide-react";
import { CalendarView } from "./CalendarView";
import { checklistService } from "../services/checklistService";

// Status mapping
const STATUSES = [
  { id: "due", label: "Due", color: "bg-yellow-400", textColor: "text-yellow-600", borderColor: "border-yellow-200" },
  { id: "missed", label: "Missed", color: "bg-red-500", textColor: "text-red-600", borderColor: "border-red-200" },
  { id: "done", label: "Done", color: "bg-green-500", textColor: "text-green-600", borderColor: "border-green-200" },
  { id: "done_not_ok", label: "Done, Not OK", color: "bg-orange-500", textColor: "text-orange-600", borderColor: "border-orange-200" },
  { id: "pending", label: "Pending", color: "bg-amber-400", textColor: "text-amber-600", borderColor: "border-amber-200" },
  { id: "rejected", label: "Rejected", color: "bg-red-600", textColor: "text-red-600", borderColor: "border-red-200" },
  { id: "up_next", label: "Up Next", color: "bg-purple-400", textColor: "text-purple-600", borderColor: "border-purple-200" },
  { id: "cancelled", label: "Cancelled", color: "bg-blue-400", textColor: "text-blue-600", borderColor: "border-blue-200" },
  { id: "draft", label: "Draft", color: "bg-slate-400", textColor: "text-slate-600", borderColor: "border-slate-200" },
  { id: "active", label: "Active", color: "bg-teal-500", textColor: "text-teal-600", borderColor: "border-teal-200" },
] as const;

interface ChecklistInstance {
  id: string;
  title: string;
  location: string;
  status: string;
  statusText: string;
  dueDate: Date;
  priority?: string;
  category?: string;
  assignmentId?: string;
}

interface ChecklistDashboardProps {
  role: "user" | "manager";
  onCreateNew: () => void;
  onExecuteChecklist?: (checklistId: string, assignmentId?: string) => void;
  onValidateSubmission?: (submissionId: string) => void;
}

export function ChecklistDashboard({ role, onCreateNew, onExecuteChecklist, onValidateSubmission }: ChecklistDashboardProps) {
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");
  const [startDate, setStartDate] = useState("2025-09-18");
  const [endDate, setEndDate] = useState("2025-09-22");
  const [teamFilter, setTeamFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Group checklists by date
  const groupedChecklists = MOCK_CHECKLISTS.reduce((acc, checklist) => {
    const dateKey = checklist.dueDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(checklist);
    return acc;
  }, {} as Record<string, ChecklistInstance[]>);

  const getStatusConfig = (statusId: string) => {
    return STATUSES.find((s) => s.id === statusId) || STATUSES[0];
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2abaad]/20 focus:border-[#2abaad] transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#2abaad] tracking-wide uppercase text-xs font-medium">
            Checklist Master
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-700 tracking-wide uppercase text-xs">
            Dashboard
          </span>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#2abaad] text-white rounded-xl text-xs tracking-wide hover:bg-[#24a699] transition-colors duration-150 shadow-sm shadow-teal-100"
        >
          <Plus className="w-3.5 h-3.5" />
          Create New
        </button>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-6xl">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 px-6 py-5">
            {/* Title and Action Buttons */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-gray-800">Checklists</h1>
                <p className="text-sm text-gray-500 mt-1">Manage and track your daily checklists</p>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <ScanLine className="w-4 h-4" />
                Scan QR
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-0">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all relative ${
                  activeTab === "list"
                    ? "text-[#2abaad]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List className="w-4 h-4" />
                List View
                {activeTab === "list" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2abaad]"></div>
                )}
              </button>

              {role === "manager" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("calendar")}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all relative ${
                    activeTab === "calendar"
                      ? "text-[#2abaad]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Calendar
                  {activeTab === "calendar" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2abaad]"></div>
                  )}
                </button>
              )}
            </div>

            {/* Date Range - Only show in List View */}
            {activeTab === "list" && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Date Range</span>
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <span className="text-sm text-gray-400">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            )}

            {/* Filters Row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters</span>
              </div>

              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-[right_0.5rem_center] bg-no-repeat pr-8 cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundSize: "12px",
                }}
              >
                <option value="all">All Teams</option>
                <option value="team_a">Team A</option>
                <option value="team_b">Team B</option>
                <option value="team_c">Team C</option>
              </select>

              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-[right_0.5rem_center] bg-no-repeat pr-8 cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundSize: "12px",
                }}
              >
                <option value="all">All Frequencies</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="one_off">One Off</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-[right_0.5rem_center] bg-no-repeat pr-8 cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundSize: "12px",
                }}
              >
                <option value="all">All Categories</option>
                <option value="safety">Safety</option>
                <option value="quality">Quality</option>
                <option value="maintenance">Maintenance</option>
                <option value="compliance">Compliance</option>
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-[right_0.5rem_center] bg-no-repeat pr-8 cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundSize: "12px",
                }}
              >
                <option value="all">All Locations</option>
                <option value="building_a">Building A</option>
                <option value="building_b">Building B</option>
                <option value="warehouse">Warehouse</option>
              </select>

              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-[right_0.5rem_center] bg-no-repeat pr-8 cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundSize: "12px",
                }}
              >
                <option value="all">All Shifts</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
            </div>
          </div>

          {/* Status Legend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3.5 mb-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Legend:</span>
              {STATUSES.map((status) => (
                <div key={status.id} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
                  <span className="text-xs text-gray-600">{status.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar View */}
          {activeTab === "calendar" && <CalendarView />}

          {/* List View */}
          {activeTab === "list" && (
            <>
              {/* Checklist Cards */}
              <div className="space-y-8">
                {Object.entries(groupedChecklists).map(([dateLabel, checklists]) => {
                  const isToday = dateLabel.includes("September 22");
                  const isTomorrow = dateLabel.includes("September 23");
                  const displayDate = isToday
                    ? "Today — September 22, 2025"
                    : isTomorrow
                    ? "Tomorrow — September 23, 2025"
                    : dateLabel;

                  return (
                    <div key={dateLabel}>
                      <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-sm font-medium text-gray-700">{displayDate}</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
                      </div>

                      <div className="grid gap-4">
                        {checklists.map((checklist) => {
                          const statusConfig = getStatusConfig(checklist.status);
                          return (
                            <div
                              key={checklist.id}
                              className={`bg-white rounded-xl shadow-sm border-2 ${statusConfig.borderColor} overflow-hidden hover:shadow-md transition-all duration-200 group cursor-pointer`}
                            >
                              <div className="flex items-center gap-4 px-5 py-4">
                                {/* Status Badge */}
                                <div className="shrink-0">
                                  <div className={`w-2 h-2 rounded-full ${statusConfig.color}`}></div>
                                </div>

                                {/* Status Icon */}
                                <div className="shrink-0">
                                  {checklist.status === "done" && (
                                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                  )}
                                  {checklist.status === "missed" && (
                                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                                      <XCircle className="w-5 h-5 text-red-500" />
                                    </div>
                                  )}
                                  {checklist.status === "due" && (
                                    <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
                                      <Clock className="w-5 h-5 text-yellow-500" />
                                    </div>
                                  )}
                                  {checklist.status === "done_not_ok" && (
                                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                                      <AlertCircle className="w-5 h-5 text-orange-500" />
                                    </div>
                                  )}
                                  {checklist.status === "pending" && (
                                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                                      <Clock className="w-5 h-5 text-amber-500" />
                                    </div>
                                  )}
                                  {checklist.status === "rejected" && (
                                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                                      <XCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                  )}
                                  {checklist.status === "up_next" && (
                                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                                      <Calendar className="w-5 h-5 text-purple-500" />
                                    </div>
                                  )}
                                  {checklist.status === "cancelled" && (
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                      <XCircle className="w-5 h-5 text-blue-400" />
                                    </div>
                                  )}
                                  {checklist.status === "draft" && (
                                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                                      <FileEdit className="w-5 h-5 text-slate-500" />
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-medium text-gray-900 truncate">
                                    {checklist.title}
                                  </h3>
                                  <div className="flex items-center gap-3 mt-1">
                                    <p className="text-xs text-gray-500 truncate">
                                      {checklist.location}
                                    </p>
                                    <span className="text-gray-300">•</span>
                                    <span className={`text-xs ${statusConfig.textColor} font-medium`}>
                                      {checklist.statusText}
                                    </span>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  </button>
                                  <button
                                    type="button"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty State */}
              {Object.keys(groupedChecklists).length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Calendar className="w-10 h-10 text-[#2abaad]" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-2">No checklists found</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                    You haven't created any checklists yet. Get started by creating your first checklist.
                  </p>
                  <button
                    type="button"
                    onClick={onCreateNew}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#2abaad] text-white rounded-xl text-sm font-medium hover:bg-[#24a699] transition-colors shadow-md shadow-teal-100"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Checklist
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}