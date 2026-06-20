"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  listEstateMembers,
  listHouseholds,
  nudgeMember,
  verifyOccupant,
  type HouseholdRow,
  type MemberRow,
} from "@/lib/queries";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { Avatar, Button, Chip, Spinner } from "@/components/ui";
import { errMessage, isDuplicate } from "@/lib/util";

export default function PeoplePage() {
  const { me } = useAuth();
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [m, h] = await Promise.all([listEstateMembers(), listHouseholds()]);
    setMembers(m);
    setHouseholds(h);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(key: string, fn: () => Promise<void>, ok: string, dup?: string) {
    setBusy(key);
    try {
      await fn();
      setToast(ok);
      await load();
    } catch (e) {
      setToast(isDuplicate(e) ? (dup ?? "You've already done that.") : errMessage(e));
    } finally {
      setBusy(null);
      setTimeout(() => setToast(null), 3000);
    }
  }

  if (!members || !me) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Loading the estate…" />
      </div>
    );
  }

  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const staff = members.filter((m) => !m.household_id && m.role === "responder");

  return (
    <main className="px-5 pb-28 pt-14">
      {toast && (
        <div className="fixed left-1/2 top-3 z-50 w-[92%] max-w-[440px] -translate-x-1/2 animate-slide-down rounded-xl bg-ink px-4 py-3 text-sm font-medium text-cream">
          {toast}
        </div>
      )}
      <AppHeader />
      <p className="mt-4 text-[13px] font-semibold text-forest">Households · who is verified</p>

      <div className="mt-3 space-y-3">
        {households.map((h) => {
          const manager = h.landlord_member_id ? byId[h.landlord_member_id] : null;
          const occupants = members.filter(
            (m) => m.household_id === h.id && m.id !== h.landlord_member_id
          );
          const iManage = me.memberId === h.landlord_member_id;
          const count = occupants.length + (manager ? 1 : 0);

          return (
            <div key={h.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-forest-soft text-forest">
                  ⌂
                </span>
                <div>
                  <p className="font-display text-[17px] font-extrabold text-ink">{h.unit_label}</p>
                  <p className="text-xs text-muted">
                    {count} {count === 1 ? "person" : "people"}
                    {iManage ? " · you manage this" : ""}
                  </p>
                </div>
              </div>

              {manager && (
                <div className="mt-3">
                  <PersonRow member={manager} tag="Manager" tagClass="bg-forest-soft text-forest" />
                </div>
              )}

              {occupants.length > 0 && (
                <div className="mt-3 flex gap-3 pl-1">
                  <span className="w-[3px] shrink-0 rounded-full bg-[#cdddd2]" />
                  <div className="flex-1 space-y-3">
                    {occupants.map((o) => {
                      const pending = !o.is_verified || o.status === "pending";
                      return (
                        <div key={o.id}>
                          <PersonRow
                            member={o}
                            tag={pending ? "⌛ Pending" : "✓ Verified"}
                            tagClass={
                              pending ? "bg-amber-soft text-amber" : "bg-forest-soft text-forest"
                            }
                          />
                          {pending && (
                            <div className="mt-2 flex gap-2.5">
                              {iManage && (
                                <Button
                                  className="px-4 py-2 text-[13px]"
                                  disabled={busy === o.id}
                                  onClick={() =>
                                    run(o.id, () => verifyOccupant(o.id), `${o.full_name} verified`)
                                  }
                                >
                                  Verify
                                </Button>
                              )}
                              {me.isVerified && !iManage && (
                                <Button
                                  variant="secondary"
                                  className="px-4 py-2 text-[13px]"
                                  disabled={busy === o.id}
                                  onClick={() =>
                                    run(
                                      o.id,
                                      () => nudgeMember(me.estateId, o.id, me.memberId),
                                      "Nudged the manager",
                                      "You've already nudged about this person."
                                    )
                                  }
                                >
                                  Nudge
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {staff.length > 0 && (
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="font-display text-[15px] font-extrabold text-ink">Estate security</p>
            <div className="mt-3 space-y-3">
              {staff.map((m) => (
                <PersonRow key={m.id} member={m} tag="Security" tagClass="bg-alarm-soft text-[#a85a30]" />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav active="people" />
    </main>
  );
}

function PersonRow({
  member,
  tag,
  tagClass,
}: {
  member: MemberRow;
  tag: string;
  tagClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-3">
        <Avatar name={member.full_name} size={30} />
        <span className="text-[15px] font-semibold text-ink">{member.full_name}</span>
      </span>
      <Chip className={tagClass}>{tag}</Chip>
    </div>
  );
}
