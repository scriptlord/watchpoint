import type { IncidentCategory, MemberRole } from "./types";

/** True when a Supabase error is a unique-constraint violation (409 / 23505). */
export function isDuplicate(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  return err?.code === "23505" || /duplicate key|already exists/i.test(err?.message ?? "");
}

export function errMessage(e: unknown, fallback = "Something went wrong"): string {
  const err = e as { message?: string } | null;
  return err?.message || fallback;
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  resident: "Resident",
  community_manager: "Manager",
  responder: "Security",
  agency_operator: "Agency",
  platform_admin: "Admin",
};

/** Soft background class for a category badge. */
export const CATEGORY_BADGE: Record<IncidentCategory, string> = {
  fire: "bg-alarm-soft",
  medical: "bg-[#f6e3e6]",
  security: "bg-forest-soft",
  accident: "bg-amber-soft",
  intrusion: "bg-[#ece6f2]",
  flood: "bg-[#e0e8ee]",
  other: "bg-[#eaeae2]",
};

export const CATEGORY_DOT: Record<IncidentCategory, string> = {
  fire: "#c8442e",
  medical: "#c5546b",
  security: "#2e5e45",
  accident: "#b87a1a",
  intrusion: "#73548c",
  flood: "#3f7fa6",
  other: "#6b7a6e",
};
