"use client";

import Link from "next/link";
import type { Incident } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";
import { CATEGORY_BADGE, CATEGORY_DOT, timeAgo } from "@/lib/util";
import { Chip, ConfidenceDots, StatusBadge } from "./ui";

export function IncidentCard({ incident }: { incident: Incident }) {
  const meta = CATEGORY_META[incident.category];
  const live = incident.status === "open" || incident.status === "resolution_disputed";
  const escalated =
    incident.status === "open" &&
    (incident.confidence_score > 0 || incident.confirmation_count > 0);

  return (
    <Link
      href={`/incident/${incident.id}`}
      className="block rounded-2xl border border-line bg-card p-[15px] shadow-[var(--shadow-card)] transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl ${CATEGORY_BADGE[incident.category]}`}
          >
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{ background: CATEGORY_DOT[incident.category] }}
            />
          </span>
          <div>
            <p className="font-bold text-ink">{meta.label}</p>
            <p className="text-[13px] text-muted">
              {incident.description?.slice(0, 32) || "Reported"} · {timeAgo(incident.created_at)}
            </p>
          </div>
        </div>
        <StatusBadge status={incident.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <ConfidenceDots score={incident.confidence_score} />
        <span className="text-xs font-medium text-muted">
          {incident.confirmation_count > 0
            ? `${incident.confirmation_count} neighbour${incident.confirmation_count > 1 ? "s" : ""} confirmed`
            : "Awaiting confirmation"}
        </span>
        {incident.verification_status === "verified" && (
          <Chip className="bg-forest-soft text-forest">✓ VERIFIED</Chip>
        )}
        {incident.status === "resolved" && (
          <Chip className="bg-forest-soft text-forest">Resolved</Chip>
        )}
        {escalated && incident.resolution_dispute_count === 0 && (
          <Chip className="bg-forest-soft text-forest">↗ Escalating</Chip>
        )}
        {live && (
          <Chip className="bg-alarm-soft text-alarm">
            <span className="h-1.5 w-1.5 rounded-full bg-alarm" /> LIVE
          </Chip>
        )}
      </div>
    </Link>
  );
}
