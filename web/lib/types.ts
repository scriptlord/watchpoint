// Domain types mirroring the WatchPoint schema (supabase/migrations/0001_init.sql)

export type MemberRole =
  | "resident"
  | "community_manager"
  | "responder"
  | "agency_operator"
  | "platform_admin";

export type MemberStatus = "pending" | "active" | "suspended";

export type IncidentCategory =
  | "fire"
  | "medical"
  | "security"
  | "accident"
  | "intrusion"
  | "flood"
  | "other";

export type IncidentStatus =
  | "open"
  | "acknowledged"
  | "en_route"
  | "on_scene"
  | "resolved"
  | "resolution_disputed";

export type VerificationStatus = "unverified" | "likely" | "verified" | "disputed";
export type ConfirmationResponse = "confirm" | "deny" | "unsure";
export type MaintenanceCategory =
  | "streetlight" | "drainage" | "fence" | "pothole" | "camera" | "generator" | "waste" | "other";
export type MaintenanceStatus = "open" | "assigned" | "in_progress" | "resolved";

export interface Me {
  memberId: string;
  estateId: string;
  estateName: string;
  householdId: string | null;
  role: MemberRole;
  isVerified: boolean;
  status: MemberStatus;
  fullName: string;
  photoPath: string | null;
}

export interface Incident {
  id: string;
  estate_id: string;
  reporter_member_id: string;
  category: IncidentCategory;
  description: string | null;
  lat: number | null;
  lng: number | null;
  status: IncidentStatus;
  verification_status: VerificationStatus;
  confirmation_count: number;
  denial_count: number;
  confidence_score: number;
  resolution_dispute_count: number;
  is_flagged_for_review: boolean;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  actor_member_id: string | null;
  update_type: string;
  new_status: IncidentStatus | null;
  note: string | null;
  created_at: string;
}

export interface EscalationEvent {
  id: string;
  incident_id: string;
  level: number;
  target_role: MemberRole;
  triggered_at: string;
}

export interface MaintenanceTicket {
  id: string;
  estate_id: string;
  reporter_member_id: string;
  category: MaintenanceCategory;
  description: string | null;
  status: MaintenanceStatus;
  created_at: string;
  resolved_at: string | null;
}

export const CATEGORY_META: Record<IncidentCategory, { label: string; tone: string }> = {
  fire: { label: "Fire", tone: "alarm" },
  medical: { label: "Medical", tone: "rose" },
  security: { label: "Security", tone: "forest" },
  accident: { label: "Accident", tone: "amber" },
  intrusion: { label: "Intrusion", tone: "violet" },
  flood: { label: "Flood", tone: "blue" },
  other: { label: "Other", tone: "muted" },
};

export const CRITICAL_CATEGORIES: IncidentCategory[] = ["fire", "medical", "intrusion"];

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  en_route: "En route",
  on_scene: "On scene",
  resolved: "Resolved",
  resolution_disputed: "Disputed",
};

export const ESCALATION_LADDER: { level: number; role: MemberRole; label: string }[] = [
  { level: 1, role: "resident", label: "Residents" },
  { level: 2, role: "responder", label: "Security" },
  { level: 3, role: "community_manager", label: "Manager" },
  { level: 4, role: "agency_operator", label: "Agency" },
];
