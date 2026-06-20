# WatchPoint — Database

Estate-first incident response network. Postgres schema on Supabase. Estate = tenant; Row-Level Security isolates each estate. Incidents can be confirmed or disputed by verified nearby/community members, so the system is not just operator-led.

## Layout

```
supabase/
  migrations/0001_init.sql   schema: enums, tables, indexes, RLS, triggers
  seed.sql                   demo estate + members + rules + providers
```

## Apply (local Supabase)

```bash
# one-time
supabase init
supabase start

# apply schema + seed
supabase db reset      # runs migrations then seed.sql
```

## Apply (hosted Supabase project)

```bash
supabase link --project-ref <your-ref>
supabase db push       # applies migrations/0001_init.sql
# run seed.sql manually in the SQL editor if you want demo data
```

## What the schema gives you

- 12 tables (estates, profiles, estate_members, incidents,
  incident_confirmations, incident_updates, escalation_rules,
  escalation_events, maintenance_tickets, service_providers, device_tokens,
  audit_log)
- RLS so a user only sees their own estate's rows
- Idempotent incident writes (client_token) — offline/retry safe
- Community confirmation: verified same-estate members can confirm, deny, or mark unsure; reporters cannot confirm their own incidents
- Incident confidence fields: confirmation_count, denial_count, confidence_score, verification_status
- Optimistic locking (version) on status edits
- Append-only timeline (incident_updates) + audit_log (NDPR)
- Auto timestamps + audit via triggers
- Realtime on incidents + incident_updates

## Deferred

- PostGIS (city-scale "near me" / heatmap) — MVP uses lat/lng + distance check.
