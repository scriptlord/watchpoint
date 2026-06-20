"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./ui";
import { ROLE_LABEL } from "@/lib/util";

export function AppHeader() {
  const { me, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  if (!me) return null;
  const isManager = me.role === "community_manager" || me.role === "platform_admin";

  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="font-display text-[22px] font-extrabold leading-tight text-ink">
          {me.estateName}
        </h1>
        <p className="text-[13px] font-medium text-muted">
          {me.fullName} · {ROLE_LABEL[me.role]}
        </p>
      </div>

      <div className="relative">
        <button onClick={() => setOpen((o) => !o)} aria-label="Menu">
          <Avatar name={me.fullName} color="#2e5e45" size={40} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-12 z-40 w-44 animate-rise overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow-lift)]">
              {isManager && (
                <Link
                  href="/activity"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-[14px] font-semibold text-ink active:bg-paper"
                >
                  Estate activity
                </Link>
              )}
              <Link
                href="/roadmap"
                onClick={() => setOpen(false)}
                className="block border-t border-line px-4 py-3 text-[14px] font-semibold text-ink active:bg-paper"
              >
                What&apos;s next
              </Link>
              <button
                onClick={() => signOut()}
                className="block w-full border-t border-line px-4 py-3 text-left text-[14px] font-semibold text-alarm active:bg-paper"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
