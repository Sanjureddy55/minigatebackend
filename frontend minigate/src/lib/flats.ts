import { useSyncExternalStore } from "react";

export interface Flat {
  id: string;
  label: string;
  building: string;
  flat: string;
  society: string;
}

const FLATS: Flat[] = [
  {
    id: "ALL",
    label: "All Properties",
    building: "",
    flat: "",
    society: "Greenwood Heights",
  },
  {
    id: "A-402",
    label: "Tower A · 402",
    building: "Tower A",
    flat: "402",
    society: "Greenwood Heights",
  },
  {
    id: "B-1201",
    label: "Tower B · 1201",
    building: "Tower B",
    flat: "1201",
    society: "Greenwood Heights",
  },
  {
    id: "LV-505",
    label: "Lakeview · 505",
    building: "Lakeview",
    flat: "505",
    society: "Lakeview Towers",
  },
];

type Listener = () => void;

const listeners = new Set<Listener>();

let current: Flat = FLATS[0];
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;

  try {
    const savedFlatId = localStorage.getItem("active_flat");
    const savedFlat = FLATS.find((flat) => flat.id === savedFlatId);

    if (savedFlat) {
      current = savedFlat;
      listeners.forEach((listener) => listener());
    }
  } catch {
    // Ignore localStorage errors.
  }
}

export const flatStore = {
  list() {
    return FLATS;
  },

  get() {
    hydrate();
    return current;
  },

  set(id: string) {
    const selectedFlat = FLATS.find((flat) => flat.id === id);

    if (!selectedFlat) {
      return;
    }

    current = selectedFlat;

    try {
      localStorage.setItem("active_flat", id);
    } catch {
      // Ignore localStorage errors.
    }

    listeners.forEach((listener) => listener());
  },

  isAllProperties() {
    hydrate();
    return current.id === "ALL";
  },
};

export function useActiveFlat() {
  return useSyncExternalStore(
    (listener) => {
      hydrate();
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    () => current,
    () => FLATS[0],
  );
}