"use client";

import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/auth";

interface RoleGateProps {
  allow: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const user = useAuth((s) => s.user);
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}