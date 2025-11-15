"use client";

import LogoutButton from "./LogoutButton";

export default function DashboardHeader({
  title,
}: {
  title: string;
}) {
  return (
    <header
      className="flex items-center justify-between bg-white shadow-sm px-4 py-3 rounded-lg mb-4"
      dir="rtl"
    >
      <h1 className="text-lg font-bold text-slate-800">{title}</h1>

      <LogoutButton />
    </header>
  );
}
