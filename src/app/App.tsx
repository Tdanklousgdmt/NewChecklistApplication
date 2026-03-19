import { useState, useEffect } from "react";
import { ChecklistDashboardReal } from "./components/ChecklistDashboardReal";
import { ChecklistLibrary } from "./components/ChecklistLibrary";
import { ChecklistDetail } from "./components/ChecklistDetail";
import { RoleSelection } from "./components/RoleSelection";
import { ChecklistCreator } from "./components/ChecklistCreator";
import { ChecklistExecution } from "./components/ChecklistExecution";
import { ValidationScreen } from "./components/ValidationScreen";
import { NavDrawer } from "./components/NavDrawer";
import { Toaster } from "sonner";

type AppView = "dashboard" | "create" | "execute" | "validate" | "view" | "library" | "checklist-detail";

export default function App() {
  const [role, setRole] = useState<"user" | "manager" | null>(null);
  const [view, setView] = useState<AppView>("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  // Navigation state
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  // Persist role selection
  useEffect(() => {
    const savedRole = localStorage.getItem("echeck_user_role") as "user" | "manager" | null;
    if (savedRole) setRole(savedRole);
  }, []);

  useEffect(() => {
    if (role) localStorage.setItem("echeck_user_role", role);
  }, [role]);

  // Global navigate handler used by the NavDrawer
  const handleNavNavigate = (dest: "dashboard" | "library" | "create") => {
    setActiveChecklistId(null);
    setActiveAssignmentId(null);
    setActiveSubmissionId(null);
    if (dest === "create") {
      setView("create");
    } else {
      setView(dest);
    }
  };

  // Role selection screen — no nav
  if (role === null) {
    return (
      <>
        <RoleSelection onSelectRole={setRole} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Execute checklist — full-screen flow, no nav
  if (view === "execute" && activeChecklistId) {
    return (
      <>
        <ChecklistExecution
          checklistId={activeChecklistId}
          assignmentId={activeAssignmentId || undefined}
          onBack={() => { setView("dashboard"); setActiveChecklistId(null); setActiveAssignmentId(null); }}
          onSubmitted={() => { setView("dashboard"); setActiveChecklistId(null); setActiveAssignmentId(null); }}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Validate submission — full-screen flow, no nav
  if (view === "validate" && activeSubmissionId) {
    return (
      <>
        <ValidationScreen
          submissionId={activeSubmissionId}
          onBack={() => { setView("dashboard"); setActiveSubmissionId(null); }}
          onValidated={() => { setView("dashboard"); setActiveSubmissionId(null); }}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Create / edit checklist — focused flow, no nav
  if (view === "create" || (view === "view" && activeChecklistId)) {
    return (
      <>
        <ChecklistCreator
          checklistId={view === "view" ? activeChecklistId! : undefined}
          onBack={() => {
            setView(view === "view" ? "library" : "dashboard");
            setActiveChecklistId(null);
          }}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // ── Main navigable views — all share the NavDrawer ──

  const navDrawer = (
    <NavDrawer
      open={navOpen}
      onClose={() => setNavOpen(false)}
      currentView={view}
      role={role}
      onNavigate={handleNavNavigate}
      onSwitchRole={() => {
        localStorage.removeItem("echeck_user_role");
        setRole(null);
        setView("dashboard");
      }}
    />
  );

  // Checklist detail page
  if (view === "checklist-detail" && activeChecklistId) {
    return (
      <>
        {navDrawer}
        <ChecklistDetail
          checklistId={activeChecklistId}
          onBack={() => { setView("library"); setActiveChecklistId(null); }}
          onOpenNav={() => setNavOpen(true)}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Library page
  if (view === "library") {
    return (
      <>
        {navDrawer}
        <ChecklistLibrary
          onCreateNew={() => setView("create")}
          onEditChecklist={(id) => { setActiveChecklistId(id); setView("view"); }}
          onViewDetail={(id) => { setActiveChecklistId(id); setView("checklist-detail"); }}
          onOpenNav={() => setNavOpen(true)}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Dashboard view (default)
  return (
    <>
      {navDrawer}
      <ChecklistDashboardReal
        role={role}
        onCreateNew={() => setView("create")}
        onExecuteChecklist={(checklistId, assignmentId) => {
          setActiveChecklistId(checklistId);
          setActiveAssignmentId(assignmentId || null);
          setView("execute");
        }}
        onViewChecklist={(checklistId) => { setActiveChecklistId(checklistId); setView("view"); }}
        onValidateSubmission={(submissionId) => { setActiveSubmissionId(submissionId); setView("validate"); }}
        onOpenLibrary={() => setView("library")}
        onOpenNav={() => setNavOpen(true)}
      />
      <Toaster position="top-right" richColors />
    </>
  );
}
