"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { navForRole } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const user = useAuth((s) => s.user);
  const pathname = usePathname();

  if (!user) return null;

  const items = navForRole(user.role);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold">LaptopHub</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}