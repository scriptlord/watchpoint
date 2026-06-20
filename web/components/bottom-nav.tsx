"use client";

import Link from "next/link";
import { cn } from "./ui";

type Tab = "home" | "maintenance" | "visitors" | "people";

const ICONS: Record<Tab, React.ReactNode> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5" />
  ),
  maintenance: (
    <path d="m14.7 6.3 3 3M3 21l3.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L3 21Z" />
  ),
  visitors: (
    <path d="M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 21v-1a5 5 0 0 1 5-5h2M17 14l4 4m0-4-4 4" />
  ),
  people: (
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a3 3 0 1 0 0-6M3 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1m2-5h1a4 4 0 0 1 4 4v1" />
  ),
};

const TABS: { tab: Tab; href: string; label: string }[] = [
  { tab: "home", href: "/", label: "Home" },
  { tab: "maintenance", href: "/maintenance", label: "Maintenance" },
  { tab: "visitors", href: "/visitors", label: "Visitors" },
  { tab: "people", href: "/people", label: "People" },
];

export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-cream/95 px-6 pb-7 pt-2.5 backdrop-blur">
      <ul className="flex items-stretch justify-between">
        {TABS.map(({ tab, href, label }) => {
          const on = tab === active;
          return (
            <li key={tab}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-0.5",
                  on ? "text-forest" : "text-muted"
                )}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={on ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[tab]}
                </svg>
                <span className={cn("text-[11px]", on ? "font-bold" : "font-semibold")}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
