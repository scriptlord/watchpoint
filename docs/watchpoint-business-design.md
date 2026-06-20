# WatchPoint — Business Design & Go-to-Market Strategy

**WatchPoint turns an estate's chaotic emergency response into one trusted, verifiable system — and turns the record it creates into a product communities pay to keep.**

Built for Kingdom Hack 3.0 — Track D (Safety / Incident Management).

---

## 1. The problem

In Nigerian gated estates, when something goes wrong — a fire, a break-in, harassment at the gate, a burst main — the "system" is a noisy WhatsApp group. The result:

- **Slow response.** Critical messages get buried under chatter; security finds out late.
- **No verification.** Real emergencies and false alarms look the same, so people hesitate.
- **No record.** Afterwards there's no trail of who reported what, who responded, or how long it took — only arguments.
- **No accountability.** Residents can't tell whether security, the facility manager, or a vendor is actually performing.

Estates already spend heavily on security — guards, gates, CCTV — but the **coordination layer is missing**. That's the gap WatchPoint fills.

## 2. The market

**Primary customer: the estate's managing body** — the residents'/landlords' association, facility-management company, or estate manager. They already collect dues and pay for security, so they have **budget and authority**, and a clear pain.

| | |
|---|---|
| **Who pays** | Estate associations / facility managers (B2B). Not individual residents per-incident. |
| **Beachhead** | Gated estates in Lagos (and Abuja, Port Harcourt) — thousands of estates, each with tens to hundreds of households. |
| **Why reachable** | They're organised (associations, WhatsApp admins, AGMs), they already buy security, and they talk to each other — referral-friendly. |
| **Expansion buyers** | Facility-management firms (manage many estates at once), security vendors (as a channel), and — at city scale — agencies and state government. |

The wedge is precise: **sell to the people who already run the estate's security.**

## 3. The solution & what's different

WatchPoint is a community-verified incident-response network: one-tap alarms, neighbour confirmation, role-based response, automatic escalation, and a full audit trail — installable as a phone app.

**What makes it defensible:**

- **Community verification** — neighbours confirm an alarm, so it's trusted fast *and* false alarms are caught. WhatsApp can't do this.
- **The estate-tenancy & verification model** — WatchPoint knows *who actually lives where* (households, managers, gate identity). A panic-button app doesn't.
- **Accountability by design** — every response is timed and recorded. This is the asset that compounds: the longer an estate uses it, the more valuable the record.
- **Built for the real governance** — associations, landlords, dues, vendor reviews — not a generic Western safety app bolted on.

## 4. Business model

**B2B SaaS — per-estate subscription**, priced by size (households / residents). The managing body pays out of the security/dues budget it already controls.

| Stream | What | When |
|---|---|---|
| **Estate subscription** | Monthly/annual per estate, tiered by size | Core, from day one |
| **Multi-estate (FM firms)** | Volume deals with facility-management companies | Near term |
| **Vetted vendor marketplace** | Rated service providers (tow, plumber, electrician) pay for placement | Phase 2 |
| **Premium analytics** | Performance reports, SLA dashboards for associations | Phase 2 |
| **City / agency licensing** | State agencies pay for jurisdiction dashboards + data | City scale |

**Deliberately avoided: pay-per-emergency / direct tipping.** It creates perverse incentives (responders favouring tippers, gamed alarms). Money flows through the **community**, not a single emergency interaction: *recognition → performance score → community-approved reward*.

## 5. Go-to-market — land & expand

**Land (one estate):**
1. Target an organised estate via its association/security coordinator.
2. Run a **free/discounted pilot** — onboard one community manager + a few guards + residents.
3. Prove the metric that matters: **time-to-acknowledge an incident**, and a clean record after.

**Expand:**
- **Referral** — estate associations know each other; a working pilot is the best sales rep.
- **Facility-management firms** — one signed FM company = many estates.
- **Security vendors as channel** — they install WatchPoint as a value-add (and accept that the performance record makes them swappable — good for residents, a moat for us).
- **City scale** — partner with agencies (LASEMA, Fire Service, Police) and state Smart-City initiatives; aggregated incident data becomes a planning asset.

**Adoption framing (critical):** sell it as *"report faster, respond faster, keep a record,"* **not** *"a new governance system."* Governance/accountability features are introduced later, once trust is earned — they scare managers if led with.

## 6. Competitive landscape

| Alternative | Why WatchPoint wins |
|---|---|
| **WhatsApp groups** (status quo) | Structured, verified, escalated, recorded — not buried chatter |
| **Generic panic-button apps** | Community verification + estate-tenancy model + accountability; built for Nigerian estate reality |
| **Security-vendor apps** | Community-owned record, vendor-neutral — the estate keeps its data and can switch vendors using it |

## 7. Traction

- **A working, deployed prototype** — installable PWA on a live backend, with the full report → confirm → escalate → resolve flow, household verification, and visitor management.
- **Validated security model** — an automated row-level-security test suite proves the safety rules hold.
- **Designed with real workflows** — resident, security, and community-manager roles, grounded in how Nigerian estates actually operate.
- **Ready to pilot** — seeded with a realistic estate for live multi-user testing today.

## 8. Impact & Smart-City alignment

- **Lives & property:** faster, verified response to fires, medical events, and intrusions.
- **City scale:** aggregated, verified incident data → heatmaps, agency coordination, and evidence-based safety planning — directly aligned with Kingdom Hack's Smart-City, deploy-with-city-stakeholders goal.
- **Accountability:** communities gain evidence to hold security, managers, and vendors to a standard — better governance from the ground up.

## 9. Roadmap → revenue expansion

| Stage | Product | Revenue unlock |
|---|---|---|
| **Today** | Estate MVP (built & deployed) | Estate subscriptions |
| **Next** | City-wide: agencies, jurisdictions, PostGIS, public map | FM-firm + agency deals |
| **Then** | Phase 2: recognition, performance, vendor ratings, governance | Marketplace + premium analytics |

The architecture already supports all of it (see the System Architecture doc) — expansion is wiring, not a rebuild.

---

## Appendix — pitch-deck outline

1. **Hook** — the 9pm fire and the silent WhatsApp group.
2. **Problem** — slow, unverified, unrecorded estate emergencies.
3. **Solution** — community-verified incident response (10-second demo).
4. **Why now / why us** — verification + estate model + accountability.
5. **Market** — gated estates; the association is the buyer.
6. **Business model** — per-estate SaaS, not pay-per-emergency.
7. **Go-to-market** — land one estate, expand by referral & FM firms.
8. **Traction** — live prototype + tested security model.
9. **Vision** — estate → city → governance; Smart-City impact.
10. **Ask** — pilot estates + city-stakeholder deployment.
