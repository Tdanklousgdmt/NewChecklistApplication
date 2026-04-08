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
import { RoleSelection } from "./components/RoleSelection";
import { UserManagementScreen } from "./components/UserManagementScreen";
import { Toaster } from "sonner";
import { getStoredAppRole, setAppRole, clearAppRole, type AppRole } from "./lib/appRole";
import { DEMO_MANAGER_USER_ID, DEMO_OPERATOR_USER_ID } from "./lib/demoWorkspaceIds";
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
  const [role, setRole] = useState<AppRole | null>(() => getStoredAppRole());
  const [view, setView] = useState<AppView>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeRedoSubmissionId, setActiveRedoSubmissionId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    const onChange = () => setRole(getStoredAppRole());
    window.addEventListener("echeck-role-change", onChange);
    return () => window.removeEventListener("echeck-role-change", onChange);
  }, []);

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

  const handleSelectRole = (r: AppRole) => {
    setAppRole(r);
    setRole(r);
    setView("dashboard");
    setActiveChecklistId(null);
    setActiveAssignmentId(null);
    setActiveRedoSubmissionId(null);
    setActiveSubmissionId(null);
  };

  const handleSwitchRole = () => {
    clearAppRole();
    setRole(null);
    setView("dashboard");
    setActiveChecklistId(null);
    setActiveAssignmentId(null);
    setActiveRedoSubmissionId(null);
    setActiveSubmissionId(null);
  };

  if (role === null) {
    return (
      <>
        <RoleSelection onSelectRole={handleSelectRole} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  const notificationUserId = role === "manager" ? DEMO_MANAGER_USER_ID : DEMO_OPERATOR_USER_ID;

  const managerRoster = [
    {
      userId: DEMO_MANAGER_USER_ID,
      displayName: "Guest (Manager)",
      email: "anonymous@local",
      appRole: "manager" as const,
    },
    {
      userId: DEMO_OPERATOR_USER_ID,
      displayName: "Operator",
      email: "operator@local",
      appRole: "user" as const,
    },
  ];

  const assignRosterUsers = [
    { id: DEMO_OPERATOR_USER_ID, name: "Operator" },
    { id: DEMO_MANAGER_USER_ID, name: "Guest (Manager)" },
  ];

  const assignTeamOptions = [
    { id: "TM_SAFETY", name: "Safety Team" },
    { id: "TM_MAINT", name: "Maintenance Team" },
    { id: "TM_OPS", name: "Operations Team" },
  ];

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

  const navDrawer = (
    <NavDrawer
      open={navOpen}
      onClose={() => setNavOpen(false)}
      currentView={view}
      role={role}
      onNavigate={handleNavNavigate}
      onSignOut={handleSwitchRole}
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
        <UserManagementScreen onOpenNav={openNav} appRole={role} />
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
        key={notificationUserId}
        role={role}
        notificationUserId={notificationUserId}
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
