"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button, Spinner } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, me, loading, pending, signOut, reloadMe } = useAuth();

  useEffect(() => {
    if (!loading && !session) router.replace("/welcome");
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Loading…" />
      </div>
    );
  }

  if (pending) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-8 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-amber-soft text-3xl">⌛</span>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-extrabold text-ink">Waiting for verification</h1>
          <p className="text-[15px] leading-relaxed text-muted">
            You&apos;ve registered as an occupant. Your household&apos;s community manager needs to
            verify you before you can see the estate&apos;s reports.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <Button onClick={() => reloadMe()}>I&apos;ve been verified — check again</Button>
          <Button variant="ghost" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
