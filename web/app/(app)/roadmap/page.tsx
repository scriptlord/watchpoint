"use client";

import Link from "next/link";

const LIVE = [
  "One-tap incident reporting",
  "Community confirm & dispute",
  "In-estate escalation → manager",
  "Household tree & verification",
  "Visitors + maintenance + audit",
];

const NEXT: [string, string][] = [
  ["Push notifications", "Alert phones even when the app is closed"],
  ["Native iOS & Android apps", "Lock-screen panic, background alerts"],
  ["Auto-escalation timer", "Climbs even when nobody is watching"],
  ["Outside-agency handoff", "Fire Service, LASEMA, Police"],
  ["City-wide incident map", "Nearby alerts & heatmaps"],
];

export default function RoadmapPage() {
  return (
    <main className="min-h-dvh px-5 pb-10 pt-14">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-2xl font-bold text-ink">
          ‹
        </Link>
        <h1 className="font-display text-[22px] font-extrabold text-ink">What&apos;s next</h1>
      </header>
      <p className="mt-1 text-[13px] font-medium text-muted">
        What works today — and where WatchPoint is heading.
      </p>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4">
        <p className="text-[11px] font-bold tracking-wide text-forest">LIVE IN THIS PROTOTYPE</p>
        <ul className="mt-2 space-y-1">
          {LIVE.map((t) => (
            <li key={t} className="flex items-center gap-3 py-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-bold text-cream">
                ✓
              </span>
              <span className="text-[14px] font-semibold text-ink">{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4">
        <p className="text-[11px] font-bold tracking-wide text-amber">ON THE ROADMAP</p>
        <ul className="mt-2 space-y-1">
          {NEXT.map(([t, sub]) => (
            <li key={t} className="flex items-center gap-3 py-2">
              <span className="h-5 w-5 shrink-0 rounded-full border-2 border-forest bg-paper" />
              <span>
                <span className="block text-[14px] font-semibold text-ink">{t}</span>
                <span className="block text-[11px] text-muted">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4 rounded-2xl bg-forest-soft px-4 py-3.5">
        <p className="text-xs font-medium leading-relaxed text-forest">
          The database already supports every item above — the roadmap is wiring, not redesign.
        </p>
      </div>
    </main>
  );
}
