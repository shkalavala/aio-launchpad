# Backlog

Living list of things we *could* build next. Not a roadmap — order is set per session based on what matters most. Items move up to "Next up" when committed, down to "Parked" when explicitly deferred.

## Next up

_(empty — pick from Candidates below)_

## Done

- **Multi-persona walkthrough audit.** Four-persona screen walk captured in [private/research/walkthrough-2026-05-26.md](private/research/walkthrough-2026-05-26.md). Completed 2026-05-26.
- **Harden one persona path (Ops IT release-pin upgrade).** Rollout pipeline (rings, gates, pause/continue, health-verify, blast-radius) shipped and verified end-to-end. Completed 2026-05-26.
- **/connect auth rethink + Azure DevOps as a fleet repo provider.** Collapsed the 3-row PAT/Device/SSO chooser to a provider toggle (GitHub | Azure DevOps) + a single primary CTA per provider (device flow / Entra OAuth) with a "Use a personal access token instead" disclosure for service accounts and restricted orgs. Store: added `GitProvider` type, expanded `AuthMethod` to `github-device | github-pat | ado-entra | ado-pat`, persist v3 with migration from old union, `provider` field on `FleetRepoConfig`.
- **Pick rollout payload directly on `/rollout` (AIO resources).** Inline picker on the AIO-resources rollout row: search by name/category/id, drift-only toggle, scrollable checkbox list with drift badges, select-all-filtered, owning-site summary chip. Full Resources page still linked for deeper exploration. Other rollout kinds (release / install / app / arm) already had inline `<select>` payload pickers.

## Candidates (unranked)

- **Real-repo connect (Step A).** Replace the `MANIFEST_FILES` fixture in [lib/fixtures/manifests.ts](lib/fixtures/manifests.ts) with live read-only reads from a hardcoded public Scale Kit fork via the GitHub Contents API. No auth, no writes. ~2 hr. Parked 2026-05-26 — do the walkthrough audit first.
- **Real-repo connect (Step B).** Authenticated write path: branch + commit + PR back to the connected Scale Kit fork from inside Launchpad.
- **Apps / Helm surface.** First-class view of customer Helm workloads layered on top of AIO (currently absent — only AIO components are modeled).
- **Site detail drawer depth.** Component-version drill-down, recent events, last-applied manifest pin — currently shallow.

## Parked (don't restart without explicit go)

- **`az iot ops clone` blueprint flow.** Upload a clone bundle, scrub site-specific bits, emit a portable `samples/<bundle>/` into the connected repo. Explored 2026-05-26 — bundle is symbolic-name ARM JSON v2.0 (~146 KB for one int instance); site-specific surface is the 11 `parameters` + `metadata.clonedInstanceId`; portable body is 12 nested deployments (dataflows, endpoints, profiles, assets, asset endpoint profiles, connector templates, secret syncs, SPCs, namespace devices/assets, authns, listeners) referencing site stuff only via `parameters('...')`. Mapping ARM → AIO YAML + a scrubbing UX is the real work. Parked as scope creep on 2026-05-26 — revisit only after the basics are solid.

## Deliberate non-goals

These were ruled out by design and shouldn't sneak back in without an explicit revisit:

- Rollback button on `/upgrade`.
- Day-1 prereq editor (cluster prep, Arc onboarding, Key Vault setup).
- Exposing per-component AIO version pins to operators (release pin is the unit).
- Surfaces for any persona other than Operations IT (Site OT, Central IT, Edge System IT are referenced in research but not built).
- **Persona toggle in the UI chrome.** Repo is the source of truth; every persona with repo access sees the same YAML. A UI toggle is view-state, not RBAC — it cannot enforce anything that GitHub repo permissions, Azure RBAC, and workflow approvals don't already enforce. At best it's demo decoration; at worst it's safety theater (hiding a button while the wire to git/Azure stays connected). What serves multiple roles honestly: deep-linkable surfaces (Site OT bookmarks their site's drawer URL), action affordances that surface the real control plane ("this opens a PR", "requires the rollout-approver gate"), and query-param-filtered shareable views. Rejected 2026-05-26 after audit-doc review.
