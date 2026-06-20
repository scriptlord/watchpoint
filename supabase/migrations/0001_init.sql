-- WatchPoint — initial schema
-- Estate-first incident response network. Estate = tenant; RLS isolates each estate.
-- Target: Supabase (Postgres). Portable to plain Postgres (drop auth.users references / Supabase storage notes).

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ============================================================
-- Enums
-- ============================================================
create type member_role        as enum ('resident', 'community_manager', 'responder', 'agency_operator', 'platform_admin');
create type member_status      as enum ('pending', 'active', 'suspended');
create type incident_category  as enum ('fire', 'medical', 'security', 'accident', 'intrusion', 'flood', 'other');
create type incident_status    as enum ('open', 'acknowledged', 'en_route', 'on_scene', 'resolved', 'resolution_disputed');
create type incident_verification_status as enum ('unverified', 'likely', 'verified', 'disputed');
create type confirmation_response as enum ('confirm', 'deny', 'unsure');
create type maintenance_category as enum ('streetlight', 'drainage', 'fence', 'pothole', 'camera', 'generator', 'waste', 'other');
create type maintenance_status as enum ('open', 'assigned', 'in_progress', 'resolved');
create type provider_category  as enum ('tow', 'mechanic', 'locksmith', 'plumber', 'electrician', 'other');
create type audit_action       as enum ('create', 'status_change', 'confirm_incident', 'dispute_resolution', 'verify_member', 'view_sensitive', 'export', 'visitor_access', 'nudge_member');

-- ============================================================
-- Tables
-- ============================================================

-- Tenant root
create table estates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  address           text,
  city              text,
  state             text default 'Lagos',
  center_lat        double precision,
  center_lng        double precision,
  geofence_radius_m integer not null default 1000,
  created_at        timestamptz not null default now()
);

-- Extends Supabase auth.users. Minimal PII by design (NDPR).
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  photo_path  text,                            -- facial capture from onboarding (gate identity)
  created_at  timestamptz not null default now()
);

-- Membership + role + verification + house. Powers all RLS.
create table estate_members (
  id            uuid primary key default gen_random_uuid(),
  estate_id     uuid not null references estates(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  role          member_role not null default 'resident',
  house_address text,
  house_lat     double precision,
  house_lng     double precision,
  photo_path    text,                          -- per-membership facial capture (gate identity)
  is_verified   boolean not null default false,
  status        member_status not null default 'pending',
  created_at    timestamptz not null default now(),
  unique (estate_id, user_id)
);

-- Household / organogram: each unit has a landlord (the "community manager" for that house),
-- accountable for the occupants attached to it. Occupants link via estate_members.household_id.
-- This models the "parent (landlord) -> children (occupants)" household tree.
create table households (
  id                 uuid primary key default gen_random_uuid(),
  estate_id          uuid not null references estates(id) on delete cascade,
  landlord_member_id uuid references estate_members(id) on delete set null,
  unit_label         text not null,           -- e.g. 'Block 4, Flat 12'
  address            text,
  lat                double precision,
  lng                double precision,
  created_at         timestamptz not null default now()
);

-- Occupants hang off a household (the "children" of the landlord parent).
-- Circular FK with households is resolved by adding the column after both tables exist.
alter table estate_members
  add column household_id uuid references households(id) on delete set null;

-- Emergency Mode
create table incidents (
  id                 uuid primary key default gen_random_uuid(),
  estate_id          uuid not null references estates(id) on delete cascade,
  reporter_member_id uuid not null references estate_members(id) on delete restrict,
  category           incident_category not null,
  description        text,
  voice_note_path    text,                       -- private storage path, NOT a public URL
  voice_summary      text,
  lat                double precision,
  lng                double precision,
  status             incident_status not null default 'open',
  verification_status incident_verification_status not null default 'unverified',
  confirmation_count integer not null default 0,
  denial_count       integer not null default 0,
  confidence_score   integer not null default 0,
  resolution_dispute_count integer not null default 0,
  is_flagged_for_review boolean not null default false,
  is_off_estate      boolean not null default false,
  client_token       uuid not null,              -- device-generated idempotency key
  version            integer not null default 1, -- optimistic lock
  created_at         timestamptz not null default now(),
  acknowledged_at    timestamptz,
  resolved_at        timestamptz,
  unique (reporter_member_id, client_token)       -- offline/retry-safe: no duplicate alerts
);

-- Community/geographic verification: nearby estate members confirm or dispute a report.
create table incident_confirmations (
  id                  uuid primary key default gen_random_uuid(),
  incident_id          uuid not null references incidents(id) on delete cascade,
  confirmer_member_id  uuid not null references estate_members(id) on delete restrict,
  response            confirmation_response not null,
  note                text,
  photo_path          text,
  lat                 double precision,
  lng                 double precision,
  created_at          timestamptz not null default now(),
  unique (incident_id, confirmer_member_id)
);

-- After a responder marks an incident resolved, verified members can dispute the resolution.
-- A dispute does not reopen the incident directly. Enough disputes flag it for review.
create table incident_resolution_disputes (
  id                  uuid primary key default gen_random_uuid(),
  incident_id          uuid not null references incidents(id) on delete cascade,
  disputer_member_id   uuid not null references estate_members(id) on delete restrict,
  note                text,
  photo_path          text,
  lat                 double precision,
  lng                 double precision,
  created_at          timestamptz not null default now(),
  unique (incident_id, disputer_member_id)
);

-- Append-only status loop / timeline (source of truth for "what happened")
create table incident_updates (
  id               uuid primary key default gen_random_uuid(),
  incident_id      uuid not null references incidents(id) on delete cascade,
  actor_member_id  uuid references estate_members(id) on delete set null,  -- null = system
  update_type      text not null,               -- 'status_change' | 'comment' | 'escalation'
  new_status       incident_status,
  note             text,
  created_at       timestamptz not null default now()
);

-- Per-estate escalation config
create table escalation_rules (
  id              uuid primary key default gen_random_uuid(),
  estate_id       uuid not null references estates(id) on delete cascade,
  level           integer not null,
  timeout_seconds integer not null,
  target_role     member_role not null,
  created_at      timestamptz not null default now(),
  unique (estate_id, level)
);

-- What actually fired
create table escalation_events (
  id           uuid primary key default gen_random_uuid(),
  incident_id  uuid not null references incidents(id) on delete cascade,
  level        integer not null,
  target_role  member_role not null,
  triggered_at timestamptz not null default now()
);

-- Maintenance Mode
create table maintenance_tickets (
  id                    uuid primary key default gen_random_uuid(),
  estate_id             uuid not null references estates(id) on delete cascade,
  reporter_member_id    uuid not null references estate_members(id) on delete restrict,
  category              maintenance_category not null,
  description           text,
  photo_path            text,
  status                maintenance_status not null default 'open',
  assigned_to_member_id uuid references estate_members(id) on delete set null,
  version               integer not null default 1,
  created_at            timestamptz not null default now(),
  resolved_at           timestamptz
);

-- Service provider directory (estate-specific or shared/global when estate_id is null)
create table service_providers (
  id         uuid primary key default gen_random_uuid(),
  estate_id  uuid references estates(id) on delete cascade,
  name       text not null,
  category   provider_category not null,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Pending-occupant verification nudges. If a landlord is slow to verify a new occupant,
-- any verified estate member can publicly nudge them. Nudges are visible to the whole estate
-- (transparency: "House 2 already nudged; I can see that and nudge too").
create table member_verification_nudges (
  id               uuid primary key default gen_random_uuid(),
  estate_id        uuid not null references estates(id) on delete cascade,
  member_id        uuid not null references estate_members(id) on delete cascade,   -- the pending occupant
  nudger_member_id uuid not null references estate_members(id) on delete cascade,   -- who nudged
  note             text,
  created_at       timestamptz not null default now(),
  unique (member_id, nudger_member_id)
);

-- Recurring visitors a resident vouches for. Tied to the host member's profile, NOT broadcast.
-- A photo is required so security cannot be fooled by someone reusing a beneficiary's name.
create table visitor_beneficiaries (
  id             uuid primary key default gen_random_uuid(),
  estate_id      uuid not null references estates(id) on delete cascade,
  host_member_id uuid not null references estate_members(id) on delete cascade,
  name           text not null,
  photo_path     text not null,               -- required: anti-impersonation at the gate
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- One-off visitor passes (mechanic, dry cleaner, single visit). Pushed to security only,
-- no approval step. Recorded for after-the-fact investigation (audit "cold storage").
create table visitor_passes (
  id             uuid primary key default gen_random_uuid(),
  estate_id      uuid not null references estates(id) on delete cascade,
  host_member_id uuid not null references estate_members(id) on delete cascade,
  visitor_name   text not null,
  created_at     timestamptz not null default now()
);

-- Push notification targets
create table device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text not null unique,
  platform   text,                               -- 'ios' | 'android' | 'web'
  created_at timestamptz not null default now()
);

-- NDPR accountability: who did what (insert-only)
create table audit_log (
  id             bigint generated always as identity primary key,
  actor_user_id  uuid references profiles(id) on delete set null,
  estate_id      uuid,
  action         audit_action not null,
  entity_type    text,
  entity_id      uuid,
  detail         jsonb,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_incidents_estate_feed     on incidents (estate_id, created_at desc, id);  -- feed + cursor pagination
create index idx_incidents_estate_status   on incidents (estate_id, status);
create index idx_incidents_estate_verify   on incidents (estate_id, verification_status, created_at desc);
create index idx_confirmations_incident    on incident_confirmations (incident_id, created_at);
create index idx_confirmations_member      on incident_confirmations (confirmer_member_id);
create index idx_resolution_disputes_incident on incident_resolution_disputes (incident_id, created_at);
create index idx_resolution_disputes_member   on incident_resolution_disputes (disputer_member_id);
create index idx_members_user              on estate_members (user_id);
create index idx_members_estate            on estate_members (estate_id);
create index idx_members_estate_role       on estate_members (estate_id, role);
create index idx_members_household         on estate_members (household_id);
create index idx_incident_updates_incident on incident_updates (incident_id, created_at);
create index idx_maint_estate_status       on maintenance_tickets (estate_id, status);
create index idx_device_tokens_user        on device_tokens (user_id);
create index idx_audit_estate              on audit_log (estate_id, created_at desc);
create index idx_households_estate         on households (estate_id);
create index idx_households_landlord       on households (landlord_member_id);
create index idx_nudges_member             on member_verification_nudges (member_id, created_at);
create index idx_nudges_estate             on member_verification_nudges (estate_id, created_at desc);
create index idx_beneficiaries_host        on visitor_beneficiaries (host_member_id);
create index idx_beneficiaries_estate      on visitor_beneficiaries (estate_id);
create index idx_passes_estate             on visitor_passes (estate_id, created_at desc);
create index idx_passes_host               on visitor_passes (host_member_id);

-- ============================================================
-- RLS helper functions
-- ============================================================
-- Estates where the calling user is an ACTIVE member.
create or replace function current_user_estate_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select estate_id
  from estate_members
  where user_id = auth.uid()
    and status = 'active';
$$;

-- The calling user's role in a given estate (null if not a member).
create or replace function user_role_in(p_estate_id uuid)
returns member_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from estate_members
  where user_id = auth.uid()
    and estate_id = p_estate_id
    and status = 'active'
  limit 1;
$$;

-- Households the calling user manages as the assigned community manager (the per-house landlord).
-- SECURITY DEFINER so it bypasses RLS and cannot cause recursive policy evaluation on estate_members.
create or replace function current_user_managed_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select h.id
  from households h
  join estate_members em on em.id = h.landlord_member_id
  where em.user_id = auth.uid()
    and em.status = 'active';
$$;

-- ============================================================
-- Triggers / functions
-- ============================================================

-- Auto-create a profile row on signup.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- On incident status change: enforce resolution authority, stamp timestamps, bump version,
-- log timeline + audit.
create or replace function set_incident_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    -- Resolution authority: ONLY the member who raised the alarm can mark it 'resolved'
    -- ("I'm fine now"). No exceptions — an alarm stays open until the person who raised it
    -- is safe enough to stand it down. Other live status moves (acknowledged/en_route/on_scene/
    -- open) are staff-only. 'resolution_disputed' is set by the dispute trigger (system) and is exempt.
    if new.status <> 'resolution_disputed' then
      if new.status = 'resolved' then
        if not exists (select 1 from estate_members em
                       where em.id = new.reporter_member_id and em.user_id = auth.uid()) then
          raise exception 'Only the member who raised the alarm can mark it resolved';
        end if;
      elsif user_role_in(new.estate_id) not in
            ('responder', 'community_manager', 'agency_operator', 'platform_admin') then
        raise exception 'Only responders or community managers can change incident status';
      end if;
    end if;

    new.version := old.version + 1;
    if new.status = 'acknowledged' and new.acknowledged_at is null then
      new.acknowledged_at := now();
    end if;
    if new.status = 'resolved' and new.resolved_at is null then
      new.resolved_at := now();
    end if;

    insert into incident_updates (incident_id, actor_member_id, update_type, new_status)
    values (new.id, null, 'status_change', new.status);

    insert into audit_log (actor_user_id, estate_id, action, entity_type, entity_id, detail)
    values (auth.uid(), new.estate_id, 'status_change', 'incident', new.id,
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create trigger trg_incident_status
  before update on incidents
  for each row execute function set_incident_timestamps();

-- After a community confirmation, recalculate confidence fields on the incident.
create or replace function refresh_incident_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident_id uuid;
  v_confirmations integer;
  v_denials integer;
  v_unsure integer;
  v_score integer;
  v_status incident_verification_status;
  v_estate_id uuid;
begin
  v_incident_id := coalesce(new.incident_id, old.incident_id);

  select
    count(*) filter (where response = 'confirm'),
    count(*) filter (where response = 'deny'),
    count(*) filter (where response = 'unsure')
  into v_confirmations, v_denials, v_unsure
  from incident_confirmations
  where incident_id = v_incident_id;

  v_score := greatest(0, least(100, (v_confirmations * 20) + (v_unsure * 5) - (v_denials * 25)));

  if v_denials >= 2 and v_denials >= v_confirmations then
    v_status := 'disputed';
  elsif v_confirmations >= 5 and v_confirmations >= (v_denials * 2) then
    v_status := 'verified';
  elsif v_confirmations >= 2 and v_confirmations > v_denials then
    v_status := 'likely';
  else
    v_status := 'unverified';
  end if;

  update incidents
  set confirmation_count = v_confirmations,
      denial_count = v_denials,
      confidence_score = v_score,
      verification_status = v_status
  where id = v_incident_id
  returning estate_id into v_estate_id;

  insert into audit_log (actor_user_id, estate_id, action, entity_type, entity_id, detail)
  values (
    auth.uid(),
    v_estate_id,
    'confirm_incident',
    'incident',
    v_incident_id,
    jsonb_build_object(
      'confirmations', v_confirmations,
      'denials', v_denials,
      'unsure', v_unsure,
      'confidence_score', v_score,
      'verification_status', v_status
    )
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_incident_confirmation_refresh
  after insert or update or delete on incident_confirmations
  for each row execute function refresh_incident_verification();

-- After resolution disputes, flag resolved incidents for responder/operator review.
create or replace function refresh_resolution_disputes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident_id uuid;
  v_disputes integer;
  v_estate_id uuid;
  v_old_status incident_status;
begin
  v_incident_id := coalesce(new.incident_id, old.incident_id);

  select count(*)
  into v_disputes
  from incident_resolution_disputes
  where incident_id = v_incident_id;

  select estate_id, status
  into v_estate_id, v_old_status
  from incidents
  where id = v_incident_id;

  if v_disputes >= 2 and v_old_status = 'resolved' then
    update incidents
    set resolution_dispute_count = v_disputes,
        is_flagged_for_review = true,
        status = 'resolution_disputed',
        version = version + 1
    where id = v_incident_id;

    insert into incident_updates (incident_id, actor_member_id, update_type, new_status, note)
    values (
      v_incident_id,
      null,
      'resolution_disputed',
      'resolution_disputed',
      'Resolution disputed by multiple verified community members. Responder/operator review required.'
    );
  else
    update incidents
    set resolution_dispute_count = v_disputes
    where id = v_incident_id;
  end if;

  insert into audit_log (actor_user_id, estate_id, action, entity_type, entity_id, detail)
  values (
    auth.uid(),
    v_estate_id,
    'dispute_resolution',
    'incident',
    v_incident_id,
    jsonb_build_object('resolution_dispute_count', v_disputes)
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_resolution_dispute_refresh
  after insert or update or delete on incident_resolution_disputes
  for each row execute function refresh_resolution_disputes();

-- Maintenance: stamp resolved_at, bump version.
create or replace function set_maintenance_resolved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.version := old.version + 1;
    if new.status = 'resolved' and new.resolved_at is null then
      new.resolved_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_maintenance_status
  before update on maintenance_tickets
  for each row execute function set_maintenance_resolved_at();

-- Visitor activity -> audit "cold storage" for later investigation.
create or replace function log_visitor_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (actor_user_id, estate_id, action, entity_type, entity_id, detail)
  values (auth.uid(), new.estate_id, 'visitor_access', tg_table_name, new.id, to_jsonb(new));
  return new;
end;
$$;

create trigger trg_log_beneficiary
  after insert on visitor_beneficiaries
  for each row execute function log_visitor_event();

create trigger trg_log_visitor_pass
  after insert on visitor_passes
  for each row execute function log_visitor_event();

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table estates             enable row level security;
alter table profiles            enable row level security;
alter table estate_members      enable row level security;
alter table households          enable row level security;
alter table incidents           enable row level security;
alter table incident_confirmations enable row level security;
alter table incident_resolution_disputes enable row level security;
alter table incident_updates    enable row level security;
alter table escalation_rules    enable row level security;
alter table escalation_events   enable row level security;
alter table maintenance_tickets enable row level security;
alter table service_providers   enable row level security;
alter table member_verification_nudges enable row level security;
alter table visitor_beneficiaries enable row level security;
alter table visitor_passes      enable row level security;
alter table device_tokens       enable row level security;
alter table audit_log           enable row level security;

-- estates: members can see their estate
create policy estates_select on estates
  for select using (id in (select current_user_estate_ids()));

-- profiles: a user manages only their own row
create policy profiles_self_select on profiles
  for select using (id = auth.uid());
create policy profiles_self_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- estate_members: see members of your estates; users can request membership;
-- a new occupant is verified by the community manager of their OWN household (or platform_admin).
create policy members_select on estate_members
  for select using (estate_id in (select current_user_estate_ids()));
create policy members_insert_self on estate_members
  for insert with check (user_id = auth.uid());
create policy members_update_admin on estate_members
  for update using (
    household_id in (select current_user_managed_household_ids())
    or user_role_in(estate_id) = 'platform_admin'
  )
  with check (
    household_id in (select current_user_managed_household_ids())
    or user_role_in(estate_id) = 'platform_admin'
  );

-- households: everyone in the estate sees the organogram; operators create/assign landlords.
create policy households_select on households
  for select using (estate_id in (select current_user_estate_ids()));
create policy households_admin on households
  for all using (user_role_in(estate_id) in ('community_manager', 'platform_admin'))
  with check (user_role_in(estate_id) in ('community_manager', 'platform_admin'));

-- incidents: read within estate; reporters insert their own; staff change live status;
-- the reporter can update their own incident (used to mark 'resolved' — enforced by trigger).
create policy incidents_select on incidents
  for select using (estate_id in (select current_user_estate_ids()));
create policy incidents_insert on incidents
  for insert with check (
    estate_id in (select current_user_estate_ids())
    and reporter_member_id in (
      select id from estate_members where user_id = auth.uid() and estate_id = incidents.estate_id
    )
);
create policy incidents_update_staff on incidents
  for update using (user_role_in(estate_id) in ('responder', 'community_manager', 'agency_operator', 'platform_admin'))
  with check (user_role_in(estate_id) in ('responder', 'community_manager', 'agency_operator', 'platform_admin'));
create policy incidents_update_reporter on incidents
  for update using (
    estate_id in (select current_user_estate_ids())
    and reporter_member_id in (
      select id from estate_members where user_id = auth.uid() and estate_id = incidents.estate_id
    )
  )
  with check (
    estate_id in (select current_user_estate_ids())
    and reporter_member_id in (
      select id from estate_members where user_id = auth.uid() and estate_id = incidents.estate_id
    )
  );

-- incident confirmations: same-estate members can read; verified active members can confirm, but not their own report.
create policy incident_confirmations_select on incident_confirmations
  for select using (
    incident_id in (select id from incidents where estate_id in (select current_user_estate_ids()))
  );
create policy incident_confirmations_insert on incident_confirmations
  for insert with check (
    confirmer_member_id in (
      select id
      from estate_members
      where user_id = auth.uid()
        and status = 'active'
        and is_verified = true
    )
    and incident_id in (
      select i.id
      from incidents i
      join estate_members em on em.id = incident_confirmations.confirmer_member_id
      where i.estate_id = em.estate_id
        and i.reporter_member_id <> incident_confirmations.confirmer_member_id
    )
  );

-- resolution disputes: verified same-estate members can dispute a resolved incident once.
-- This does not let them reopen it directly; enough disputes trigger resolution_disputed.
create policy resolution_disputes_select on incident_resolution_disputes
  for select using (
    incident_id in (select id from incidents where estate_id in (select current_user_estate_ids()))
  );
create policy resolution_disputes_insert on incident_resolution_disputes
  for insert with check (
    disputer_member_id in (
      select id
      from estate_members
      where user_id = auth.uid()
        and status = 'active'
        and is_verified = true
    )
    and incident_id in (
      select i.id
      from incidents i
      join estate_members em on em.id = incident_resolution_disputes.disputer_member_id
      where i.estate_id = em.estate_id
        and i.status = 'resolved'
    )
  );

-- incident_updates: members can read safe timeline; only responder/operator roles write official updates
create policy incident_updates_select on incident_updates
  for select using (
    incident_id in (select id from incidents where estate_id in (select current_user_estate_ids()))
  );
create policy incident_updates_insert on incident_updates
  for insert with check (
    incident_id in (
      select id
      from incidents
      where estate_id in (select current_user_estate_ids())
        and user_role_in(estate_id) in ('responder', 'community_manager', 'agency_operator', 'platform_admin')
    )
    and (
      actor_member_id is null
      or actor_member_id in (
        select em.id
        from estate_members em
        join incidents i on i.id = incident_updates.incident_id
        where em.user_id = auth.uid()
          and em.estate_id = i.estate_id
      )
    )
  );

-- escalation_rules / events: read within estate; rules managed by community/platform operators
create policy escalation_rules_select on escalation_rules
  for select using (estate_id in (select current_user_estate_ids()));
create policy escalation_rules_admin on escalation_rules
  for all using (user_role_in(estate_id) in ('community_manager', 'platform_admin'))
  with check (user_role_in(estate_id) in ('community_manager', 'platform_admin'));
create policy escalation_events_select on escalation_events
  for select using (
    incident_id in (select id from incidents where estate_id in (select current_user_estate_ids()))
  );

-- maintenance: read within estate; reporters insert own; responders/operators update
create policy maint_select on maintenance_tickets
  for select using (estate_id in (select current_user_estate_ids()));
create policy maint_insert on maintenance_tickets
  for insert with check (
    estate_id in (select current_user_estate_ids())
    and reporter_member_id in (
      select id from estate_members where user_id = auth.uid() and estate_id = maintenance_tickets.estate_id
    )
);
create policy maint_update_staff on maintenance_tickets
  for update using (user_role_in(estate_id) in ('responder', 'community_manager', 'agency_operator', 'platform_admin'))
  with check (user_role_in(estate_id) in ('responder', 'community_manager', 'agency_operator', 'platform_admin'));

-- service_providers: estate members read their estate's + shared (null estate)
create policy providers_select on service_providers
  for select using (estate_id is null or estate_id in (select current_user_estate_ids()));
create policy providers_admin on service_providers
  for all using (estate_id is not null and user_role_in(estate_id) in ('community_manager', 'platform_admin'))
  with check (estate_id is not null and user_role_in(estate_id) in ('community_manager', 'platform_admin'));

-- verification nudges: visible to the whole estate (transparency); verified members can nudge.
create policy nudges_select on member_verification_nudges
  for select using (estate_id in (select current_user_estate_ids()));
create policy nudges_insert on member_verification_nudges
  for insert with check (
    nudger_member_id in (
      select id from estate_members
      where user_id = auth.uid() and status = 'active' and is_verified = true
    )
    and estate_id in (select current_user_estate_ids())
  );

-- beneficiaries: a host manages their own; security/operators can read for gate checks.
-- Visitor lists are private to the host and SECURITY (responders) only — a tenant's visitors
-- are NOT exposed to the community manager (only security is notified at the gate).
create policy beneficiaries_select on visitor_beneficiaries
  for select using (
    host_member_id in (select id from estate_members where user_id = auth.uid())
    or user_role_in(estate_id) = 'responder'
  );
create policy beneficiaries_manage on visitor_beneficiaries
  for all using (
    host_member_id in (select id from estate_members where user_id = auth.uid())
  )
  with check (
    host_member_id in (
      select id from estate_members
      where user_id = auth.uid() and estate_id = visitor_beneficiaries.estate_id
    )
  );

-- one-off passes: a host creates their own; security/operators can read them.
create policy passes_select on visitor_passes
  for select using (
    host_member_id in (select id from estate_members where user_id = auth.uid())
    or user_role_in(estate_id) = 'responder'
  );
create policy passes_insert on visitor_passes
  for insert with check (
    host_member_id in (
      select id from estate_members
      where user_id = auth.uid() and estate_id = visitor_passes.estate_id
    )
  );

-- device_tokens: a user manages only their own
create policy device_tokens_self on device_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_log: insert allowed for members; only operators can read; no update/delete
create policy audit_insert on audit_log
  for insert with check (estate_id in (select current_user_estate_ids()));
create policy audit_select_admin on audit_log
  for select using (user_role_in(estate_id) in ('community_manager', 'platform_admin'));

-- ============================================================
-- Realtime (Supabase): live incident feed + status loop + community signals
-- ============================================================
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table incident_confirmations;
alter publication supabase_realtime add table incident_resolution_disputes;
alter publication supabase_realtime add table incident_updates;
alter publication supabase_realtime add table member_verification_nudges;
alter publication supabase_realtime add table visitor_passes;
