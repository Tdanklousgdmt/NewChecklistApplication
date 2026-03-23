import { useState, useEffect } from "react";
import { ChecklistDashboardReal } from "./components/ChecklistDashboardReal";
import { ChecklistLibrary } from "./components/ChecklistLibrary";
import { ChecklistDetail } from "./components/ChecklistDetail";
import { ReportsPage } from "./components/ReportsPage";
import { RoleSelection } from "./components/RoleSelection";
import { ChecklistCreator } from "./components/ChecklistCreator";
import { ChecklistExecution } from "./components/ChecklistExecution";
import { ValidationScreen } from "./components/ValidationScreen";
import { NavDrawer } from "./components/NavDrawer";
import { QRScannerModal } from "./components/QRScannerModal";
import { Toaster } from "sonner";

type AppView = "dashboard" | "create" | "execute" | "validate" | "view" | "library" | "checklist-detail" | "reports";

export default function App() {
  const [role, setRole] = useState<"user" | "manager" | null>(null);
  const [view, setView] = useState<AppView>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeRedoSubmissionId, setActiveRedoSubmissionId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem("echeck_user_role") as "user" | "manager" | null;
    if (savedRole) setRole(savedRole);
  }, []);

  // Handle QR code deep-link: ?checklist=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clId   = params.get("checklist");
    if (clId) {
      // Clean the URL without a page reload
      window.history.replaceState({}, "", window.location.pathname);
      setActiveChecklistId(clId);
      setActiveAssignmentId(null);
      setActiveRedoSubmissionId(null);
      setView("execute");
    }
  }, []);

  useEffect(() => {
    if (role) localStorage.setItem("echeck_user_role", role);
  }, [role]);

  // Role selection — no nav
  if (role === null) {
    return (
      <>
        <RoleSelection onSelectRole={setRole} />
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
    setView(dest === "create" ? "create" : dest);
  };

  const handleSwitchRole = () => {
    localStorage.removeItem("echeck_user_role");
    setRole(null);
    setView("dashboard");
  };

  const handleQRResult = (checklistId: string) => {
    setScannerOpen(false);
    setActiveChecklistId(checklistId);
    setActiveAssignmentId(null);
    setActiveRedoSubmissionId(null);
    setView("execute");
  };

  // Global nav drawer + QR scanner modal — always rendered once role is chosen
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
          onBack={() => { setView("dashboard"); setActiveChecklistId(null); setActiveAssignmentId(null); setActiveRedoSubmissionId(null); }}
          onSubmitted={() => { setView("dashboard"); setActiveChecklistId(null); setActiveAssignmentId(null); setActiveRedoSubmissionId(null); }}
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
          onBack={() => { setView("dashboard"); setActiveSubmissionId(null); }}
          onValidated={() => { setView("dashboard"); setActiveSubmissionId(null); }}
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
          onBack={() => { setView(view === "view" ? "library" : "dashboard"); setActiveChecklistId(null); }}
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
          onBack={() => { setView("library"); setActiveChecklistId(null); }}
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
          onViewChecklist={(id) => { setActiveChecklistId(id); setView("checklist-detail"); }}
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
          onEditChecklist={(id) => { setActiveChecklistId(id); setView("view"); }}
          onViewDetail={(id) => { setActiveChecklistId(id); setView("checklist-detail"); }}
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
        role={role}
        onCreateNew={() => setView("create")}
        onExecuteChecklist={(checklistId, assignmentId, redoSubmissionId) => {
          setActiveChecklistId(checklistId);
          setActiveAssignmentId(assignmentId ?? null);
          setActiveRedoSubmissionId(redoSubmissionId ?? null);
          setView("execute");
        }}
        onViewChecklist={(checklistId) => { setActiveChecklistId(checklistId); setView("view"); }}
        onValidateSubmission={(submissionId) => { setActiveSubmissionId(submissionId); setView("validate"); }}
        onOpenLibrary={() => setView("library")}
        onOpenReports={() => setView("reports")}
        onOpenNav={openNav}
      />
      <Toaster position="top-right" richColors />
    </>
  );
}
