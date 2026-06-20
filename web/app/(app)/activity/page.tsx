"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { listAudit, listEscalationRules } from "@/lib/queries";
import type { MemberRole } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/util";
import { timeAgo } from "@/lib/util";
import { Chip, Spinner } from "@/components/ui";

const ACTION_LABEL: Record<string, string> = {
  status_change: "Incident status changed",
  confirm_incident: "Community confirmation",
  dispute_resolution: "Resolution disputed",
  verify_member: "Member verified",
  visitor_access: "Visitor logged",
  nudge_member: "Verification nudge",
  create: "Created",
  view_sensitive: "Sensitive access",
  export: "Data export",
};
const ACTION_DOT: Record<string, string> = {
  status_change: "#c8442e",
  confirm_incident: "#2e5e45",
  dispute_resolution: "#b87a1a",
  verify_member: "#2e5e45",
  visitor_access: "#3f7fa6",
  nudge_member: "#73548c",
};

function fmtTimeout(s: number) {
  if (s <= 0) return "immediately";
  if (s < 60) return `after ${s}s`;
  return `after ${Math.round(s / 60)} min`;
}

export default function ActivityPage() {
  const { me } = useAuth();
  const [rows, setRows] = useState<{ id: number; action: string; created_at: string; detail: unknown }[] | null>(null);
  const [rules, setRules] = useState<{ level: number; timeout_seconds: number; target_role: MemberRole }[]>([]);

  useEffect(() => {
    (async () => {
      setRows((await listAudit()) as never);
      setRules((await listEscalationRules()) as never);
    })();
  }, []);

  const isManager = me?.role === "community_manager" || me?.role === "platform_admin";

  return (
    <main className="min-h-dvh px-5 pb-10 pt-14">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl font-bold text-ink">
            ‹
          </Link>
          <h1 className="font-display text-[22px] font-extrabold text-ink">Estate activity</h1>
        </div>
        <Chip className="bg-forest-soft text-forest">Managers only</Chip>
      </header>

      {!isManager ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
          The activity log is visible to community managers only.
        </p>
      ) : rows === null ? (
        <div className="grid place-items-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-card">
          {rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No activity yet.</p>
          ) : (
            rows.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-line" : ""}`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-[9px] w-[9px] rounded-full"
                    style={{ background: ACTION_DOT[r.action] ?? "#6b7a6e" }}
                  />
                  <span className="text-[14px] font-semibold text-ink">
                    {ACTION_LABEL[r.action] ?? r.action}
                  </span>
                </span>
                <span className="text-xs text-muted">{timeAgo(r.created_at)}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-line bg-card p-4">
        <p className="font-bold text-ink">Escalation policy</p>
        <div className="mt-3 space-y-3">
          {rules.map((r) => {
            const off = r.level === 4;
            return (
              <div key={r.level} className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span
                    className={`h-[22px] w-[22px] rounded-full ${off ? "border-[1.5px] border-line bg-paper" : "bg-forest"}`}
                  />
                  <span className={`text-[14px] font-semibold ${off ? "text-muted" : "text-ink"}`}>
                    {r.target_role === "resident"
                      ? "Residents"
                      : r.target_role === "agency_operator"
                        ? "Outside agency"
                        : ROLE_LABEL[r.target_role]}
                  </span>
                </span>
                <span className={`text-xs font-medium ${off ? "text-muted" : "text-forest"}`}>
                  {fmtTimeout(r.timeout_seconds)}
                  {off ? " · view only" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
