import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
type Listener = () => void;
const listeners = new Set<Listener>();
let theme: Theme = "light";
let hydrated = false;

function apply(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = (localStorage.getItem("theme") as Theme | null) ?? "light";
    theme = saved;
    apply(theme);
    listeners.forEach((l) => l());
  } catch {}
}

/* One-time: clear any OS-inherited dark preference so app starts light */
if (typeof window !== "undefined") {
  try {
    if (!localStorage.getItem("theme")) {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    }
  } catch {}
}

export const themeStore = {
  get: () => theme,
  toggle() {
    theme = theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", theme); } catch {}
    apply(theme);
    listeners.forEach((l) => l());
  },
};

export function useTheme() {
  return useSyncExternalStore(
    (l) => { hydrate(); listeners.add(l); return () => listeners.delete(l); },
    () => theme,
    () => "light" as Theme,
  );
}
