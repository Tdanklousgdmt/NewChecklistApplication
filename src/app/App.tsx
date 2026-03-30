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
import { Toaster } from "sonner";
import { getAppRole, setAppRole, clearAppRole, type AppRole } from "./lib/appRole";
import { DEMO_USER_MANAGER, DEMO_USER_OPERATOR } from "./lib/demoUsers";

type AppView =
  | "dashboard"
  | "create"
  | "execute"
  | "validate"
  | "view"
  | "library"
  | "checklist-detail"
  | "reports";

export default function App() {
  const [role, setRole] = useState<AppRole | null>(() => getAppRole());
  const [view, setView] = useState<AppView>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeRedoSubmissionId, setActiveRedoSubmissionId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    const onRole = () => setRole(getAppRole());
    window.addEventListener("echeck-role-change", onRole);
    return () => window.removeEventListener("echeck-role-change", onRole);
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

  const notificationUserId = role === "manager" ? DEMO_USER_MANAGER : DEMO_USER_OPERATOR;

  const handleSelectRole = (r: AppRole) => {
    setAppRole(r);
    setRole(r);
    setView("dashboard");
    setActiveChecklistId(null);
    setActiveAssignmentId(null);
    setActiveRedoSubmissionId(null);
    setActiveSubmissionId(null);
  };

  if (!role) {
    return (
      <>
        <RoleSelection onSelectRole={handleSelectRole} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  const openNav = () => setNavOpen(true);

  const handleNavNavigate = (dest: "dashboard" | "library" | "create" | "reports") => {
    setActiveChecklistId(null);
    setActiveAssignmentId(null);
    setActiveRedoSubmissionId(null);
    setActiveSubmissionId(null);
    if (dest === "create") setView("create");
    else setView(dest);
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
      onSwitchRole={handleSwitchRole}
      onOpenScanner={() => setScannerOpen(true)}
    />
  );

  const qrScanner = scannerOpen && (
    <QRScannerModal onClose={() => setScannerOpen(false)} onResult={handleQRResult} />
  );

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
