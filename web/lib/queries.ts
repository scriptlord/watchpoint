import { supabase } from "./supabase";
import type {
  ConfirmationResponse,
  Incident,
  IncidentCategory,
  IncidentStatus,
  IncidentUpdate,
  EscalationEvent,
  MaintenanceCategory,
  MemberRole,
  MemberStatus,
} from "./types";

export interface MemberRow {
  id: string;
  user_id: string;
  role: MemberRole;
  household_id: string | null;
  is_verified: boolean;
  status: MemberStatus;
  full_name: string;
  photo_path: string | null;
}

export interface HouseholdRow {
  id: string;
  unit_label: string;
  landlord_member_id: string | null;
  address: string | null;
}

// ── Incidents ─────────────────────────────────────────────
export async function listIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getIncident(id: string): Promise<Incident | null> {
  const { data } = await supabase.from("incidents").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function getIncidentTimeline(id: string): Promise<IncidentUpdate[]> {
  const { data } = await supabase
    .from("incident_updates")
    .select("*")
    .eq("incident_id", id)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getEscalationEvents(id: string): Promise<EscalationEvent[]> {
  const { data } = await supabase
    .from("escalation_events")
    .select("*")
    .eq("incident_id", id)
    .order("level", { ascending: true });
  return data ?? [];
}

export async function reportIncident(params: {
  estateId: string;
  memberId: string;
  category: IncidentCategory;
  description?: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<Incident> {
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      estate_id: params.estateId,
      reporter_member_id: params.memberId,
      category: params.category,
      description: params.description || null,
      lat: params.lat ?? null,
      lng: params.lng ?? null,
      client_token: crypto.randomUUID(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function confirmIncident(
  incidentId: string,
  memberId: string,
  response: ConfirmationResponse,
  note?: string
) {
  const { error } = await supabase.from("incident_confirmations").insert({
    incident_id: incidentId,
    confirmer_member_id: memberId,
    response,
    note: note || null,
  });
  if (error) throw error;
}

export async function setIncidentStatus(incidentId: string, status: IncidentStatus) {
  const { error } = await supabase.from("incidents").update({ status }).eq("id", incidentId);
  if (error) throw error;
}

export async function disputeResolution(incidentId: string, memberId: string, note?: string) {
  const { error } = await supabase.from("incident_resolution_disputes").insert({
    incident_id: incidentId,
    disputer_member_id: memberId,
    note: note || null,
  });
  if (error) throw error;
}

/** Catch up in-estate escalations (Residents → Security → Manager) on load. */
export async function runEscalations() {
  // Best-effort: returns { error } rather than throwing, so the feed still
  // renders even before migration 0002 (the escalation function) is applied.
  await supabase.rpc("catch_up_escalations");
}

// ── Service providers (help contacts on the detail screen) ──
export async function listProviders() {
  const { data } = await supabase
    .from("service_providers")
    .select("id, name, category, phone")
    .eq("is_active", true);
  return data ?? [];
}

// ── Maintenance ───────────────────────────────────────────
export async function listMaintenance() {
  const { data } = await supabase
    .from("maintenance_tickets")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function reportMaintenance(params: {
  estateId: string;
  memberId: string;
  category: MaintenanceCategory;
  description?: string;
}) {
  const { error } = await supabase.from("maintenance_tickets").insert({
    estate_id: params.estateId,
    reporter_member_id: params.memberId,
    category: params.category,
    description: params.description || null,
  });
  if (error) throw error;
}

// ── Members & households (organogram, name lookups) ────────
export async function listEstateMembers(): Promise<MemberRow[]> {
  const { data } = await supabase
    .from("estate_members")
    .select("id, user_id, role, household_id, is_verified, status, profiles(full_name, photo_path)")
    .order("created_at", { ascending: true });
  return (data ?? []).map((m) => {
    const raw = m.profiles as unknown;
    const p = (Array.isArray(raw) ? raw[0] : raw) as
      | { full_name: string | null; photo_path: string | null }
      | null
      | undefined;
    return {
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      household_id: m.household_id,
      is_verified: m.is_verified,
      status: m.status,
      full_name: p?.full_name ?? "Member",
      photo_path: p?.photo_path ?? null,
    };
  });
}

export async function listHouseholds(): Promise<HouseholdRow[]> {
  const { data } = await supabase
    .from("households")
    .select("id, unit_label, landlord_member_id, address")
    .order("unit_label", { ascending: true });
  return data ?? [];
}

export async function verifyOccupant(memberId: string) {
  const { error } = await supabase
    .from("estate_members")
    .update({ is_verified: true, status: "active" })
    .eq("id", memberId);
  if (error) throw error;
}

export async function nudgeMember(
  estateId: string,
  memberId: string,
  nudgerMemberId: string,
  note?: string
) {
  const { error } = await supabase.from("member_verification_nudges").insert({
    estate_id: estateId,
    member_id: memberId,
    nudger_member_id: nudgerMemberId,
    note: note || null,
  });
  if (error) throw error;
}

// ── Visitors ──────────────────────────────────────────────
export async function listBeneficiaries() {
  const { data } = await supabase
    .from("visitor_beneficiaries")
    .select("id, name, photo_path, is_active, host_member_id")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addBeneficiary(
  estateId: string,
  hostMemberId: string,
  name: string,
  photoPath: string
) {
  const { error } = await supabase.from("visitor_beneficiaries").insert({
    estate_id: estateId,
    host_member_id: hostMemberId,
    name,
    photo_path: photoPath,
  });
  if (error) throw error;
}

export async function sendVisitorPass(estateId: string, hostMemberId: string, visitorName: string) {
  const { error } = await supabase.from("visitor_passes").insert({
    estate_id: estateId,
    host_member_id: hostMemberId,
    visitor_name: visitorName,
  });
  if (error) throw error;
}

export async function listVisitorPasses() {
  const { data } = await supabase
    .from("visitor_passes")
    .select("id, visitor_name, created_at, host_member_id")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

// ── Audit (manager only) + escalation policy ──────────────
export async function listAudit() {
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  return data ?? [];
}

export async function listEscalationRules() {
  const { data } = await supabase
    .from("escalation_rules")
    .select("level, timeout_seconds, target_role")
    .order("level", { ascending: true });
  return data ?? [];
}
