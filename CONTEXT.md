# CONTEXT.md — read this first

You are an AI assistant helping build a prototype called **AIO Launchpad**. This file tells you what's in the workspace, what's authoritative, and how to use it.

## What this project is

A vibe-coded prototype that reimagines Azure IoT Operations (AIO) deployment as a polished, fleet-aware product experience — powered underneath by Microsoft's open-source [Scale Kit](https://github.com/Azure/digital-ops-scale-kit) toolkit.

This is a **demo artifact**, not production software. It exists to make leadership and customers say "oh, THAT's what this should be."

## Read order

1. **`DEMO.md`** (workspace root) — the original frozen spec. The demo IS the spec. If a feature isn't here, don't build it.
2. **`context/scale-kit-real-yaml/`** — actual YAML files from Scale Kit and a representative customer fork. **TypeScript fixtures MUST mirror these shapes.** Do not invent field names.
3. **`context/before-flow/current-aio-deploy-commands.md`** — content for the "before" opener showing today's AIO deployment reality.

## Authoritative vs reference

| Source | Status | Use |
|---|---|---|
| `DEMO.md` | Historical reference | The original frozen vision. Current direction may have moved past it — check git history. |
| `context/scale-kit-real-yaml/*` | Authoritative for data shapes | Field names, structure, values — copy faithfully. |
| `context/before-flow/*` | Reference | "Before" content. |

## House rules

- **Azure-native UX is non-negotiable.** This product must feel at home next to the Azure Portal and `az` CLI. Fluent design patterns (left nav, breadcrumbs, command bars, resource detail panels, status pills). Azure vocabulary ("Subscription", "Resource group", "Region", "AIO instance"). Every meaningful action has an equivalent `az iot ops` command shown in the "View as code" panel. See the "Azure-native UX" section in `context/prototype-prompt.md`.
- **Don't invent Scale Kit fields.** If you don't see a field in `context/scale-kit-real-yaml/`, don't put it in a fixture. If you need a field that's not there, ask.
- **Don't invent CLI flags.** The Scale Kit CLI is `siteops`. The selector flag is `-l` / `--selector`, not `-s`. The workspace flag is `-w`. The Azure CLI extension is `az iot ops` (and related: `az connectedk8s`, `az identity`, `az keyvault`). When in doubt, check `context/before-flow/current-aio-deploy-commands.md`.
- **Don't invent AIO releases.** The five available are `2512`, `2602`, `2603`, `2604`, `2605`. Default is `2605`. Each has a real version pin file in `context/scale-kit-real-yaml/aio-release-*.yaml`.
- **Use real site names from the fixture set.** The example enterprise hierarchy (enterprise → geo → factory → dev/prod) is in `context/scale-kit-real-yaml/`. Use those names verbatim in the fleet view.
- **No real Azure calls. No real auth. No backend.** All data from local TypeScript fixtures derived from the YAML files.
- **Polish > features.** Six great screens beat eight mediocre ones. Per `DEMO.md`, screens 0 and 7 are non-negotiable; cuts come from the middle.
- **Commit early, commit often.** Even WIP commits. Git is the undo button.

## Stack (per the prototype prompt)

Default unless explicitly changed:
- Next.js (App Router) + TypeScript
- Tailwind + shadcn/ui
- React state — Zustand or Context, no backend
- Mocked data from TS fixtures sourced from `context/scale-kit-real-yaml/`

## Working style (per the prototype prompt)

1. **Plan first, briefly.** Before code: file structure, component breakdown, data shape. Get a nod, then build.
2. **Build vertically.** Get one screen fully real before scaffolding the next.
3. **End each work block with:** built / cut / next.

## How to start

When invoked in a fresh chat: read this file plus `DEMO.md` for the original vision, then skim recent git history for current direction. Most ongoing work tracks against the queue in repo memory (see `/memories/repo/` if available), not this file.
