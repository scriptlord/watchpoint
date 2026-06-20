"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Me } from "./types";

interface AuthState {
  session: Session | null;
  me: Me | null;
  loading: boolean;
  /** signed in, but has no readable membership (e.g. a pending occupant) */
  pending: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  reloadMe: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

async function loadMe(userId: string): Promise<Me | null> {
  const { data: member } = await supabase
    .from("estate_members")
    .select("id, estate_id, household_id, role, is_verified, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) return null; // pending occupant or not a member — no access yet

  const [{ data: profile }, { data: estate }] = await Promise.all([
    supabase.from("profiles").select("full_name, photo_path").eq("id", userId).maybeSingle(),
    supabase.from("estates").select("name").eq("id", member.estate_id).maybeSingle(),
  ]);

  return {
    memberId: member.id,
    estateId: member.estate_id,
    estateName: estate?.name ?? "Your estate",
    householdId: member.household_id,
    role: member.role,
    isVerified: member.is_verified,
    status: member.status,
    fullName: profile?.full_name ?? "Member",
    photoPath: profile?.photo_path ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (s: Session | null) => {
    setSession(s);
    if (s?.user) {
      setMe(await loadMe(s.user.id));
    } else {
      setMe(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      hydrate(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMe(null);
  }, []);

  const reloadMe = useCallback(async () => {
    if (session?.user) setMe(await loadMe(session.user.id));
  }, [session]);

  const pending = !!session && !me && !loading;

  return (
    <Ctx.Provider value={{ session, me, loading, pending, signIn, signOut, reloadMe }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
