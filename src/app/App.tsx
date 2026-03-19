import { useState, useEffect } from "react";
import { ChecklistDashboardReal } from "./components/ChecklistDashboardReal";
import { ChecklistLibrary } from "./components/ChecklistLibrary";
import { ChecklistDetail } from "./components/ChecklistDetail";
import { RoleSelection } from "./components/RoleSelection";
import { ChecklistCreator } from "./components/ChecklistCreator";
import { ChecklistExecution } from "./components/ChecklistExecution";
import { ValidationScreen } from "./components/ValidationScreen";
import { Toaster } from "sonner";

export default function App() {
  const [role, setRole] = useState<"user" | "manager" | null>(null);
  const [view, setView] = useState<"dashboard" | "create" | "execute" | "validate" | "view" | "library" | "checklist-detail">("dashboard");

  // Navigation state
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  // Persist role selection
  useEffect(() => {
    const savedRole = localStorage.getItem('echeck_user_role') as "user" | "manager" | null;
    if (savedRole) setRole(savedRole);
  }, []);

  useEffect(() => {
    if (role) localStorage.setItem('echeck_user_role', role);
  }, [role]);

  // Role selection screen
  if (role === null) {
    return (
      <>
        <RoleSelection onSelectRole={setRole} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Execute checklist
  if (view === "execute" && activeChecklistId) {
    return (
      <>
        <ChecklistExecution
          checklistId={activeChecklistId}
          assignmentId={activeAssignmentId || undefined}
          onBack={() => {
            setView("dashboard");
            setActiveChecklistId(null);
            setActiveAssignmentId(null);
          }}
          onSubmitted={() => {
            setView("dashboard");
            setActiveChecklistId(null);
            setActiveAssignmentId(null);
          }}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Validate submission
  if (view === "validate" && activeSubmissionId) {
    return (
      <>
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
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // View/edit checklist
  if (view === "view" && activeChecklistId) {
    return (
      <>
        <ChecklistCreator
          checklistId={activeChecklistId}
          onBack={() => {
            setView("library");
            setActiveChecklistId(null);
          }}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Create checklist flow
  if (view === "create") {
    return (
      <>
        <ChecklistCreator onBack={() => setView("dashboard")} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Checklist detail page
  if (view === "checklist-detail" && activeChecklistId) {
    return (
      <>
        <ChecklistDetail
          checklistId={activeChecklistId}
          onBack={() => {
            setView("library");
            setActiveChecklistId(null);
          }}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Library page
  if (view === "library") {
    return (
      <>
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
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Dashboard view
  return (
    <>
      <ChecklistDashboardReal
        role={role}
        onCreateNew={() => setView("create")}
        onExecuteChecklist={(checklistId, assignmentId) => {
          setActiveChecklistId(checklistId);
          setActiveAssignmentId(assignmentId || null);
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
      />
      <Toaster position="top-right" richColors />
    </>
  );
}
