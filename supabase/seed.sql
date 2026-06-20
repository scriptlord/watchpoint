-- WatchPoint — seed data (local dev / demo)
-- One demo estate with households, members across all roles, a pending occupant + nudge,
-- visitors (beneficiary + one-off pass), escalation rules, providers, and a sample incident.
-- Note: inserts into auth.users for local Supabase. The on_auth_user_created trigger
-- auto-creates matching profiles from raw_user_meta_data.

-- Estate
insert into estates (id, name, address, city, state, center_lat, center_lng, geofence_radius_m)
values ('11111111-1111-1111-1111-111111111111',
        'Magodo Brook Estate', 'Brook Estate Rd, Magodo GRA Phase 2', 'Lagos', 'Lagos',
        6.6231, 3.3756, 800);

-- Demo auth users (local dev only). Passwords are placeholders; use Supabase Auth in real env.
insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at, aud, role)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'tunde@example.com',
     '{"full_name":"Tunde Adeyemi","phone":"+2348030000001"}', now(), now(), 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'musa@example.com',
     '{"full_name":"Musa Bello","phone":"+2348030000002"}', now(), now(), 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'okoro@example.com',
     '{"full_name":"Mrs. Okoro","phone":"+2348030000003"}', now(), now(), 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'chidi@example.com',
     '{"full_name":"Chidi Nwosu","phone":"+2348030000004"}', now(), now(), 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'ngozi@example.com',
     '{"full_name":"Ngozi Eze","phone":"+2348030000005"}', now(), now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Ensure profiles exist (in case the trigger is not active during seed)
insert into profiles (id, full_name, phone) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Tunde Adeyemi', '+2348030000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Musa Bello',    '+2348030000002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Mrs. Okoro',    '+2348030000003'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Chidi Nwosu',   '+2348030000004'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'Ngozi Eze',     '+2348030000005')
on conflict (id) do nothing;

-- Members:
--   Tunde   = community manager of Block 4 (his own unit)
--   Chidi   = resident, occupant of Block 4 (Tunde is his manager -> Tunde can verify him)
--   Ngozi   = NEW pending occupant of Block 4 (demonstrates nudge + manager verification)
--   Musa    = responder (gate house, no household)
--   Okoro   = community manager of Block 7
insert into estate_members (id, estate_id, user_id, role, house_address, house_lat, house_lng, is_verified, status)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'aaaaaaaa-0000-0000-0000-000000000001', 'community_manager', 'Block 4, Flat 12', 6.6233, 3.3759, true, 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
     'aaaaaaaa-0000-0000-0000-000000000002', 'responder',    'Gate House',       6.6228, 3.3751, true, 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
     'aaaaaaaa-0000-0000-0000-000000000003', 'community_manager', 'Block 7, Flat 1', 6.6229, 3.3752, true, 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
     'aaaaaaaa-0000-0000-0000-000000000004', 'resident',     'Block 4, Flat 3',  6.6235, 3.3760, true, 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
     'aaaaaaaa-0000-0000-0000-000000000005', 'resident',     'Block 4, Flat 9',  6.6234, 3.3758, false, 'pending');

-- Households (the organogram): Block 4 manager = Tunde, Block 7 manager = Mrs. Okoro
insert into households (id, estate_id, landlord_member_id, unit_label, address, lat, lng) values
  ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'bbbbbbbb-0000-0000-0000-000000000001', 'Block 4', 'Block 4, Magodo Brook', 6.6233, 3.3759),
  ('dddddddd-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
     'bbbbbbbb-0000-0000-0000-000000000003', 'Block 7', 'Block 7, Magodo Brook', 6.6229, 3.3752);

-- Attach occupants to households
update estate_members set household_id = 'dddddddd-0000-0000-0000-000000000001'
  where id in ('bbbbbbbb-0000-0000-0000-000000000001',  -- Tunde (landlord + occupant)
               'bbbbbbbb-0000-0000-0000-000000000004',  -- Chidi (tenant)
               'bbbbbbbb-0000-0000-0000-000000000005'); -- Ngozi (pending)
update estate_members set household_id = 'dddddddd-0000-0000-0000-000000000002'
  where id = 'bbbbbbbb-0000-0000-0000-000000000003';    -- Mrs. Okoro

-- A nudge: Chidi nudges Tunde (Block 4 manager) to verify the pending occupant Ngozi
insert into member_verification_nudges (estate_id, member_id, nudger_member_id, note) values
  ('11111111-1111-1111-1111-111111111111',
     'bbbbbbbb-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000004',
     'New person registered under Block 4 — landlord please confirm.');

-- Visitors: Tunde adds a recurring beneficiary (with required photo); Chidi sends a one-off pass
insert into visitor_beneficiaries (estate_id, host_member_id, name, photo_path) values
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000001',
     'Aunty Bisi (family, 1 week)', 'private/beneficiaries/bisi.jpg');
insert into visitor_passes (estate_id, host_member_id, visitor_name) values
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-0000-0000-0000-000000000004',
     'QuickFix mechanic');

-- Escalation rules: residents first, then responder after 3 min, then operator after 6 min,
-- then escalate beyond the estate to an agency after 10 min.
insert into escalation_rules (estate_id, level, timeout_seconds, target_role) values
  ('11111111-1111-1111-1111-111111111111', 1, 0,   'resident'),
  ('11111111-1111-1111-1111-111111111111', 2, 180, 'responder'),
  ('11111111-1111-1111-1111-111111111111', 3, 360, 'community_manager'),
  ('11111111-1111-1111-1111-111111111111', 4, 600, 'agency_operator');

-- Service providers (estate-specific + one shared/global with null estate)
insert into service_providers (estate_id, name, category, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Magodo Towing Services', 'tow',       '+2348040000001'),
  ('11111111-1111-1111-1111-111111111111', 'QuickFix Auto',          'mechanic',  '+2348040000002'),
  ('11111111-1111-1111-1111-111111111111', 'SafeLock Locksmith',     'locksmith', '+2348040000003'),
  (null,                                   'Lagos 24/7 Plumbers',    'plumber',   '+2348040000004');

-- One sample resolved incident for the timeline/demo (reporter = Tunde)
insert into incidents (id, estate_id, reporter_member_id, category, description, lat, lng, status, client_token, created_at, acknowledged_at, resolved_at)
values ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'bbbbbbbb-0000-0000-0000-000000000001', 'fire', 'Kitchen fire, Block 4', 6.6233, 3.3759,
        'resolved', gen_random_uuid(), now() - interval '2 hours', now() - interval '2 hours' + interval '90 seconds', now() - interval '1 hour');

insert into incident_confirmations (incident_id, confirmer_member_id, response, note, lat, lng) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'confirm', 'Smoke visible from the gate camera', 6.6228, 3.3751),
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004', 'confirm', 'I can smell smoke near Block 4', 6.6235, 3.3760);

insert into incident_updates (incident_id, actor_member_id, update_type, new_status, note) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'status_change', 'acknowledged', 'Security en route'),
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'status_change', 'on_scene',     'Extinguisher deployed'),
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'status_change', 'resolved',     'Fire out, no injuries — reporter stood down');
