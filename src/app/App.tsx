import { useState, useEffect } from "react";
import { ChecklistDashboardReal } from "./components/ChecklistDashboardReal";
import { ChecklistLibrary } from "./components/ChecklistLibrary";
import { ChecklistDetail } from "./components/ChecklistDetail";
import { ReportsPage } from "./components/ReportsPage";
import { ChecklistCreator } from "./components/ChecklistCreator";
import { ChecklistExecution } from "./components/ChecklistExecution";
import { ValidationScreen } from "./components/ValidationScreen";
import { NavDrawer } from "./components/NavDrawer";
import { QRScannerModal } from "./components/QRScannerModal";
import { UserManagementScreen } from "./components/UserManagementScreen";
import { Toaster } from "sonner";
import { useAppSession } from "./context/AppSessionContext";
import { Loader2 } from "lucide-react";

type AppView =
  | "dashboard"
  | "create"
  | "execute"
  | "validate"
  | "view"
  | "library"
  | "checklist-detail"
  | "reports"
  | "users";

export default function App() {
  const { profile, loading, roster, org, refreshMe, sessionError } = useAppSession();
  const [view, setView] = useState<AppView>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeRedoSubmissionId, setActiveRedoSubmissionId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  const role = profile?.appRole ?? "user";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clId = params.get("checklist");
    if (clId) {
      window.history.replaceState({}, "", window.location.pathname);
      setActiveChecklistId(clId);
      setActiveAssignmentId(null);
      setActiveRedoSubmissionId(null);
      setView("execute");
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-[#2abaad] animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <p className="text-gray-700 text-center max-w-md font-medium">Could not load workspace</p>
        {sessionError ? (
          <p className="text-sm text-gray-600 text-center max-w-lg whitespace-pre-wrap">{sessionError}</p>
        ) : (
          <p className="text-sm text-gray-500 text-center max-w-md">Check your network and API URL.</p>
        )}
        <button
          type="button"
          onClick={() => void refreshMe()}
          className="px-4 py-2 rounded-xl bg-[#2abaad] text-white text-sm font-medium"
        >
          Retry
        </button>
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  const openNav = () => setNavOpen(true);

  const handleNavNavigate = (dest: "dashboard" | "library" | "create" | "reports" | "users") => {
    setActiveChecklistId(null);
    setActiveAssignmentId(null);
    setActiveRedoSubmissionId(null);
    setActiveSubmissionId(null);
    if (dest === "create") setView("create");
    else if (dest === "users") setView("users");
    else setView(dest);
  };

  const handleQRResult = (checklistId: string) => {
    setScannerOpen(false);
    setActiveChecklistId(checklistId);
    setActiveAssignmentId(null);
    setActiveRedoSubmissionId(null);
    setView("execute");
  };

  const managerRoster = roster.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    email: r.email,
    appRole: r.appRole,
  }));

  const assignRosterUsers = roster.map((r) => ({
    id: r.userId,
    name: r.displayName || r.email || r.userId,
  }));

  const assignTeamOptions = (org?.teams ?? []).map((t) => ({ id: t.id, name: t.name }));

  const navDrawer = (
    <NavDrawer
      open={navOpen}
      onClose={() => setNavOpen(false)}
      currentView={view}
      role={role}
      onNavigate={handleNavNavigate}
      onOpenScanner={() => setScannerOpen(true)}
    />
  );

  const qrScanner = scannerOpen && (
    <QRScannerModal onClose={() => setScannerOpen(false)} onResult={handleQRResult} />
  );

  if (view === "users") {
    return (
      <>
        {navDrawer}
        {qrScanner}
        <UserManagementScreen onOpenNav={openNav} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (view === "execute" && activeChecklistId) {
    return (
      <>
        {navDrawer}
        {qrScanner}
        <ChecklistExecution
          checklistId={activeChecklistId}
          assignmentId={activeAssignmentId || undefined}
          redoFromSubmissionId={activeRedoSubmissionId || undefined}
          onBack={() => {
            setView("dashboard");
            setActiveChecklistId(null);
            setActiveAssignmentId(null);
            setActiveRedoSubmissionId(null);
          }}
          onSubmitted={() => {
            setView("dashboard");
            setActiveChecklistId(null);
            setActiveAssignmentId(null);
            setActiveRedoSubmissionId(null);
          }}
          onOpenNav={openNav}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (view === "validate" && activeSubmissionId) {
    return (
      <>
        {navDrawer}
        {qrScanner}
        <ValidationScreen
          submissionId={activeSubmissionId}
          onBack={() => {
            setView("dashboard");
            setActiveSubmissionId(null);
          }}
          onValidated={() => {
            setView("dashboard");
            setActiveSubmissionId(null);
          }}
          onOpenNav={openNav}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (view === "create" || (view === "view" && activeChecklistId)) {
    return (
      <>
        {navDrawer}
        {qrScanner}
        <ChecklistCreator
          checklistId={view === "view" ? activeChecklistId! : undefined}
          onBack={() => {
            setView(view === "view" ? "library" : "dashboard");
            setActiveChecklistId(null);
          }}
          onOpenNav={openNav}
          managerRoster={managerRoster}
          assignRosterUsers={assignRosterUsers}
          assignTeamOptions={assignTeamOptions}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (view === "checklist-detail" && activeChecklistId) {
    return (
      <>
        {navDrawer}
        {qrScanner}
        <ChecklistDetail
          checklistId={activeChecklistId}
          onBack={() => {
            setView("library");
            setActiveChecklistId(null);
          }}
          onOpenNav={openNav}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (view === "reports") {
    return (
      <>
        {navDrawer}
        {qrScanner}
        <ReportsPage
          onOpenNav={openNav}
          onViewChecklist={(id) => {
            setActiveChecklistId(id);
            setView("checklist-detail");
          }}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (view === "library") {
    return (
      <>
        {navDrawer}
        {qrScanner}
        <ChecklistLibrary
          onCreateNew={() => setView("create")}
          onEditChecklist={(id) => {
            setActiveChecklistId(id);
            setView("view");
          }}
          onViewDetail={(id) => {
            setActiveChecklistId(id);
            setView("checklist-detail");
          }}
          onOpenNav={openNav}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      {navDrawer}
      {qrScanner}
      <ChecklistDashboardReal
        key={profile.userId}
        role={role}
        notificationUserId={profile.userId}
        onCreateNew={() => setView("create")}
        onExecuteChecklist={(checklistId, assignmentId, redoSubmissionId) => {
          setActiveChecklistId(checklistId);
          setActiveAssignmentId(assignmentId ?? null);
          setActiveRedoSubmissionId(redoSubmissionId ?? null);
          setView("execute");
        }}
        onViewChecklist={(checklistId) => {
          setActiveChecklistId(checklistId);
          setView("view");
        }}
        onValidateSubmission={(submissionId) => {
          setActiveSubmissionId(submissionId);
          setView("validate");
        }}
        onOpenLibrary={() => setView("library")}
        onOpenReports={() => setView("reports")}
        onOpenNav={openNav}
      />
      <Toaster position="top-right" richColors />
    </>
  );
}
