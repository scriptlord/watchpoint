"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addBeneficiary, listBeneficiaries, sendVisitorPass } from "@/lib/queries";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Button, Spinner } from "@/components/ui";

interface Beneficiary {
  id: string;
  name: string;
  photo_path: string | null;
  is_active: boolean;
  host_member_id: string;
}

// shrink a captured image to a small data URL so it fits comfortably in a text column
function fileToSmallDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function VisitorsPage() {
  const { me } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[] | null>(null);
  const [oneOff, setOneOff] = useState("");
  const [newName, setNewName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setBeneficiaries((await listBeneficiaries()) as Beneficiary[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function sendOneOff() {
    if (!me || !oneOff.trim()) return;
    setBusy(true);
    try {
      await sendVisitorPass(me.estateId, me.memberId, oneOff.trim());
      setOneOff("");
      flash("Sent to security at the gate");
    } finally {
      setBusy(false);
    }
  }

  async function addRecurring() {
    if (!me || !newName.trim() || !photo) return;
    setBusy(true);
    try {
      await addBeneficiary(me.estateId, me.memberId, newName.trim(), photo);
      setNewName("");
      setPhoto(null);
      setAdding(false);
      await load();
      flash("Recurring guest added");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't add guest");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-5 pb-28 pt-14">
      {toast && (
        <div className="fixed left-1/2 top-3 z-50 w-[92%] max-w-[440px] -translate-x-1/2 animate-slide-down rounded-xl bg-ink px-4 py-3 text-sm font-medium text-cream">
          {toast}
        </div>
      )}
      <AppHeader />
      <p className="mt-4 text-[13px] font-semibold text-forest">
        Private to you and security only
      </p>

      <p className="mt-4 text-[11px] font-bold tracking-wide text-forest">RECURRING GUESTS</p>
      <div className="mt-2 space-y-2.5">
        {beneficiaries === null ? (
          <Spinner />
        ) : beneficiaries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
            No recurring guests yet.
          </p>
        ) : (
          beneficiaries.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3.5"
            >
              <span className="flex items-center gap-3">
                {b.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.photo_path} alt={b.name} className="h-11 w-11 rounded-xl object-cover" />
                ) : (
                  <span className="h-11 w-11 rounded-xl bg-[#d3c2a0]" />
                )}
                <span className="text-[15px] font-semibold text-ink">{b.name}</span>
              </span>
              <span className="rounded-lg bg-forest-soft px-2.5 py-1 text-[11px] font-bold text-forest">
                Photo ✓
              </span>
            </div>
          ))
        )}
      </div>

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="mt-2.5 w-full rounded-xl border-[1.5px] border-dashed border-forest py-3.5 text-sm font-semibold text-forest"
        >
          +  Add recurring guest
        </button>
      ) : (
        <div className="mt-2.5 space-y-3 rounded-2xl border border-line bg-card p-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Guest name"
            className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-forest"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto(await fileToSmallDataUrl(f));
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-cream px-4 py-3 text-sm font-semibold text-ink"
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-forest-soft text-forest">📷</span>
            )}
            {photo ? "Photo captured — tap to retake" : "Add a photo (required)"}
          </button>
          <div className="flex gap-2.5">
            <Button className="flex-1" disabled={busy || !newName.trim() || !photo} onClick={addRecurring}>
              {busy ? "Saving…" : "Save guest"}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="mt-5 text-[11px] font-bold tracking-wide text-forest">ONE-OFF — SEND TO THE GATE</p>
      <div className="mt-2 space-y-3 rounded-2xl border border-line bg-card p-4">
        <input
          value={oneOff}
          onChange={(e) => setOneOff(e.target.value)}
          placeholder="Visitor name (e.g. QuickFix mechanic)"
          className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-forest"
        />
        <Button className="w-full" disabled={busy || !oneOff.trim()} onClick={sendOneOff}>
          Send to security
        </Button>
        <p className="text-xs text-muted">Goes to security only — not the manager.</p>
      </div>

      <BottomNav active="visitors" />
    </main>
  );
}
