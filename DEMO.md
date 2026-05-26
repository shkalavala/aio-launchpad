# DEMO.md — the original frozen spec

> **Historical document.** This is the original demo spec from the project's first sprint. Many of these screens have been built and shipped — others have been re-thought or superseded as the prototype evolved. Treat this as the founding vision and as project history, not as a current to-do list. For the current direction, check git history and the live app.

This document IS the spec. If a feature isn't here, don't build it. If a screen here gets built, it ships in the demo. Everything else is noise.

The product is called **AIO Launchpad** in the demo (real name TBD — don't theme around the name, theme around the bet).

---

## The bet

> Today, deploying Azure IoT Operations across a real industrial fleet is a multi-week project: cluster prep, prereqs, az CLI sequences, Key Vault setup, identity wiring, then repeat per site. Scale Kit (the open-source toolkit) already collapses most of this for sophisticated customers who can fork it and write YAML.
>
> What if we made *that* the native experience? Polished UX, a fleet-aware product, the underlying IaC/GitOps depth preserved as an "open the hood" moment, not an entry requirement.

---

## The audience for the demo

- **Primary:** Microsoft leadership reviewing whether to back productization of Scale Kit.
- **Secondary:** Industrial customers (Contoso-class) who'd be the first to adopt.
- **Tertiary:** AIO product team, who need to feel the gap between today's flow and what's possible.

The demo is ~5 minutes. It must land the "oh, THAT'S what this should be" moment within the first 60 seconds.

---

## The arc (do not deviate)

1. **30 seconds:** The "before" — today's AIO deployment reality.
2. **60 seconds:** The "after" — fleet view, the contrast is immediate.
3. **2–3 minutes:** Three killer interactions: add a site, upgrade in place, manage secrets.
4. **30 seconds:** The "show me the YAML" moment — proves the depth is intact.
5. **30 seconds:** The "for developers" tab — proves the dual-audience story.
6. **Close.**

---

## Screens (the demo, screen by screen)

### Screen 0 — The "before" opener (30 sec)

**Purpose:** Make the contrast visceral, not asserted.

**What's on screen:**
- A stylized terminal + docs collage showing today's actual AIO deployment.
- See `context/before-flow/current-aio-deploy-commands.md` for the source content.
- Subtle step counter in the corner ("Step 17 of 40 — Configure trust bundle…") that visibly increments.
- The whole thing should feel like watching someone wade through documentation.
- Transitions to Screen 1 with a hard cut and a one-line title card: *"What if AIO deployment felt like this instead?"*

**Narration:** *"This is how an enterprise deploys AIO today. Cluster prep. Azure prereqs. CLI commands. Manual config decisions. Per site. Per environment. Multiplied by 28 factories."*

**Build notes:** Static, animated, ~30 seconds of timed reveal. No interactivity. Cheap to build but very high impact.

---

### Screen 1 — Fleet view (the landing)

**Purpose:** Communicate "this is a real product" in 3 seconds.

**What's on screen:**
- Top nav: Fleet / Sites / Releases / Secrets / Settings. Persona toggle top-right (Product / Developer).
- Left rail: hierarchical site tree (use Contoso's: `contoso-industries → stockholm/hamburg/gothenburg → factory → dev/prod`).
- Main pane: site summary cards or table — name, AIO version badge, health, last deploy timestamp, environment label (dev/prod).
- Sort/filter by version, environment, region.
- Health dots: green / amber / red. Mostly green with a couple of amber to make it feel real.

**Killer detail:** Version badges show a mix — most on 2605, a few stragglers on 2604 and 2603. The amber sites are the older versions. Plants the seed for the upgrade demo.

**Narration:** *"Every cluster in your fleet, one pane. Version per site. Health per site. Inheritance from the org down to the line."*

**Build notes:** This is the screen leadership will judge the whole thing by. Do not move on until it feels polished. Use real site names from `context/scale-kit-real-yaml/cont-*.yaml`.

---

### Screen 2 — Add a new site (the "90 second factory" moment)

**Purpose:** Show how trivial standing up a new factory becomes.

**Flow:**
1. "+ New site" button from fleet view → wizard or single-page form.
2. **Step A:** Identity — site name, parent (inheritance picker shows the tree), environment (dev/prod).
3. **Step B:** Infra — Azure subscription, resource group, region, cluster connection (mock: "connect via Arc" with a fake success).
4. **Step C:** AIO version — dropdown of available releases (2512 / 2602 / 2603 / 2604 / 2605, with 2605 as default and labeled "current").
5. **Step D:** Secrets source — radio: "central Key Vault" (paste resource ID, mock validation) / "per-site Key Vault" / "configure later".
6. **Review:** Show a diff — what YAML files would be created/modified in the repo, and what the deploy plan looks like.
7. **Deploy:** Click → progress UI with realistic stages (cluster prep, AIO platform install, secret sync, post-deploy validation). Each step ~3–5 sec of mocked progress. Ends with green and a "view site" link back to fleet view, now with the new site visible.

**Killer detail:** The "Review" step shows the actual YAML diff that would be committed. Three small new files. Real Scale Kit shapes. This is where a platform engineer in the audience says "wait, that's real?"

**Narration:** *"New factory. Pick the parent — it inherits everything. Pick the version. Pick where secrets come from. Here's what gets committed. Here's the deploy plan. Hit go."*

**Build notes:** Single most important interactive screen. Make it feel fast. The wizard should be 4 screens max. Use real release numbers, real region names, real site naming conventions from the Contoso fixtures.

---

### Screen 3 — In-place AIO upgrade (the killer moment)

**Purpose:** The thing that wins the room. One click upgrades a running cluster's AIO version with no rebuild.

**Flow:**
1. From fleet view, multi-select sites (or use a selector input — "all prod factories in Sweden" → previews matching sites with a count).
2. Pick target release from dropdown (e.g., 2604 → 2605).
3. **Preview pane:** Side-by-side diff of version pin file fields. Highlight what's changing (aioVersion, aioApiVersion, certManagerVersion, etc.).
4. "Deploy upgrade" button → progress UI showing per-site parallel progress bars.
5. Sites transition from amber (old version) to green (new version) in the background fleet view in real time.

**Killer detail:** The selector input. Type `env=prod, region=sweden` and watch the matching sites highlight in the tree. Feels like magic but mirrors Scale Kit's actual `-l` selector mechanic.

**Narration:** *"Upgrading 12 production factories from 2604 to 2605. One pin file change. One command. Live cluster, no rebuild, no identity loss. Watch the version badges flip."*

**Build notes:** This is the moment. Spend polish budget here. Multiple parallel progress bars, badge transitions, the satisfying click. If only one screen is great, make it this one.

---

### Screen 4 — Secrets management

**Purpose:** Make the multi-secret sync feature tangible.

**What's on screen:**
- Table of secrets per site: name, Kubernetes secret name, Kubernetes key, source (central KV / per-site), status (synced / pending / error).
- "+ Add secret" inline row.
- A panel showing the central Key Vault resource ID (configured once) with a "connected" indicator.
- Each row has a "createInKv" toggle (default off when central KV is the source).
- Realistic AIO secrets: OPC UA PLC credentials, dataflow Event Hub connection string, MQTT broker TLS material.

**"Show YAML" reveal:** Click reveals the generated `sync-secrets.yaml` matching the table contents. See `context/scale-kit-real-yaml/input-sync-secrets.yaml` for the real shape.

**Narration:** *"All secrets a factory needs, declared as metadata. Central Key Vault stays the source of truth. No secret values in git. Add, remove, sync. Per site, but managed at the fleet level."*

**Build notes:** Lower stakes than screens 2 and 3. Ship simpler. The "central KV connected" indicator and `createInKv: false` toggle are the things that matter — they map to the separation-of-concerns story.

---

### Screen 5 — "Show me the code" escape hatch (cross-cutting)

**Purpose:** Prove that nothing is locked in — every UI action maps to both the Azure-native `az` CLI and the Scale Kit / IaC path. This is the credibility moment for both Azure-native users AND platform engineers.

**Pattern:**
- Every screen that generates or modifies state has a small "</> View as code" affordance.
- Click reveals a side panel with **three tabs**:
  - **Azure CLI** — the equivalent `az iot ops ...` / `az` command(s) for the same operation. (e.g., `az iot ops create ...`, `az iot ops secretsync apply ...`)
  - **Scale Kit / `siteops`** — the `siteops` command + the YAML that would be committed (e.g., `siteops -w workspaces/iot-operations deploy manifests/aio-upgrade.yaml -l env=prod,region=sweden`).
  - **YAML diff** — the actual file diff that would land in the repo if going the GitOps route.
- A "copy" button on each.
- Visual styling: monospace, syntax highlighted, slightly darker theme to evoke "developer mode."

**Narration (woven into earlier screens):** *"And for anyone who'd rather drive this from Azure CLI or from git — every UI action shows the equivalent `az` command and the YAML that would be committed. We meet you where you already work. No magic, no lock-in. The portal is the experience; the Azure control plane and git stay the sources of truth."*

**Build notes:** Bolt onto screens 2, 3, and 4. Don't build as a standalone screen. The three-tab pattern is the visible proof of the Azure-native + GitOps duality — make sure all three tabs show real, accurate content for at least the upgrade flow (Screen 3).

---

### Screen 6 — Live state view for one site (STRETCH)

**Purpose:** Close the loop — what's actually running.

**What's on screen:**
- Click a site in fleet view → detail page.
- Sections: deployed AIO version, extension versions, secret sync status, recent deploys, basic resource health.
- Mocked metrics graphs (CPU, memory, message throughput) — believable but fake.

**Build notes:** Stretch goal. Skip unless time. If included, lean on shadcn data display patterns; do not invent a custom dashboard.

---

### Screen 7 — "For developers" persona view (second tab)

**Purpose:** Prove the dual-audience story without arguing it on a slide.

**Toggle:** Top-right "Product / Developer" switch — one click.

**What's on screen in Developer mode:**
- Layout flips to a repo-explorer feel.
- Left: file tree mirroring `workspaces/iot-operations/` structure — `sites/`, `manifests/`, `parameters/`, `templates/`.
- Middle: a YAML editor (Monaco or shadcn equivalent) showing the file content.
- Right: a "siteops command palette" — type a command, see what it would do; presets like `deploy aio-install -l name=...`, `plan aio-upgrade -l env=prod`.
- Top: "Open PR" button → modal showing the diff that would be committed and a mock PR description.

**Same data, different surface.** Every site in Developer view is the same site as in Product view — flipping the toggle should keep selection state where possible.

**Narration:** *"And for the platform engineer who lives in YAML and PRs — same fleet, same data, every action exposed as code. Two surfaces, one source of truth."*

**Build notes:** Last screen built. Reuses all fixtures. The toggle's animation is part of the demo — make it smooth, not jarring.

---

## What "done" looks like

- Can walk Screens 0 → 7 end-to-end without touching code.
- No errors or hangs in the demo path.
- First 30 seconds of every screen look polished. Beyond that, "good enough."
- Runs cleanly with `npm install && npm run dev` on a fresh clone.

## What "done" does NOT mean

- Every empty state polished.
- Every error handled.
- Every screen accessible to all viewports.
- Any tests.
- Any backend.
- Any real Azure call.

## Out-of-scope (do not build, even if tempting)

- Auth / login screens.
- Settings, profile, billing.
- Notifications, activity log, audit.
- Search across the whole product.
- Multi-tenant org-level admin.
- Anything network-dependent at demo time.
- A name picker / branding screen.

## Demo-day rules

- Freeze 24 hours before. No changes day-of.
- Dry-run end-to-end on a fresh clone the day before.
- Have screenshots of every key moment as a backup if live demo fails.
- Have the dev server pre-running and the browser pre-loaded at demo start.
