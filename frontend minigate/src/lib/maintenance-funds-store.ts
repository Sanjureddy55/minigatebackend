import { useSyncExternalStore } from "react";

export type ExpenseStatus = "draft" | "published";
export type ExpenseVisibility = "visible" | "hidden";

export interface MaintenanceExpense {
  id: string;
  title: string;
  category: string;
  description: string;
  amount: number;
  vendorName: string;
  paymentDate: string;
  paymentMode: string;
  invoiceNumber: string;
  area: string;
  proofFile: string;
  visibility: ExpenseVisibility;
  status: ExpenseStatus;
  publishedBy: string;
  publishedDate: string;
}

export interface MonthlyStatement {
  id: string;
  month: string;
  openingBalance: number;
  totalCollected: number;
  totalExpenses: number;
  remainingBalance: number;
  publishedDate: string;
  proofDocuments: string[];
}

type Listener = () => void;
const listeners = new Set<Listener>();

let expenses: MaintenanceExpense[] = [
  {
    id: "EXP-1001",
    title: "Security Staff Salary",
    category: "Security salary",
    description: "Monthly salary payment for security staff.",
    amount: 85000,
    vendorName: "SecureForce Agency",
    paymentDate: "2026-05-03",
    paymentMode: "Bank Transfer",
    invoiceNumber: "SEC-INV-0526",
    area: "All Buildings",
    proofFile: "security_salary_invoice.pdf",
    visibility: "visible",
    status: "published",
    publishedBy: "Priya Sharma",
    publishedDate: "2026-05-04",
  },
  {
    id: "EXP-1002",
    title: "Lift Maintenance",
    category: "Lift maintenance",
    description: "Routine lift service and inspection.",
    amount: 12000,
    vendorName: "Elevate Services",
    paymentDate: "2026-05-08",
    paymentMode: "UPI",
    invoiceNumber: "LFT-2221",
    area: "Tower A",
    proofFile: "lift_service_receipt.jpg",
    visibility: "visible",
    status: "published",
    publishedBy: "Priya Sharma",
    publishedDate: "2026-05-09",
  },
  {
    id: "EXP-1003",
    title: "Water Tanker",
    category: "Water tanker",
    description: "Emergency water tanker supply.",
    amount: 8500,
    vendorName: "Aqua Supply",
    paymentDate: "2026-05-10",
    paymentMode: "Cash",
    invoiceNumber: "AQUA-889",
    area: "Common Area",
    proofFile: "water_tanker_bill.pdf",
    visibility: "visible",
    status: "published",
    publishedBy: "Priya Sharma",
    publishedDate: "2026-05-10",
  },
  {
    id: "EXP-1004",
    title: "Common Area Electricity",
    category: "Common area electricity",
    description: "Electricity bill for lobby, parking and common lighting.",
    amount: 24000,
    vendorName: "Electricity Board",
    paymentDate: "2026-05-12",
    paymentMode: "Online",
    invoiceNumber: "EB-77891",
    area: "Common Area",
    proofFile: "electricity_bill.pdf",
    visibility: "visible",
    status: "published",
    publishedBy: "Priya Sharma",
    publishedDate: "2026-05-13",
  },
];

let statements: MonthlyStatement[] = [
  {
    id: "STM-0526",
    month: "May 2026",
    openingBalance: 0,
    totalCollected: 450000,
    totalExpenses: 278500,
    remainingBalance: 171500,
    publishedDate: "2026-05-18",
    proofDocuments: [
      "security_salary_invoice.pdf",
      "lift_service_receipt.jpg",
      "water_tanker_bill.pdf",
      "electricity_bill.pdf",
    ],
  },
];

function emit() {
  listeners.forEach((listener) => listener());
}

export const maintenanceStore = {
  getExpenses: () => expenses,
  getStatements: () => statements,

  addExpense(expense: Omit<MaintenanceExpense, "id" | "publishedBy" | "publishedDate">) {
    expenses = [
      {
        ...expense,
        id: `EXP-${1000 + expenses.length + 1}`,
        publishedBy: "Priya Sharma",
        publishedDate: "Not published",
      },
      ...expenses,
    ];
    emit();
  },

  publishExpense(id: string) {
    expenses = expenses.map((expense) =>
      expense.id === id
        ? {
            ...expense,
            status: "published",
            visibility: "visible",
            publishedBy: "Priya Sharma",
            publishedDate: new Date().toISOString().slice(0, 10),
          }
        : expense,
    );
    emit();
  },
};

export function useMaintenanceExpenses() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => expenses,
    () => expenses,
  );
}

export function useMonthlyStatements() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => statements,
    () => statements,
  );
}

export const maintenanceSummary = {
  myMaintenancePaid: 12500,
  totalCollected: 450000,
  totalExpenses: 278500,
  remainingBalance: 171500,
  pendingDues: 42000,
  thisMonthCollection: 450000,
  thisMonthExpenses: 278500,
};