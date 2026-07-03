"use client";

import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {(user.name ?? user.email).split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's what's happening in your workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cardsForRole(user.role).map((c) => (
          <div
            key={c.title}
            className="rounded-lg border p-4 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{c.title}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function cardsForRole(role: string) {
  const salesman = [
    { title: "Today's Sales", value: "—" },
    { title: "My Transactions", value: "—" },
  ];
  const manager = [
    ...salesman,
    { title: "Branch Stock Value", value: "—" },
    { title: "Low Stock Items", value: "—" },
  ];
  const admin = [
    { title: "Total Sales (All Branches)", value: "—" },
    { title: "Net Cash Position", value: "—" },
    { title: "Active Branches", value: "—" },
    { title: "Low Stock Items", value: "—" },
  ];
  const accountant = [
    { title: "Net Cash Position", value: "—" },
    { title: "Pending Payables", value: "—" },
    { title: "Expenses (This Month)", value: "—" },
  ];

  switch (role) {
    case "SUPER_ADMIN":
      return admin;
    case "BRANCH_MANAGER":
      return manager;
    case "ACCOUNTANT":
      return accountant;
    default:
      return salesman;
  }
}