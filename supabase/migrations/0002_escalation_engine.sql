-- WatchPoint — in-estate escalation engine
-- Climbs an UNANSWERED alarm Residents → Security → Manager based on the estate's
-- escalation_rules timeouts. "Caught up" whenever the feed loads (no always-on
-- server needed for the prototype). The outside-agency level (4) is NEVER
-- auto-fired here — it's view-only / manual. Stops the moment an alarm leaves 'open'.
-- SECURITY DEFINER so it can write escalation_events (clients have no insert policy).

create or replace function catch_up_escalations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
  rule record;
begin
  for r in
    select i.id, i.estate_id, i.created_at
    from incidents i
    where i.status = 'open'
      and i.estate_id in (
        select estate_id from estate_members
        where user_id = auth.uid() and status = 'active'
      )
  loop
    for rule in
      select level, timeout_seconds, target_role
      from escalation_rules
      where estate_id = r.estate_id
        and level <= 3                          -- in-estate only; agency (4) is manual
      order by level
    loop
      if extract(epoch from (now() - r.created_at)) >= rule.timeout_seconds
         and not exists (
           select 1 from escalation_events e
           where e.incident_id = r.id and e.level = rule.level
         )
      then
        insert into escalation_events (incident_id, level, target_role)
        values (r.id, rule.level, rule.target_role);

        insert into incident_updates (incident_id, actor_member_id, update_type, note)
        values (r.id, null, 'escalation', 'Escalated to ' || rule.target_role::text);

        v_count := v_count + 1;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;

grant execute on function catch_up_escalations() to authenticated;
