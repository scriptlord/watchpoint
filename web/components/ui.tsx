"use client";

import type { ReactNode } from "react";
import type { IncidentStatus, VerificationStatus } from "@/lib/types";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  color,
  size = 40,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-semibold text-cream"
      style={{ background: color ?? "#2e5e45", width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </div>
  );
}

export function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold leading-none",
        className
      )}
    >
      {children}
    </span>
  );
}

const STATUS_STYLE: Record<IncidentStatus, string> = {
  open: "bg-alarm-soft text-alarm",
  acknowledged: "bg-amber-soft text-amber",
  en_route: "bg-amber-soft text-amber",
  on_scene: "bg-amber-soft text-amber",
  resolved: "bg-forest-soft text-forest",
  resolution_disputed: "bg-alarm-soft text-alarm",
};

const STATUS_TEXT: Record<IncidentStatus, string> = {
  open: "OPEN",
  acknowledged: "ACKNOWLEDGED",
  en_route: "EN ROUTE",
  on_scene: "ON SCENE",
  resolved: "RESOLVED",
  resolution_disputed: "DISPUTED",
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Chip className={STATUS_STYLE[status]}>{STATUS_TEXT[status]}</Chip>;
}

export function ConfidenceDots({ score, total = 5 }: { score: number; total?: number }) {
  // score is 0–100 → fill out of `total`
  const filled = Math.min(total, Math.round((score / 100) * total));
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn("h-[7px] w-[7px] rounded-full", i < filled ? "bg-forest" : "bg-line")}
        />
      ))}
    </span>
  );
}

export function VerifyChip({ status }: { status: VerificationStatus }) {
  if (status === "verified")
    return <Chip className="bg-forest-soft text-forest">✓ VERIFIED</Chip>;
  if (status === "likely") return <Chip className="bg-forest-soft text-forest">LIKELY</Chip>;
  if (status === "disputed") return <Chip className="bg-alarm-soft text-alarm">DISPUTED</Chip>;
  return null;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-muted">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-forest" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

/** A primary/secondary/alarm button. */
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "alarm" | "ghost";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const styles: Record<string, string> = {
    primary: "bg-forest text-cream",
    secondary: "bg-card text-forest border border-forest",
    alarm: "bg-alarm text-cream shadow-[var(--shadow-alarm)]",
    ghost: "text-forest",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-50",
        styles[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
