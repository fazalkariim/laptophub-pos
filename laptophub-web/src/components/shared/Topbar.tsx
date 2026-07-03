"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { RoleGate } from "@/components/shared/RoleGate";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  BRANCH_MANAGER: "Branch Manager",
  SALESMAN: "Salesman",
  ACCOUNTANT: "Accountant",
};

export function Topbar() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const router = useRouter();

  if (!user) return null;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <RoleGate allow={["SUPER_ADMIN"]}>
          {/* BranchPicker placeholder — real branch switching arrives in M5 */}
          <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
            All Branches
          </span>
        </RoleGate>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium leading-none">{user.name}</p>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[user.role] ?? user.role}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}