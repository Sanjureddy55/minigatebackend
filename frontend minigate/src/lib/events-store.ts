import { useSyncExternalStore } from "react";

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: string; // ISO yyyy-mm-dd
  audience: string; // "All Residents" | "Tower A" etc.
  category: "event" | "fundraiser" | "notice" | "maintenance";
  fundraiser?: {
    target: number;
    raised: number;
    contributors: number;
    contributionAmount?: number;
  };
  postedAt: string; // human readable
  postedBy: string;
  read: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let events: CommunityEvent[] = [
  {
    id: "EVT-1001",
    title: "Vinayaka Chavithi celebrations",
    description:
      "Join us for the Ganesh Chaturthi puja at the community hall on 7th Sept. Decorations and prasad arrangements need contributions.",
    date: "2026-09-07",
    audience: "All Residents",
    category: "fundraiser",
    fundraiser: {
      target: 75000,
      raised: 22500,
      contributors: 38,
      contributionAmount: 500,
    },
    postedAt: "2 hr ago",
    postedBy: "Priya Sharma (Society Admin)",
    read: false,
  },
  {
    id: "EVT-1002",
    title: "Water tanker schedule revised",
    description:
      "Tankers will now arrive at 7 AM and 5 PM daily until further notice.",
    date: "2026-05-18",
    audience: "All Residents",
    category: "notice",
    postedAt: "Yesterday",
    postedBy: "Priya Sharma (Society Admin)",
    read: true,
  },
  {
    id: "EVT-1003",
    title: "Lift maintenance Tower B",
    description:
      "Lift #2 in Tower B will undergo annual servicing on Saturday 10 AM – 2 PM.",
    date: "2026-05-22",
    audience: "Tower B",
    category: "maintenance",
    postedAt: "3 days ago",
    postedBy: "Maintenance Team",
    read: true,
  },
];

function emit() {
  listeners.forEach((listener) => listener());
}

export const eventsStore = {
  get: () => events,

  add(e: Omit<CommunityEvent, "id" | "postedAt" | "read">) {
    const id = `EVT-${1000 + events.length + 1}`;

    events = [
      {
        ...e,
        id,
        postedAt: "just now",
        read: false,
      },
      ...events,
    ];

    emit();
    return id;
  },

  markAllRead() {
    events = events.map((eventItem) => ({
      ...eventItem,
      read: true,
    }));

    emit();
  },

  contribute(id: string, amount: number) {
    events = events.map((eventItem) =>
      eventItem.id === id && eventItem.fundraiser
        ? {
            ...eventItem,
            fundraiser: {
              ...eventItem.fundraiser,
              raised: eventItem.fundraiser.raised + amount,
              contributors: eventItem.fundraiser.contributors + 1,
            },
          }
        : eventItem,
    );

    emit();
  },

  remove(id: string) {
    events = events.filter((eventItem) => eventItem.id !== id);
    emit();
  },
};

export function useEvents() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    () => events,
    () => events,
  );
}

export function unreadEventCount() {
  return events.filter((eventItem) => !eventItem.read).length;
}