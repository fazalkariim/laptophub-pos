import type { Role } from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Wallet,
  BarChart3,
  Settings,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  allow: Role[];
}

const ALL: Role[] = ["SUPER_ADMIN", "BRANCH_MANAGER", "SALESMAN", "ACCOUNTANT"];

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    allow: ALL,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    allow: ["SUPER_ADMIN", "BRANCH_MANAGER"],
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    allow: ["SUPER_ADMIN", "BRANCH_MANAGER", "SALESMAN"],
  },
 
  {
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    allow: ["SUPER_ADMIN", "BRANCH_MANAGER", "ACCOUNTANT"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    allow: ["SUPER_ADMIN", "BRANCH_MANAGER"],
  },
  {
    label: "Users",
    href: "/settings/users",
    icon: Users,
    allow: ["SUPER_ADMIN"],
  },
  {
    label: "Branches",
    href: "/settings/branches",
    icon: Settings,
    allow: ["SUPER_ADMIN"],
  },
  {
    label: "Catalog",
    href: "/settings/catalog",
    icon: Package,
    allow: ["SUPER_ADMIN"],
  },
  {
    label: 'Bulk Intake',
    href: '/inventory/bulk-intake',
    icon: Package,
    allow: ['SUPER_ADMIN', 'BRANCH_MANAGER'],
  },
  {
    label: 'Expiring Warranties',
    href: '/customers/expiring-warranties',
    icon: Users,
    allow: ['SUPER_ADMIN', 'BRANCH_MANAGER'],
  },
  {
    label: 'Transfers',
    href: '/transfers',
    icon: Truck,
    allow: ['SUPER_ADMIN', 'BRANCH_MANAGER'],
  },
  {
    label: 'Consolidated Stock',
    href: '/transfers/consolidated-stock',
    icon: Truck,
    allow: ['SUPER_ADMIN'],
  },
  {
    label: 'Purchasing',
    href: '/purchasing/suppliers',
    icon: Truck,
    allow: ['SUPER_ADMIN'],
  },
  {
    label: 'Purchase Orders',
    href: '/purchasing/orders',
    icon: Truck,
    allow: ['SUPER_ADMIN'],
  },

];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.allow.includes(role));
}


