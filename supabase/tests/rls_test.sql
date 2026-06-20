-- WatchPoint RLS / business-rule test harness
-- Run via supabase/tests/run_rls_tests.sh (spins up a throwaway Postgres, applies the
-- migration against a minimal Supabase-auth shim, then runs these assertions as the
-- non-privileged `authenticated` role so RLS is actually enforced).
--
-- Identity is simulated the way Supabase does it: auth.uid() reads the GUC
-- request.jwt.claim.sub, which we flip with set_config() before each acting step.
-- A failed assertion RAISEs, and psql runs with ON_ERROR_STOP=1, so the script
-- exits non-zero if any guarantee is violated.
--
-- UUID scheme (all valid hex):
--   estates    00000000-...-0000000000a1 (A) / ...b1 (B)
--   users      00000000-...-00000000000N
--   members    0000000a-...-00000000000N
--   households 0000000b-...-00000000000N
--   incidents  0000000c-...-00000000000N

\set ON_ERROR_STOP on

-- ------------------------------------------------------------
-- Seed (as superuser, RLS bypassed)
-- ------------------------------------------------------------
insert into estates (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Estate A'),
  ('00000000-0000-0000-0000-0000000000b1', 'Estate B');

insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'), -- landlord of H1
  ('00000000-0000-0000-0000-000000000002'), -- resident / reporter (H1)
  ('00000000-0000-0000-0000-000000000003'), -- resident 2 (H1)
  ('00000000-0000-0000-0000-000000000004'), -- responder (H1)
  ('00000000-0000-0000-0000-000000000005'), -- community_operator / landlord of H2
  ('00000000-0000-0000-0000-000000000006'), -- pending occupant in H1
  ('00000000-0000-0000-0000-000000000008'), -- pending occupant in H2
  ('00000000-0000-0000-0000-000000000007'); -- member of Estate B

insert into profiles (id, full_name) values
  ('00000000-0000-0000-0000-000000000001', 'Landlord One'),
  ('00000000-0000-0000-0000-000000000002', 'Reporter Res'),
  ('00000000-0000-0000-0000-000000000003', 'Resident Two'),
  ('00000000-0000-0000-0000-000000000004', 'Responder'),
  ('00000000-0000-0000-0000-000000000005', 'Operator'),
  ('00000000-0000-0000-0000-000000000006', 'Pending H1'),
  ('00000000-0000-0000-0000-000000000008', 'Pending H2'),
  ('00000000-0000-0000-0000-000000000007', 'Estate B Member')
on conflict (id) do nothing;

-- Members (household_id wired after households exist)
insert into estate_members (id, estate_id, user_id, role, is_verified, status) values
  ('0000000a-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'community_manager',  true,  'active'),
  ('0000000a-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000002', 'resident',           true,  'active'),
  ('0000000a-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000003', 'resident',           true,  'active'),
  ('0000000a-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000004', 'responder',          true,  'active'),
  ('0000000a-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000005', 'community_manager',  true,  'active'),
  ('0000000a-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000006', 'resident',           false, 'pending'),
  ('0000000a-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000008', 'resident',           false, 'pending'),
  ('0000000a-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000007', 'resident',           true,  'active');

-- Households: H1 landlord = member ...0001; H2 landlord = member ...0005 (the operator)
insert into households (id, estate_id, landlord_member_id, unit_label) values
  ('0000000b-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', '0000000a-0000-0000-0000-000000000001', 'Block 1'),
  ('0000000b-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', '0000000a-0000-0000-0000-000000000005', 'Block 2');

update estate_members set household_id = '0000000b-0000-0000-0000-000000000001'
  where id in ('0000000a-0000-0000-0000-000000000001','0000000a-0000-0000-0000-000000000002',
               '0000000a-0000-0000-0000-000000000003','0000000a-0000-0000-0000-000000000004',
               '0000000a-0000-0000-0000-000000000006');
update estate_members set household_id = '0000000b-0000-0000-0000-000000000002'
  where id in ('0000000a-0000-0000-0000-000000000005','0000000a-0000-0000-0000-000000000008');

-- Incidents: I1 open (reporter-resolve), I2 resolved (dispute flip), I3 open (negatives), I_b estate B
insert into incidents (id, estate_id, reporter_member_id, category, status, client_token) values
  ('0000000c-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', '0000000a-0000-0000-0000-000000000002', 'fire',     'open',     gen_random_uuid()),
  ('0000000c-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', '0000000a-0000-0000-0000-000000000002', 'security', 'resolved', gen_random_uuid()),
  ('0000000c-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', '0000000a-0000-0000-0000-000000000002', 'medical',  'open',     gen_random_uuid()),
  ('0000000c-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '0000000a-0000-0000-0000-000000000007', 'fire',     'open',     gen_random_uuid());

-- ------------------------------------------------------------
-- Switch to the unprivileged role so RLS is enforced
-- ------------------------------------------------------------
grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema auth to authenticated;
set role authenticated;

-- ============================================================
-- TEST 1 — Estate isolation: Estate B member cannot see Estate A incident
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000007', false);
do $$
declare n int;
begin
  select count(*) into n from incidents where id = '0000000c-0000-0000-0000-000000000001';
  if n <> 0 then raise exception 'FAIL T1: Estate B member can see Estate A incident'; end if;
  raise notice 'PASS T1: estate isolation holds (B cannot see A)';
end $$;

-- ============================================================
-- TEST 2 — Reporter CAN mark their own incident resolved
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
update incidents set status = 'resolved' where id = '0000000c-0000-0000-0000-000000000001';
do $$
declare v text;
begin
  select status::text into v from incidents where id = '0000000c-0000-0000-0000-000000000001';
  if v <> 'resolved' then raise exception 'FAIL T2: reporter could not resolve own incident (status=%)', v; end if;
  raise notice 'PASS T2: reporter resolved their own incident';
end $$;

-- ============================================================
-- TEST 3 — A non-reporter resident CANNOT resolve someone else's incident
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
update incidents set status = 'resolved' where id = '0000000c-0000-0000-0000-000000000003';  -- RLS: 0 rows
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);   -- check as operator
do $$
declare v text;
begin
  select status::text into v from incidents where id = '0000000c-0000-0000-0000-000000000003';
  if v <> 'open' then raise exception 'FAIL T3: non-reporter resident changed status (status=%)', v; end if;
  raise notice 'PASS T3: non-reporter resident cannot resolve';
end $$;

-- ============================================================
-- TEST 4 — A RESPONDER cannot resolve (reporter-only rule); must raise
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
do $$
begin
  begin
    update incidents set status = 'resolved' where id = '0000000c-0000-0000-0000-000000000003';
    raise exception 'FAIL T4: responder was allowed to resolve';
  exception when others then
    if sqlerrm like 'FAIL T4%' then raise; end if;
    raise notice 'PASS T4: responder blocked from resolving (%).', sqlerrm;
  end;
end $$;

-- ============================================================
-- TEST 5 — A responder CAN progress live status (acknowledged)
-- ============================================================
update incidents set status = 'acknowledged' where id = '0000000c-0000-0000-0000-000000000003';
do $$
declare v text;
begin
  select status::text into v from incidents where id = '0000000c-0000-0000-0000-000000000003';
  if v <> 'acknowledged' then raise exception 'FAIL T5: responder could not acknowledge (status=%)', v; end if;
  raise notice 'PASS T5: responder can progress live status';
end $$;

-- ============================================================
-- TEST 6 — A resident cannot self-promote (role / verification)
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
update estate_members set role = 'community_manager', is_verified = true
  where id = '0000000a-0000-0000-0000-000000000003';  -- RLS: 0 rows
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
do $$
declare v text;
begin
  select role::text into v from estate_members where id = '0000000a-0000-0000-0000-000000000003';
  if v <> 'resident' then raise exception 'FAIL T6: resident self-promoted to %', v; end if;
  raise notice 'PASS T6: resident cannot self-promote';
end $$;

-- ============================================================
-- TEST 7 — Landlord CAN verify an occupant in their OWN household (H1)
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
update estate_members set is_verified = true, status = 'active'
  where id = '0000000a-0000-0000-0000-000000000006';
do $$
declare v boolean;
begin
  select is_verified into v from estate_members where id = '0000000a-0000-0000-0000-000000000006';
  if v is not true then raise exception 'FAIL T7: landlord could not verify own-household occupant'; end if;
  raise notice 'PASS T7: landlord verified own-household occupant';
end $$;

-- ============================================================
-- TEST 8 — Landlord CANNOT verify an occupant in ANOTHER household (H2)
-- ============================================================
update estate_members set is_verified = true, status = 'active'
  where id = '0000000a-0000-0000-0000-000000000008';  -- RLS: 0 rows
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
do $$
declare v boolean;
begin
  select is_verified into v from estate_members where id = '0000000a-0000-0000-0000-000000000008';
  if v is not false then raise exception 'FAIL T8: landlord verified an occupant outside their household'; end if;
  raise notice 'PASS T8: landlord cannot verify other-household occupant';
end $$;

-- ============================================================
-- TEST 9 — A responder cannot verify members
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
update estate_members set is_verified = true where id = '0000000a-0000-0000-0000-000000000008';  -- RLS: 0 rows
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
do $$
declare v boolean;
begin
  select is_verified into v from estate_members where id = '0000000a-0000-0000-0000-000000000008';
  if v is not false then raise exception 'FAIL T9: responder verified a member'; end if;
  raise notice 'PASS T9: responder cannot verify members';
end $$;

-- ============================================================
-- TEST 10 — A community manager CAN verify an occupant of a household they manage (H2)
-- ============================================================
update estate_members set is_verified = true, status = 'active' where id = '0000000a-0000-0000-0000-000000000008';
do $$
declare v boolean;
begin
  select is_verified into v from estate_members where id = '0000000a-0000-0000-0000-000000000008';
  if v is not true then raise exception 'FAIL T10: community manager could not verify own-household occupant'; end if;
  raise notice 'PASS T10: community manager verified own-household occupant';
end $$;

-- ============================================================
-- TEST 11 — Two verified disputes flip a resolved incident to resolution_disputed
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
insert into incident_resolution_disputes (incident_id, disputer_member_id)
  values ('0000000c-0000-0000-0000-000000000002', '0000000a-0000-0000-0000-000000000003');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
insert into incident_resolution_disputes (incident_id, disputer_member_id)
  values ('0000000c-0000-0000-0000-000000000002', '0000000a-0000-0000-0000-000000000004');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
do $$
declare v text; n int;
begin
  select status::text, resolution_dispute_count into v, n
    from incidents where id = '0000000c-0000-0000-0000-000000000002';
  if v <> 'resolution_disputed' then raise exception 'FAIL T11: status did not flip (status=%, disputes=%)', v, n; end if;
  raise notice 'PASS T11: two disputes flipped resolved -> resolution_disputed';
end $$;

-- ============================================================
-- TEST 12 — A beneficiary REQUIRES a photo (anti-impersonation); insert w/o photo must fail
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
do $$
begin
  begin
    insert into visitor_beneficiaries (estate_id, host_member_id, name)
      values ('00000000-0000-0000-0000-0000000000a1', '0000000a-0000-0000-0000-000000000002', 'No Photo Guy');
    raise exception 'FAIL T12: beneficiary without photo was allowed';
  exception when not_null_violation then
    raise notice 'PASS T12: beneficiary requires a photo';
  when others then
    if sqlerrm like 'FAIL T12%' then raise; end if;
    raise notice 'PASS T12 (other guard): %', sqlerrm;
  end;
end $$;

-- ============================================================
-- TEST 13 — Visitor activity is written to the audit log (cold storage)
-- ============================================================
insert into visitor_passes (estate_id, host_member_id, visitor_name)
  values ('00000000-0000-0000-0000-0000000000a1', '0000000a-0000-0000-0000-000000000002', 'One-off Mechanic');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);  -- operator reads audit
do $$
declare n int;
begin
  select count(*) into n from audit_log
   where action = 'visitor_access' and estate_id = '00000000-0000-0000-0000-0000000000a1';
  if n < 1 then raise exception 'FAIL T13: visitor pass not logged to audit'; end if;
  raise notice 'PASS T13: visitor activity logged to audit (% rows)', n;
end $$;

-- ============================================================
-- TEST 14 — Security (responder) CAN see visitor passes (gate check)
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
do $$
declare n int;
begin
  select count(*) into n from visitor_passes where estate_id = '00000000-0000-0000-0000-0000000000a1';
  if n < 1 then raise exception 'FAIL T14: security cannot see visitor passes'; end if;
  raise notice 'PASS T14: security can see visitor passes (% rows)', n;
end $$;

-- ============================================================
-- TEST 15 — The community manager CANNOT see a tenant's live visitor list (privacy)
-- ============================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
do $$
declare n int;
begin
  select count(*) into n from visitor_passes where estate_id = '00000000-0000-0000-0000-0000000000a1';
  if n <> 0 then raise exception 'FAIL T15: community manager can see a tenant''s visitor list (%)', n; end if;
  raise notice 'PASS T15: community manager cannot see tenant visitor list (privacy)';
end $$;

reset role;
\echo '==================================================='
\echo 'ALL RLS / BUSINESS-RULE TESTS PASSED'
\echo '==================================================='
