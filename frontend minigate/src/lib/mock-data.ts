// Mock data store for the SaaS app
export type Status = "active" | "pending" | "approved" | "rejected" | "in_review" | "expired" | "checked_in" | "checked_out";

export interface Resident {
  id: string;
  name: string;
  flat: string;
  building: string;
  phone: string;
  email: string;
  type: "owner" | "tenant";
  family: number;
  vehicles: number;
  status: "active" | "pending";
  joinedAt: string;
}

export interface Visitor {
  id: string;
  name: string;
  purpose: string;
  host: string;
  flat: string;
  phone: string;
  type: "guest" | "delivery" | "cab" | "service";
  checkIn: string;
  checkOut?: string;
  status: "checked_in" | "checked_out" | "pending" | "approved" | "rejected";
  vehicle?: string;
}

export interface Approval {
  id: string;
  title: string;
  category: "resident" | "visitor" | "vendor" | "vehicle" | "tenant";
  requester: string;
  flat: string;
  stage: "Initial Review" | "Society Admin" | "Final Approval";
  priority: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "in_review";
  createdAt: string;
  progress: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "alert";
  time: string;
  read: boolean;
  flat: string;
  society: string;
}

export const society = {
  name: "Greenwood Heights",
  city: "Bengaluru",
  buildings: 6,
  flats: 348,
  residents: 824,
};

export const kpis = [
  { label: "Active Residents", value: 824, delta: 4.2, icon: "users" },
  { label: "Today's Visitors", value: 142, delta: 12.6, icon: "user-check" },
  { label: "Pending Approvals", value: 18, delta: -8.1, icon: "clipboard-check" },
  { label: "Security Alerts", value: 3, delta: -2.0, icon: "shield-alert" },
];

const firstNames = ["Aarav","Vivaan","Aditya","Ishaan","Reyansh","Krishna","Sai","Arjun","Rohan","Kabir","Ananya","Diya","Saanvi","Aadhya","Myra","Anika","Pari","Aarohi","Navya","Kiara"];
const lastNames = ["Sharma","Verma","Kumar","Patel","Reddy","Iyer","Nair","Khan","Singh","Gupta","Mehta","Joshi","Rao","Bose","Das"];
const buildings = ["Tower A","Tower B","Tower C","Block D","Block E","Block F"];

const rng = (seed: number) => {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
};
const r = rng(7);
const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];

export const residents: Resident[] = Array.from({ length: 36 }, (_, i) => ({
  id: `RES-${1000 + i}`,
  name: `${pick(firstNames)} ${pick(lastNames)}`,
  flat: `${100 + Math.floor(r() * 800)}`,
  building: pick(buildings),
  phone: `+91 9${Math.floor(100000000 + r() * 899999999)}`,
  email: `user${i}@greenwood.io`,
  type: r() > 0.3 ? "owner" : "tenant",
  family: Math.floor(r() * 5) + 1,
  vehicles: Math.floor(r() * 3),
  status: r() > 0.15 ? "active" : "pending",
  joinedAt: `2024-${String(Math.floor(r() * 12) + 1).padStart(2, "0")}-${String(Math.floor(r() * 28) + 1).padStart(2, "0")}`,
}));

const purposes = ["Personal Visit","Amazon Delivery","Swiggy Order","Plumber","Electrician","Uber Pickup","House Help","Cousin Visit","Zomato","Carpenter"];
export const visitors: Visitor[] = Array.from({ length: 28 }, (_, i) => {
  const types: Visitor["type"][] = ["guest","delivery","cab","service"];
  const t = types[Math.floor(r() * 4)];
  const statuses: Visitor["status"][] = ["checked_in","checked_out","pending","approved"];
  const s = statuses[Math.floor(r() * 4)];
  const h = String(Math.floor(r() * 14) + 8).padStart(2, "0");
  const m = String(Math.floor(r() * 60)).padStart(2, "0");
  return {
    id: `VIS-${2000 + i}`,
    name: `${pick(firstNames)} ${pick(lastNames)}`,
    purpose: pick(purposes),
    host: `${pick(firstNames)} ${pick(lastNames)}`,
    flat: `${pick(buildings)} - ${100 + Math.floor(r() * 800)}`,
    phone: `+91 9${Math.floor(100000000 + r() * 899999999)}`,
    type: t,
    checkIn: `${h}:${m}`,
    checkOut: s === "checked_out" ? `${String(+h + 1).padStart(2, "0")}:${m}` : undefined,
    status: s,
    vehicle: r() > 0.6 ? `KA-0${Math.floor(r() * 9)}-${String.fromCharCode(65 + Math.floor(r()*26))}${String.fromCharCode(65 + Math.floor(r()*26))}-${1000 + Math.floor(r()*8999)}` : undefined,
  };
});

const apprTitles = [
  "New Tenant Onboarding","Vehicle Registration","Pet Registration","Move-in Request",
  "Vendor Access Request","Renovation Approval","Guest Stay Extension","Parking Allocation",
  "Domestic Help Verification","Family Member Addition"
];
export const approvals: Approval[] = Array.from({ length: 14 }, (_, i) => {
  const cats: Approval["category"][] = ["resident","visitor","vendor","vehicle","tenant"];
  const stages: Approval["stage"][] = ["Initial Review","Society Admin","Final Approval"];
  const prios: Approval["priority"][] = ["low","medium","high"];
  const statuses: Approval["status"][] = ["pending","in_review","approved","rejected"];
  return {
    id: `APR-${3000 + i}`,
    title: apprTitles[i % apprTitles.length],
    category: cats[Math.floor(r() * cats.length)],
    requester: `${pick(firstNames)} ${pick(lastNames)}`,
    flat: `${pick(buildings)} - ${100 + Math.floor(r() * 800)}`,
    stage: stages[Math.floor(r() * 3)],
    priority: prios[Math.floor(r() * 3)],
    status: statuses[Math.floor(r() * 4)],
    createdAt: `2026-05-${String(Math.floor(r() * 14) + 1).padStart(2, "0")}`,
    progress: Math.floor(r() * 100),
  };
});

export const notifications: Notification[] = [
  {
    id: "n1",
    title: "New visitor at gate",
    message: "Rahul Kumar requesting entry for Flat A-402",
    type: "info",
    time: "2m ago",
    read: false,
    flat: "A-402",
    society: "Greenwood Heights",
  },
  {
    id: "n2",
    title: "Approval pending",
    message: "Vendor access request needs your review for Flat B-1201",
    type: "warning",
    time: "12m ago",
    read: false,
    flat: "B-1201",
    society: "Greenwood Heights",
  },
  {
    id: "n3",
    title: "Security alert",
    message: "Unauthorized vehicle attempted entry at Gate 2",
    type: "alert",
    time: "1h ago",
    read: false,
    flat: "ALL",
    society: "Greenwood Heights",
  },
  {
    id: "n4",
    title: "Maintenance paid",
    message: "Flat LV-505 cleared dues of ₹12,500",
    type: "success",
    time: "3h ago",
    read: true,
    flat: "LV-505",
    society: "Lakeview Towers",
  },
  {
    id: "n5",
    title: "Move-in scheduled",
    message: "New resident Asha Iyer scheduled for Tower A · 402 tomorrow",
    type: "info",
    time: "5h ago",
    read: true,
    flat: "A-402",
    society: "Greenwood Heights",
  },
];

export const visitorTrend = Array.from({ length: 7 }, (_, i) => ({
  day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
  guests: 40 + Math.floor(r() * 60),
  deliveries: 60 + Math.floor(r() * 80),
  services: 10 + Math.floor(r() * 30),
}));

export const recentActivity = [
  { id: "a1", actor: "Guard - Gate 1", action: "checked in visitor", target: "Rahul Kumar → A-402", time: "2 min ago" },
  { id: "a2", actor: "Admin - Priya", action: "approved", target: "Tenant onboarding for B-101", time: "15 min ago" },
  { id: "a3", actor: "Resident - Aarav", action: "added family member", target: "Diya Sharma", time: "1 hr ago" },
  { id: "a4", actor: "System", action: "raised alert", target: "Unauthorized vehicle KA-05-AB-1234", time: "1 hr ago" },
  { id: "a5", actor: "Accountant", action: "generated invoice", target: "May 2026 maintenance", time: "3 hr ago" },
  { id: "a6", actor: "Guard - Gate 2", action: "checked out", target: "Swiggy delivery → C-302", time: "4 hr ago" },
];

export const roles = [
  { name: "Super Admin", users: 2, perms: 24 },
  { name: "Society Admin", users: 4, perms: 18 },
  { name: "Accountant", users: 3, perms: 9 },
  { name: "Security Guard", users: 12, perms: 6 },
  { name: "Resident", users: 824, perms: 4 },
];

export const permissionMatrix = [
  { module: "Residents", admin: true, society: true, accountant: false, guard: false, resident: false },
  { module: "Visitors", admin: true, society: true, accountant: false, guard: true, resident: true },
  { module: "Approvals", admin: true, society: true, accountant: true, guard: false, resident: false },
  { module: "Billing", admin: true, society: true, accountant: true, guard: false, resident: true },
  { module: "Security Alerts", admin: true, society: true, accountant: false, guard: true, resident: false },
  { module: "Settings", admin: true, society: true, accountant: false, guard: false, resident: false },
  { module: "Audit Logs", admin: true, society: false, accountant: false, guard: false, resident: false },
];
