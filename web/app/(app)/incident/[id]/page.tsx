"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  confirmIncident,
  disputeResolution,
  getEscalationEvents,
  getIncident,
  getIncidentTimeline,
  listEstateMembers,
  listProviders,
  runEscalations,
  setIncidentStatus,
} from "@/lib/queries";
import type { EscalationEvent, Incident, IncidentStatus, IncidentUpdate } from "@/lib/types";
import { CATEGORY_META, CRITICAL_CATEGORIES, STATUS_LABEL } from "@/lib/types";
import { CATEGORY_BADGE, CATEGORY_DOT, timeAgo } from "@/lib/util";
import { Button, Chip, ConfidenceDots, Spinner, StatusBadge, cn } from "@/components/ui";
import { EscalationLadder } from "@/components/escalation-ladder";

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<IncidentUpdate[]>([]);
  const [events, setEvents] = useState<EscalationEvent[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [providers, setProviders] = useState<{ id: string; name: string; category: string; phone: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    await runEscalations();
    const [inc, tl, ev, members, prov] = await Promise.all([
      getIncident(id),
      getIncidentTimeline(id),
      getEscalationEvents(id),
      listEstateMembers(),
      listProviders(),
    ]);
    setIncident(inc);
    setTimeline(tl);
    setEvents(ev);
    setNames(Object.fromEntries(members.map((m) => [m.id, m.full_name])));
    setProviders(prov);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`incident-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents", filter: `id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_updates", filter: `incident_id=eq.${id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  async function act(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await fn();
      setToast(ok);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3500);
    }
  }

  if (loading || !me) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Loading incident…" />
      </div>
    );
  }
  if (!incident) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-lg font-bold text-ink">Incident not found</p>
          <Link href="/" className="mt-3 inline-block font-semibold text-forest">
            ‹ Back to feed
          </Link>
        </div>
      </main>
    );
  }

  const meta = CATEGORY_META[incident.category];
  const isReporter = me.memberId === incident.reporter_member_id;
  const isStaff = ["responder", "community_manager", "agency_operator", "platform_admin"].includes(me.role);
  const active = !["resolved", "resolution_disputed"].includes(incident.status);
  const canConfirm = me.isVerified && !isReporter && active;
  const canProgress = isStaff && ["open", "acknowledged", "en_route"].includes(incident.status);
  const canResolve = isReporter && active;
  const canDispute = me.isVerified && !isReporter && incident.status === "resolved";
  const showAgency =
    me.role === "community_manager" && CRITICAL_CATEGORIES.includes(incident.category) && active;
  const fireProvider = providers.find((p) => p.category === "tow") || providers[0];

  const nextProgress: { label: string; status: IncidentStatus } =
    incident.status === "open"
      ? { label: "Acknowledge", status: "acknowledged" }
      : incident.status === "acknowledged"
        ? { label: "En route", status: "en_route" }
        : { label: "On scene", status: "on_scene" };

  return (
    <main className="min-h-dvh px-5 pb-10 pt-14">
      {toast && (
        <div className="fixed left-1/2 top-3 z-50 w-[92%] max-w-[440px] -translate-x-1/2 animate-slide-down rounded-xl bg-ink px-4 py-3 text-sm font-medium text-cream shadow-[var(--shadow-lift)]">
          {toast}
        </div>
      )}

      <header className="flex items-center gap-3">
        <Link href="/" className="text-2xl font-bold text-ink">
          ‹
        </Link>
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl", CATEGORY_BADGE[incident.category])}>
          <span className="h-3 w-3 rounded-full" style={{ background: CATEGORY_DOT[incident.category] }} />
        </span>
        <div>
          <h1 className="font-display text-[21px] font-extrabold leading-none text-ink">{meta.label}</h1>
          <p className="text-[13px] text-muted">{STATUS_LABEL[incident.status]}</p>
        </div>
      </header>

      <div className="mt-4 flex items-center gap-3">
        <StatusBadge status={incident.status} />
        <ConfidenceDots score={incident.confidence_score} />
        <span className="text-xs font-medium text-muted">
          {incident.confirmation_count} confirmed · {incident.denial_count} denied
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-4">
        <p className="text-[15px] font-semibold leading-snug text-ink">
          {incident.description ? `“${incident.description}”` : "No description given."}
        </p>
        <p className="mt-1.5 text-xs text-muted">
          Reported by {names[incident.reporter_member_id] ?? "a member"} · {timeAgo(incident.created_at)}
        </p>
      </div>

      <div className="mt-4">
        <EscalationLadder events={events} />
      </div>

      <section className="mt-5">
        <p className="mb-2.5 text-[13px] font-semibold text-forest">Timeline</p>
        <ol className="space-y-2.5">
          <TimelineRow label="Reported" time={timeAgo(incident.created_at)} />
          {timeline.map((u) => (
            <TimelineRow
              key={u.id}
              label={
                u.update_type === "status_change"
                  ? `Status → ${u.new_status ? STATUS_LABEL[u.new_status] : ""}`
                  : u.note || u.update_type
              }
              time={timeAgo(u.created_at)}
            />
          ))}
        </ol>
      </section>

      {/* role-aware actions */}
      {(canConfirm || canProgress || canResolve || canDispute || showAgency) && (
        <section className="mt-5 space-y-3 rounded-2xl bg-forest-soft p-4">
          <p className="text-[13px] font-semibold text-forest">
            {isReporter
              ? "You raised this alarm"
              : isStaff
                ? `You're ${me.role === "responder" ? "Security" : "the Manager"} — take action`
                : "Help confirm this alarm"}
          </p>

          {canConfirm && (
            <div className="flex gap-2.5">
              <Button className="flex-1" disabled={busy} onClick={() => act(() => confirmIncident(incident.id, me.memberId, "confirm"), "Confirmed — thank you")}>
                Confirm
              </Button>
              <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => act(() => confirmIncident(incident.id, me.memberId, "deny"), "Marked as not real")}>
                Deny
              </Button>
            </div>
          )}

          {canProgress && (
            <Button variant="secondary" className="w-full" disabled={busy} onClick={() => act(() => setIncidentStatus(incident.id, nextProgress.status), `Marked ${nextProgress.label.toLowerCase()}`)}>
              {nextProgress.label}
            </Button>
          )}

          {canResolve && (
            <Button className="w-full" disabled={busy} onClick={() => act(() => setIncidentStatus(incident.id, "resolved"), "Stood down — you're safe")}>
              I&apos;m fine — mark resolved
            </Button>
          )}

          {canDispute && (
            <Button variant="secondary" className="w-full" disabled={busy} onClick={() => act(() => disputeResolution(incident.id, me.memberId), "Flagged — not actually resolved")}>
              Still active — dispute resolution
            </Button>
          )}

          {showAgency && fireProvider?.phone && (
            <a
              href={`tel:${fireProvider.phone}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-alarm bg-alarm-soft py-3 text-[14px] font-semibold text-alarm"
            >
              ☎ Call outside agency (Fire Service)
            </a>
          )}
        </section>
      )}

      {/* help contacts */}
      {providers.length > 0 && (
        <section className="mt-5">
          <p className="mb-2 text-[13px] font-medium text-muted">Need help?</p>
          <div className="flex flex-wrap gap-2">
            {providers.slice(0, 4).map((p) => (
              <a
                key={p.id}
                href={p.phone ? `tel:${p.phone}` : undefined}
                className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] font-semibold text-forest"
              >
                {p.name}
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function TimelineRow({ label, time }: { label: string; time: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-forest" />
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <span className="ml-auto text-xs text-muted">{time}</span>
    </li>
  );
}
