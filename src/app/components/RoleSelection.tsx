import { User, Shield } from "lucide-react";

interface RoleSelectionProps {
  onSelectRole: (role: "user" | "manager") => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-gray-800 mb-3">
            Welcome to Checklist Master
          </h1>
          <p className="text-gray-500">
            Select your role to continue
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* User/Operator Role */}
          <button
            type="button"
            onClick={() => onSelectRole("user")}
            className="group bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-8 hover:border-[#2abaad] hover:shadow-lg transition-all duration-200"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
              <User className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              User / Operator
            </h2>
            <p className="text-sm text-gray-500">
              View and complete assigned checklists
            </p>
          </button>

          {/* Manager Role */}
          <button
            type="button"
            onClick={() => onSelectRole("manager")}
            className="group bg-white rounded-2xl shadow-sm border-2 border-gray-100 p-8 hover:border-[#2abaad] hover:shadow-lg transition-all duration-200"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
              <Shield className="w-8 h-8 text-[#2abaad]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Manager
            </h2>
            <p className="text-sm text-gray-500">
              Full access with calendar view and analytics
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
