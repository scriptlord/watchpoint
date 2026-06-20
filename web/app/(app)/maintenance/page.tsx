"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listMaintenance, reportMaintenance } from "@/lib/queries";
import type { MaintenanceCategory, MaintenanceStatus, MaintenanceTicket } from "@/lib/types";
import { timeAgo } from "@/lib/util";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Button, Chip, Spinner, cn } from "@/components/ui";

const CATS: MaintenanceCategory[] = [
  "streetlight",
  "drainage",
  "pothole",
  "camera",
  "generator",
  "waste",
];
const LABEL: Record<string, string> = {
  streetlight: "Streetlight",
  drainage: "Drainage",
  pothole: "Pothole",
  camera: "Camera",
  generator: "Generator",
  waste: "Waste",
  fence: "Fence",
  other: "Other",
};
const STATUS_STYLE: Record<MaintenanceStatus, string> = {
  open: "bg-amber-soft text-amber",
  assigned: "bg-[#eaeae2] text-muted",
  in_progress: "bg-amber-soft text-amber",
  resolved: "bg-forest-soft text-forest",
};

export default function MaintenancePage() {
  const { me } = useAuth();
  const [tickets, setTickets] = useState<MaintenanceTicket[] | null>(null);
  const [category, setCategory] = useState<MaintenanceCategory>("streetlight");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setTickets((await listMaintenance()) as MaintenanceTicket[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!me) return;
    setBusy(true);
    try {
      await reportMaintenance({ estateId: me.estateId, memberId: me.memberId, category, description });
      setDescription("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-5 pb-28 pt-14">
      <AppHeader />
      <p className="mt-4 text-[13px] font-semibold text-forest">Non-urgent issues in your estate</p>

      <div className="mt-3 space-y-3">
        {tickets === null ? (
          <div className="grid place-items-center py-10">
            <Spinner />
          </div>
        ) : (
          tickets.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-soft" />
                <div>
                  <p className="font-bold text-ink">{LABEL[t.category]}</p>
                  <p className="text-[13px] text-muted">
                    {t.description?.slice(0, 28) || "Reported"} · {timeAgo(t.created_at)}
                  </p>
                </div>
              </div>
              <Chip className={STATUS_STYLE[t.status]}>{t.status.replace("_", " ").toUpperCase()}</Chip>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-card p-4">
        <p className="font-bold text-ink">Report an issue</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-lg border px-3 py-2 text-[13px] font-semibold transition active:scale-95",
                c === category ? "border-forest bg-forest-soft text-forest" : "border-line bg-cream text-ink"
              )}
            >
              {LABEL[c]}
            </button>
          ))}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Describe the issue…"
          className="mt-3 w-full resize-none rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-forest"
        />
        <Button className="mt-3 w-full" disabled={busy} onClick={submit}>
          {busy ? "Submitting…" : "Submit ticket"}
        </Button>
      </div>

      <BottomNav active="maintenance" />
    </main>
  );
}
