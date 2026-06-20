"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function WelcomePage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) router.replace("/");
  }, [loading, session, router]);

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8 pt-16">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest">
          <span className="grid h-5 w-5 place-items-center rounded-full border-[3px] border-cream">
            <span className="h-1.5 w-1.5 rounded-full bg-cream" />
          </span>
        </span>
        <span className="font-display text-[32px] font-extrabold text-ink">WatchPoint</span>
      </div>

      <h1 className="mt-7 font-display text-[26px] font-extrabold leading-tight text-ink">
        Estate safety,
        <br />
        handled together.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Report an incident in one tap, let neighbours confirm it, and watch security and managers
        respond — with a clear record of what happened. This is a live prototype.
      </p>

      <div className="mt-8 space-y-3">
        <p className="text-[13px] font-bold tracking-wide text-forest">TRY IT TWO WAYS</p>

        <Link
          href="/login"
          className="block rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-[17px] font-extrabold text-ink">Explore the demo</p>
            <span className="text-forest">→</span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            Jump straight in as a resident, security guard, or manager — <b>ready-made test accounts</b>,
            no signup. Best for a quick look.
          </p>
        </Link>

        <Link
          href="/signup"
          className="block rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-card)] transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-[17px] font-extrabold text-ink">Create your own account</p>
            <span className="text-forest">→</span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            Sign up and go through real onboarding — you start <b>pending</b> until a community
            manager verifies you.
          </p>
        </Link>
      </div>

      <div className="mt-auto flex items-start gap-3 rounded-2xl bg-forest-soft px-4 py-3">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-forest" />
        <p className="text-xs font-medium leading-snug text-forest">
          For the full effect: open on two phones, sign in as two different residents, and raise an
          alarm on one — it arrives live, with a siren, on the other.
        </p>
      </div>
    </main>
  );
}
