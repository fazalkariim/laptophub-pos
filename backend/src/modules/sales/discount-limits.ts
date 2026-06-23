// Har role ka max discount percentage.
// null = unlimited (koi limit nahi).
// Baad mein badalna ho to bas yahan values change karein.
export const DISCOUNT_LIMITS: Record<string, number | null> = {
  SALESMAN: 5,        // max 5%
  BRANCH_MANAGER: 15, // max 15%
  SUPER_ADMIN: null,  // unlimited
};