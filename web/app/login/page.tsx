"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DEMO_GROUPS, DEMO_PASSWORD, DEMO_PEOPLE } from "@/lib/demo";
import { Avatar, Button, Chip, cn } from "@/components/ui";

const GROUP_CHIP: Record<string, string> = {
  Resident: "bg-[#eaeae2] text-muted",
  Security: "bg-alarm-soft text-[#a85a30]",
  Manager: "bg-forest-soft text-forest",
  Pending: "bg-amber-soft text-amber",
};

export default function LoginPage() {
  const router = useRouter();
  const { session, loading, signIn } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && session) router.replace("/");
  }, [loading, session, router]);

  async function enterAs(addr: string) {
    setBusy(addr);
    setError(null);
    const { error } = await signIn(addr, DEMO_PASSWORD);
    if (error) {
      setError(`Couldn't sign in as ${addr.split("@")[0]} — ${error}`);
      setBusy(null);
    } else {
      router.replace("/");
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError(null);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error);
      setBusy(null);
    } else router.replace("/");
  }

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-6 pb-8 pt-14">
      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-full border-[3px] border-cream">
            <span className="h-1.5 w-1.5 rounded-full bg-cream" />
          </span>
        </span>
        <span className="font-display text-3xl font-extrabold text-ink">WatchPoint</span>
      </header>
      <p className="-mt-2 text-sm font-medium text-muted">
        Enter the demo as anyone in the estate
      </p>

      {error && (
        <div className="animate-rise rounded-xl bg-alarm-soft px-4 py-3 text-sm font-medium text-alarm">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-line bg-card p-2 shadow-[var(--shadow-card)]">
        {DEMO_GROUPS.map((group) => (
          <div key={group}>
            <p className="px-3 pb-1 pt-3 text-[11px] font-bold tracking-wide text-forest">
              {group.toUpperCase()}
            </p>
            {DEMO_PEOPLE.filter((p) => p.group === group).map((p) => (
              <button
                key={p.email}
                onClick={() => enterAs(p.email)}
                disabled={!!busy}
                className="flex w-full items-center justify-between rounded-2xl px-2.5 py-2.5 transition active:bg-paper disabled:opacity-60"
              >
                <span className="flex items-center gap-3">
                  <Avatar name={p.name} color={p.color} size={32} />
                  <span className="text-[15px] font-semibold text-ink">{p.name}</span>
                </span>
                {busy === p.email ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-forest" />
                ) : (
                  <Chip className={cn(GROUP_CHIP[p.role])}>{p.role}</Chip>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-forest-soft px-4 py-3">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-forest" />
        <p className="text-xs font-medium leading-snug text-forest">
          Tip: open on two phones — one resident raises an alarm, the rest see it live.
        </p>
      </div>

      {!showEmail ? (
        <button
          onClick={() => setShowEmail(true)}
          className="text-[13px] font-semibold text-muted underline-offset-2 hover:underline"
        >
          Prefer email? Sign in with email &amp; password
        </button>
      ) : (
        <form onSubmit={submitEmail} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@estate.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-line bg-cream px-4 py-3.5 text-[15px] outline-none focus:border-forest"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-line bg-cream px-4 py-3.5 text-[15px] outline-none focus:border-forest"
          />
          <Button type="submit" disabled={busy === "email"}>
            {busy === "email" ? "Signing in…" : "Enter"}
          </Button>
        </form>
      )}
    </main>
  );
}
