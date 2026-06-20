"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { listIncidents, runEscalations } from "@/lib/queries";
import { playSiren } from "@/lib/siren";
import type { Incident } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { IncidentCard } from "@/components/incident-card";
import { Spinner } from "@/components/ui";

export default function FeedPage() {
  const { me } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [alarm, setAlarm] = useState<Incident | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const list = await listIncidents();
    list.forEach((i) => seen.current.add(i.id));
    setIncidents(list);
  }, []);

  useEffect(() => {
    (async () => {
      await runEscalations();
      await refresh();
    })();
  }, [refresh]);

  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel("feed-incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Incident;
            if (row && !seen.current.has(row.id) && row.reporter_member_id !== me.memberId) {
              seen.current.add(row.id);
              playSiren();
              setAlarm(row);
              setTimeout(() => setAlarm((a) => (a?.id === row.id ? null : a)), 9000);
            }
          }
          refresh();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, refresh]);

  return (
    <main className="px-5 pb-28 pt-14">
      {alarm && (
        <button
          onClick={() => router.push(`/incident/${alarm.id}`)}
          className="fixed left-1/2 top-0 z-40 w-full max-w-[480px] -translate-x-1/2 animate-slide-down px-4 pt-3"
        >
          <span className="flex items-center gap-3 rounded-2xl bg-alarm px-4 py-3 text-left shadow-[var(--shadow-alarm)]">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span
                className="absolute h-3 w-3 rounded-full bg-cream/70"
                style={{ animation: "pulse-ring 1.2s ease-out infinite" }}
              />
              <span className="h-2.5 w-2.5 rounded-full bg-cream" />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-bold text-cream/90">NEW ALARM · just now</span>
              <span className="block text-[15px] font-semibold text-cream">
                {CATEGORY_META[alarm.category].label} reported — tap to respond
              </span>
            </span>
          </span>
        </button>
      )}

      <AppHeader />
      <p className="mt-4 text-[13px] font-semibold text-forest">Live in your estate</p>

      <div className="mt-3 space-y-3">
        {incidents === null ? (
          <div className="grid place-items-center py-16">
            <Spinner label="Loading the feed…" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-12 text-center">
            <p className="font-display text-lg font-bold text-ink">All quiet</p>
            <p className="mt-1 text-sm text-muted">
              No active incidents. Tap <span className="font-semibold text-alarm">Raise Alarm</span>{" "}
              if something happens.
            </p>
          </div>
        ) : (
          incidents.map((i) => <IncidentCard key={i.id} incident={i} />)
        )}
      </div>

      <Link
        href="/report"
        className="fixed bottom-24 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2.5 rounded-2xl bg-alarm px-7 py-4 text-[17px] font-bold text-cream shadow-[var(--shadow-alarm)] transition active:scale-95"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full border-[2.5px] border-cream" />
        RAISE ALARM
      </Link>

      <BottomNav active="home" />
    </main>
  );
}
