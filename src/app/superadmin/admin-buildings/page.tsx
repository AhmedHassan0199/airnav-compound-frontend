"use client";

import { useEffect, useState } from "react";
import {
  superadminGetAdminsWithBuildings,
  superadminGetBuildings,
  superadminAssignBuildingToAdmin,
  superadminRemoveBuildingFromAdmin,
} from "@/lib/api";
import { useRequireAuth, getAccessToken } from "@/lib/auth";

type AdminWithBuildings = {
  id: number;
  username: string;
  role: string;
  full_name: string;
  buildings: string[];
};

type State = "idle" | "loading" | "error";

export default function AdminBuildingsPage() {
  // Protect route: only SUPERADMIN can access
  const { user, loading: authLoading } = useRequireAuth(["SUPERADMIN"]);

  const [admins, setAdmins] = useState<AdminWithBuildings[]>([]);
  const [buildings, setBuildings] = useState<string[]>([]);
  const [selectedForAdmin, setSelectedForAdmin] = useState<
    Record<number, string>
  >({});
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setState("loading");
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const [adminsData, buildingsData] = await Promise.all([
        superadminGetAdminsWithBuildings(token),
        superadminGetBuildings(token),
      ]);

      setAdmins(adminsData);
      setBuildings(buildingsData);
      setState("idle");
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
      setState("error");
    }
  }

  useEffect(() => {
    if (!authLoading) {
      // only start loading once we know auth is resolved
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const handleAssign = async (admin: AdminWithBuildings) => {
    const building = selectedForAdmin[admin.id];
    if (!building) return;

    try {
      setState("loading");
      setError(null);
      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");

      await superadminAssignBuildingToAdmin(token, admin.id, building);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to assign building");
      setState("error");
    }
  };

  const handleRemove = async (admin: AdminWithBuildings, building: string) => {
    if (!confirm(`Remove building ${building} from ${admin.full_name}?`)) return;

    try {
      setState("loading");
      setError(null);
      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");

      await superadminRemoveBuildingFromAdmin(token, admin.id, building);
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to remove building");
      setState("error");
    }
  };

  if (authLoading) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-gray-500">Checking permissions...</p>
      </div>
    );
  }

  if (!user) {
    // useRequireAuth already redirected, but just in case
    return null;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">
          Admin Building Assignments
        </h1>
        <p className="text-sm text-gray-600">
          As SuperAdmin, you can control which buildings each admin is
          responsible for. Restrictions are already enforced on residents,
          invoices, and collections.
        </p>
      </div>

      {state === "loading" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
          Loading...
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {admins.length === 0 ? (
        <p className="text-sm text-gray-500">
          No admins found. Create admins first.
        </p>
      ) : (
        <div className="space-y-4">
          {admins.map((admin) => {
            const availableForThisAdmin = buildings.filter(
              (b) => !admin.buildings.includes(b)
            );

            return (
              <div
                key={admin.id}
                className="border rounded-lg p-3 md:p-4 bg-white shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
                  <div>
                    <div className="font-semibold">
                      {admin.full_name}{" "}
                      <span className="text-xs text-gray-500">
                        ({admin.username})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Role: {admin.role}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-semibold text-gray-600">
                      Buildings:
                    </span>
                    {admin.buildings.length === 0 && (
                      <span className="text-xs text-gray-400">
                        No buildings assigned yet
                      </span>
                    )}
                    {admin.buildings.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs"
                      >
                        <span>{b}</span>
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemove(admin, b)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-col md:flex-row gap-2 md:items-center">
                  <select
                    className="border rounded-md px-2 py-1 text-sm"
                    value={selectedForAdmin[admin.id] || ""}
                    onChange={(e) =>
                      setSelectedForAdmin((prev) => ({
                        ...prev,
                        [admin.id]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select building to assign...</option>
                    {availableForThisAdmin.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssign(admin)}
                    disabled={
                      !selectedForAdmin[admin.id] || state === "loading"
                    }
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Assign Building
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
