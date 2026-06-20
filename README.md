# WatchPoint

**A safety and incident-response network for residential estates and gated communities.**

When something goes wrong in an estate — a fire, a break-in, someone being harassed at night, a burst pipe — people usually scramble in a noisy WhatsApp group. Messages get buried, security finds out late, and afterwards there's no record of what happened or how long it took to respond.

WatchPoint replaces that with one shared system where a resident can raise an alarm in one tap, neighbours can confirm it's real, security and managers can respond, and everyone can see a clear, trustworthy timeline of what happened.

Built for Kingdom Hack 3.0 — Track D (Safety / Incident Management).

---

## ▶ Try it live

**Live prototype → https://watchpoint-alpha.vercel.app**  (installable: open on a phone and "Add to Home Screen").

Tap any demo person to sign in (or use the email form with password `watchpoint123`).
Best demo: open it on **two phones** — sign in as **Tunde** on one and **Chidi** on another, raise an alarm on Tunde's, and watch it land **live, with a siren**, on Chidi's. Add more residents to **confirm** it to "verified", or leave it unanswered to watch it **escalate** Residents → Security → Manager.

---

## How it works

1. **A resident reports an incident** — fire, medical, security, flood, and so on. One tap, optionally with a photo or voice note.
2. **Neighbours confirm or deny it.** Verified members nearby can say "yes, I see it too" or "no". This builds a confidence score, so a real emergency is trusted quickly and a false alarm is caught — without waiting on votes before help is alerted.
3. **Security and managers respond** and move the incident through clear stages: acknowledged → on the way → on scene.
4. **Only the person who raised the alarm can close it** ("I'm fine now"). An alarm — like a kidnapping or harassment — stays open until the person who raised it is safe. Security still investigates regardless.
5. **Everything is recorded** in a timeline and an audit log, so the community has facts instead of arguments.

## Who's who

- **Resident** — reports incidents, confirms others' reports, manages their own visitors.
- **Community manager** (usually the landlord) — runs a household and verifies the people who live in it. Each manager only controls their own household, so no one can quietly let strangers into the estate.
- **Responder** — estate security or a marshal who acts on incidents.

New people start unverified, like a visitor with no access, until their household's manager confirms them. If a manager is slow, any verified neighbour can publicly nudge them — visible to the whole estate, so it stays transparent.

## Visitors

Visitors don't get app access. A resident either:

- adds a **recurring visitor** (e.g. family for a week) with a photo, so security recognises them at the gate, or
- sends a **one-off pass** (mechanic, dry cleaner) straight to security.

A tenant's visitor list is private to them and security — not shown to the manager. Every visitor entry is logged for later, if it's ever needed.

---

## What's in this repository

Two parts: the **Supabase database** (the system architecture) and the **web app** (the working prototype).

```
supabase/
  migrations/0001_init.sql        the full database: tables, security rules, automation
  migrations/0002_escalation…sql  in-estate escalation engine (Residents → Security → Manager)
  migrations/0003_profile…sql     estate-scoped profile visibility
  seed.sql                        sample estate with demo data
  tests/                          automated checks that the safety rules actually hold
docs/
  WatchPoint.postman_collection.json   import this to hit the live API yourself
web/                              the Next.js PWA — the deployed prototype
```

The database has 17 tables across four areas:

| Area | Tables |
|---|---|
| People and places | estates, profiles, estate_members, households |
| Incidents | incidents, incident_confirmations, incident_resolution_disputes, incident_updates |
| Membership and visitors | member_verification_nudges, visitor_beneficiaries, visitor_passes |
| Estate operations | escalation_rules, escalation_events, maintenance_tickets, service_providers, device_tokens, audit_log |

### Security is enforced by the database, not just the app

These rules hold even if someone bypasses the app and hits the database directly:

- Each estate only ever sees its own data.
- A manager can verify only the occupants of their own household.
- You can't confirm your own report, and you can't promote yourself.
- Only the person who raised an alarm can resolve it.
- A tenant's visitor list is visible to security only.
- Repeated panic taps from one phone become a single incident, not a flood of duplicates.

---

## Running it

**Local (full Supabase on your machine):**

```bash
supabase init      # creates the Supabase config in this project (run once)
supabase start     # boots the local database, auth, and dashboard in Docker
supabase db reset  # builds all the tables, then loads the demo data from seed.sql
```

After `supabase start`, open the dashboard at <http://localhost:54323> to browse the tables.

**Hosted Supabase project:**

```bash
supabase link --project-ref <your-project-ref>  # connects this code to your online project
supabase db push                                # builds all the tables in that online project
# then paste seed.sql into the project's SQL editor to load the demo data
```

**Run the safety-rule tests** (needs Postgres 17 installed locally):

```bash
bash supabase/tests/run_rls_tests.sh  # spins up a temporary database, builds it, and
                                      # checks every safety rule holds, then cleans up
```

**Run the web app locally:**

```bash
cd web
npm install
npm run dev    # http://localhost:3000  (reads Supabase keys from web/.env.local)
```

The deployed version lives at **https://watchpoint-alpha.vercel.app** and redeploys automatically on every push.

---

## On the roadmap

- Live "incidents near me" map and heatmaps (PostGIS).
- Push notifications and an automatic escalation timer.
- City-scale rollout: agencies like fire and emergency services receiving escalated incidents.
