# WatchPoint — Database

Estate-first incident response network. Postgres schema on Supabase. Estate = tenant; Row-Level Security keeps each estate's data separate. Incidents are confirmed or disputed by verified members nearby, so it's not just operator-led.

## Layout

```
supabase/
  migrations/0001_init.sql   schema: enums, tables, indexes, RLS, triggers
  seed.sql                   demo estate, households, members, visitors, sample incident
  tests/                     RLS / business-rule test harness
```

## Apply (local Supabase)

```bash
supabase init      # one-time
supabase start
supabase db reset  # runs the migration, then seed.sql
```

## Apply (hosted Supabase project)

```bash
supabase link --project-ref <your-ref>
supabase db push   # applies migrations/0001_init.sql
# paste seed.sql into the SQL editor if you want demo data
```

## Run the tests

Spins up a throwaway Postgres, applies the schema, and checks the rules hold
(estate isolation, reporter-only resolve, household-scoped verification, visitor
privacy, and more). Needs a local Postgres 17.

```bash
bash supabase/tests/run_rls_tests.sh
```

## What's in the schema

17 tables, grouped four ways:

- People and places: `estates`, `profiles`, `estate_members`, `households`
- Incidents: `incidents`, `incident_confirmations`, `incident_resolution_disputes`, `incident_updates`
- Membership and visitors: `member_verification_nudges`, `visitor_beneficiaries`, `visitor_passes`
- Estate operations: `escalation_rules`, `escalation_events`, `maintenance_tickets`, `service_providers`, `device_tokens`, `audit_log`

Rules the database enforces (not just the app):

- Each estate only sees its own data.
- A household has a community manager (the landlord) who verifies the occupants of that household, and only that household.
- If verification drags, any verified member can publicly nudge the manager.
- Anyone can report an incident; verified members confirm or deny; you can't confirm your own report.
- Only the person who raised an alarm can mark it resolved. Two disputes send a resolved incident back for review.
- A tenant's visitor list is visible to security only, not the manager. Every visitor entry is logged.
- Repeat panic taps from the same phone collapse into one incident (`client_token`).

## Deferred

- PostGIS for city-scale "near me" and heatmaps (MVP uses lat/lng plus a distance check).
- Public incident map, agency dashboards, push delivery.
