// Saare plans aur unki limits — ek jagah, taake badalna aasaan ho
export interface PlanLimits {
  maxBranches: number;   // -1 = unlimited
  maxUsers: number;
}

export const PLANS: Record<string, PlanLimits> = {
  free: {
    maxBranches: 1,
    maxUsers: 3,
  },
  basic: {
    maxBranches: 3,
    maxUsers: 10,
  },
  pro: {
    maxBranches: -1,  // unlimited
    maxUsers: -1,     // unlimited
  },
};

// Helper — kisi plan ki limits lao (agar plan galat ho to free default)
export function getPlanLimits(plan: string): PlanLimits {
  return PLANS[plan] ?? PLANS.free;
}