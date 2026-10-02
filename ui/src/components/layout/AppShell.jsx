import { ClipboardList, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { initials } from "../../lib/utils";

export default function AppShell({ children }) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold tracking-tight">Flowboard</p>
              <p className="text-xs text-slate-400">Team task system</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.full_name}</p>
              <p className="flex items-center justify-end gap-1 text-xs text-slate-400">
                {user.is_staff && (
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-300" />
                )}
                {user.is_staff ? "Administrator" : "Team member"}
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-500 text-xs font-bold">
              {initials(user.full_name)}
            </span>
            <button
              onClick={signOut}
              title="Sign out"
              className="icon-button !text-slate-300 hover:!bg-slate-800 hover:!text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
