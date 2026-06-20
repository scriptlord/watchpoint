"use client";

import { Fragment } from "react";
import type { EscalationEvent } from "@/lib/types";
import { cn } from "./ui";

const STEPS = [
  { level: 1, label: "Residents" },
  { level: 2, label: "Security" },
  { level: 3, label: "Manager" },
  { level: 4, label: "Agency" },
];

export function EscalationLadder({ events }: { events: EscalationEvent[] }) {
  const done = new Set(events.map((e) => e.level).filter((l) => l <= 3));
  const maxDone = Math.max(0, ...[...done]);

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-[11px] font-bold tracking-wide text-muted">ESCALATION</p>

      <div className="mt-3 flex items-center">
        {STEPS.map((s, i) => {
          const isOff = s.level === 4;
          const isDone = done.has(s.level);
          const isCurrent = !isDone && !isOff && s.level === maxDone + 1;
          return (
            <Fragment key={s.level}>
              <span
                className={cn(
                  "h-6 w-6 shrink-0 rounded-full",
                  isDone && "bg-forest",
                  isCurrent && "border-[2.5px] border-forest bg-cream",
                  !isDone && !isCurrent && "border-[1.5px] border-line bg-paper"
                )}
              />
              {i < STEPS.length - 1 && (
                <span
                  className={cn("h-[3px] flex-1 rounded-full", isDone ? "bg-forest" : "bg-line")}
                />
              )}
            </Fragment>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between">
        {STEPS.map((s) => {
          const isOff = s.level === 4;
          return (
            <span
              key={s.level}
              className={cn(
                "text-[11px]",
                isOff ? "font-medium text-muted" : "font-semibold text-ink"
              )}
            >
              {s.label}
            </span>
          );
        })}
      </div>

      <p className="mt-2.5 text-[11px] leading-snug text-muted">
        Agency (Fire Service) — view only, the manager decides.
      </p>
    </div>
  );
}
