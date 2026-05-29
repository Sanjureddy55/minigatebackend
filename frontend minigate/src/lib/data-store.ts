import { useSyncExternalStore } from "react";
import { residents as seedResidents, type Resident } from "./mock-data";

type Listener = () => void;

function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set: (next: T | ((prev: T) => T)) => {
      state = typeof next === "function" ? (next as (p: T) => T)(state) : next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

function useStore<T>(s: { get: () => T; subscribe: (l: Listener) => () => void }) {
  return useSyncExternalStore(s.subscribe, s.get, s.get);
}

// ---------- Residents ----------
const residentsStore = createStore<Resident[]>([...seedResidents]);
export const useResidents = () => useStore(residentsStore);
export const addResident = (r: Omit<Resident, "id" | "joinedAt"> & Partial<Pick<Resident, "id" | "joinedAt">>) => {
  const id = r.id ?? `RES-${1000 + residentsStore.get().length + 1}`;
  const joinedAt = r.joinedAt ?? new Date().toISOString().slice(0, 10);
  residentsStore.set((prev) => [{ ...r, id, joinedAt } as Resident, ...prev]);
};

// ---------- Societies ----------
export interface Society {
  id: string;
  name: string;
  city: string;
  flats: number;
  plan: "Starter" | "Pro" | "Enterprise";
  status: "active" | "pending" | "suspended";
  adminEmail?: string;
}
const societiesStore = createStore<Society[]>([
  { id: "SOC-1", name: "Greenwood Heights", city: "Bengaluru", flats: 348, plan: "Enterprise", status: "active" },
  { id: "SOC-2", name: "Lakeview Towers", city: "Mumbai", flats: 512, plan: "Pro", status: "active" },
  { id: "SOC-3", name: "Skyline Residency", city: "Pune", flats: 280, plan: "Pro", status: "pending" },
  { id: "SOC-4", name: "Maple Grove", city: "Delhi", flats: 160, plan: "Starter", status: "active" },
]);
export const useSocieties = () => useStore(societiesStore);
export const addSociety = (s: Omit<Society, "id">) =>
  societiesStore.set((prev) => [{ ...s, id: `SOC-${prev.length + 1}` }, ...prev]);

// ---------- Roles & Permissions ----------
export const PERMISSION_MODULES = [
  "Residents", "Visitors", "Approvals", "Billing",
  "Security Alerts", "Settings", "Audit Logs", "Reports",
] as const;
export type PermissionModule = typeof PERMISSION_MODULES[number];

export interface RoleDef {
  id: string;
  name: string;
  description: string;
  users: number;
  permissions: Record<PermissionModule, boolean>;
}

const allPerms = (v: boolean) =>
  Object.fromEntries(PERMISSION_MODULES.map((m) => [m, v])) as Record<PermissionModule, boolean>;

const rolesStore = createStore<RoleDef[]>([
  { id: "ROLE-1", name: "Super Admin", description: "Full platform access", users: 2, permissions: allPerms(true) },
  { id: "ROLE-2", name: "Society Admin", description: "Manage one society end-to-end", users: 54,
    permissions: { ...allPerms(true), "Audit Logs": false } },
  { id: "ROLE-3", name: "Accountant", description: "Billing & payments", users: 38,
    permissions: { ...allPerms(false), Billing: true, Approvals: true, Reports: true } },
  { id: "ROLE-4", name: "Security Guard", description: "Gate operations", users: 312,
    permissions: { ...allPerms(false), Visitors: true, "Security Alerts": true } },
  { id: "ROLE-5", name: "Resident", description: "Self-service for residents", users: 17984,
    permissions: { ...allPerms(false), Visitors: true, Billing: true } },
]);
export const useRoles = () => useStore(rolesStore);
export const addRole = (r: Omit<RoleDef, "id" | "users">) =>
  rolesStore.set((prev) => [...prev, { ...r, id: `ROLE-${prev.length + 1}`, users: 0 }]);
export const updateRolePermission = (id: string, mod: PermissionModule, value: boolean) =>
  rolesStore.set((prev) => prev.map((r) => r.id === id ? { ...r, permissions: { ...r.permissions, [mod]: value } } : r));
export const deleteRole = (id: string) =>
  rolesStore.set((prev) => prev.filter((r) => r.id !== id));
