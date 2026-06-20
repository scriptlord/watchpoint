"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { reportIncident } from "@/lib/queries";
import { CATEGORY_META, type IncidentCategory } from "@/lib/types";
import { CATEGORY_DOT } from "@/lib/util";
import { Button, cn } from "@/components/ui";

const ORDER: IncidentCategory[] = [
  "fire",
  "medical",
  "security",
  "accident",
  "intrusion",
  "flood",
  "other",
];

export default function ReportPage() {
  const router = useRouter();
  const { me } = useAuth();
  const [category, setCategory] = useState<IncidentCategory>("security");
  const [description, setDescription] = useState("");
  const [shareLocation, setShareLocation] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getLocation(): Promise<{ lat: number; lng: number } | null> {
    if (!shareLocation || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 4000 }
      );
    });
  }

  async function send() {
    if (!me) return;
    setBusy(true);
    setError(null);
    try {
      const loc = await getLocation();
      const incident = await reportIncident({
        estateId: me.estateId,
        memberId: me.memberId,
        category,
        description,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
      });
      router.replace(`/incident/${incident.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the alarm");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col gap-5 px-5 pb-8 pt-14">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-2xl font-bold text-ink">
          ‹
        </Link>
        <h1 className="font-display text-[22px] font-extrabold text-ink">Raise an alarm</h1>
      </header>

      <div>
        <p className="mb-2.5 text-[15px] font-semibold text-ink">What&apos;s happening?</p>
        <div className="flex flex-wrap gap-2.5">
          {ORDER.map((c) => {
            const on = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition active:scale-95",
                  on
                    ? "border-alarm bg-alarm-soft text-alarm"
                    : "border-line bg-card text-ink"
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: CATEGORY_DOT[c] }}
                />
                {CATEGORY_META[c].label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-[15px] font-semibold text-ink">Describe (optional)</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add a detail to help responders…"
          className="w-full resize-none rounded-xl border border-line bg-cream px-4 py-3.5 text-[15px] outline-none focus:border-forest"
        />
      </div>

      <button
        onClick={() => setShareLocation((s) => !s)}
        className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3.5 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-ink">Share my location</span>
          <span className="block text-xs text-muted">Helps responders find you</span>
        </span>
        <span
          className={cn(
            "relative h-7 w-12 rounded-full transition",
            shareLocation ? "bg-forest" : "bg-line"
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] h-[22px] w-[22px] rounded-full bg-cream transition-all",
              shareLocation ? "left-[23px]" : "left-[3px]"
            )}
          />
        </span>
      </button>

      {error && (
        <div className="rounded-xl bg-alarm-soft px-4 py-3 text-sm font-medium text-alarm">
          {error}
        </div>
      )}

      <div className="mt-auto">
        <Button variant="alarm" onClick={send} disabled={busy} className="w-full py-4 text-[17px]">
          <span className="grid h-4 w-4 place-items-center rounded-full border-[2.5px] border-cream" />
          {busy ? "SENDING…" : "SEND ALARM"}
        </Button>
      </div>
    </main>
  );
}
