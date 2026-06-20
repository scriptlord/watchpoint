"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BLOCKS, DEMO_ESTATE_ID, DEMO_ESTATE_NAME } from "@/lib/demo";
import { Button, cn } from "@/components/ui";
import { errMessage } from "@/lib/util";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [block, setBlock] = useState(BLOCKS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: e1 } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim(), phone: phone.trim() } },
      });
      if (e1) throw e1;

      // email is auto-confirmed (see migration 0004) so we can sign in straight away
      const { error: e2 } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (e2) throw e2;

      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        // a trigger forces this to a pending, unverified resident
        await supabase.from("estate_members").insert({
          estate_id: DEMO_ESTATE_ID,
          user_id: u.user.id,
          household_id: block,
        });
      }
      router.replace("/"); // → "waiting for verification" screen
    } catch (err) {
      setError(errMessage(err, "Couldn't create your account"));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-6 pb-8 pt-14">
      <header className="flex items-center gap-3">
        <Link href="/login" className="text-2xl font-bold text-ink">
          ‹
        </Link>
        <span className="font-display text-[26px] font-extrabold text-ink">Create account</span>
      </header>
      <p className="-mt-1 text-sm font-medium text-muted">
        Join {DEMO_ESTATE_NAME}. A community manager verifies you before you get access.
      </p>

      {error && (
        <div className="animate-rise rounded-xl bg-alarm-soft px-4 py-3 text-sm font-medium text-alarm">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field value={name} setValue={setName} placeholder="Full name" required />
        <Field value={phone} setValue={setPhone} placeholder="Phone (+234…)" type="tel" required />
        <Field value={email} setValue={setEmail} placeholder="Email" type="email" required />
        <Field value={password} setValue={setPassword} placeholder="Password" type="password" required />

        <div>
          <p className="mb-2 mt-1 text-[13px] font-semibold text-ink">Which block do you live in?</p>
          <div className="flex flex-wrap gap-2">
            {BLOCKS.map((b) => (
              <button
                type="button"
                key={b.id}
                onClick={() => setBlock(b.id)}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-sm font-semibold transition active:scale-95",
                  block === b.id ? "border-forest bg-forest-soft text-forest" : "border-line bg-card text-ink"
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {BLOCKS.find((b) => b.id === block)?.manager} manages this block and will verify you.
          </p>
        </div>

        <Button type="submit" disabled={busy} className="mt-2 w-full">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <Link href="/login" className="text-center text-[13px] font-semibold text-muted">
        Already have an account? Sign in
      </Link>
    </main>
  );
}

function Field({
  value,
  setValue,
  placeholder,
  type = "text",
  required,
}: {
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      required={required}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="rounded-xl border border-line bg-cream px-4 py-3.5 text-[15px] outline-none focus:border-forest"
    />
  );
}
