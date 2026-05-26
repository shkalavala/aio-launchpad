# AIO Launchpad

A prototype reimagining Azure IoT Operations (AIO) deployment as a polished, fleet-aware product experience — powered underneath by the open-source [Scale Kit](https://github.com/Azure/digital-ops-scale-kit) toolkit.

**Status:** Prototype / demo artifact. Not production software.

## What this is

Today, deploying AIO across an industrial fleet is a multi-week project: cluster prep, prereqs, `az` CLI sequences, Key Vault setup, identity wiring, then repeat per site. Scale Kit (Microsoft's open-source toolkit) already collapses most of this for sophisticated customers who fork it and write YAML.

This prototype shows what it would feel like if that capability were exposed as the **native** AIO deployment experience — Azure-Portal-grade UX, fleet-aware product surface, IaC/GitOps depth preserved as an "open the hood" escape hatch rather than the entry bar.

## Read these first

- **[`DEMO.md`](DEMO.md)** — the original frozen demo spec. Eight screens, two personas. The current build has moved past parts of it — check git history for the latest direction.
- **[`CONTEXT.md`](CONTEXT.md)** — house rules and reading guide for anyone (human or AI) working on this.
- **[`BACKLOG.md`](BACKLOG.md)** — what could be built next, what's parked, and what's a deliberate non-goal.

## Structure

```
aio-launchpad/
├── DEMO.md                           # Original demo spec
├── CONTEXT.md                        # House rules + reading guide
├── README.md                         # You are here
├── app/                              # Next.js App Router pages
├── components/                       # React components by feature area
├── lib/                              # Fixtures, types, helpers
│   └── fixtures/                     # TypeScript fixtures mirroring real Scale Kit YAML
├── store/                            # Zustand store
└── context/                          # Source-of-truth artifacts
    ├── scale-kit-real-yaml/          # Real Scale Kit YAML — DO NOT invent field names, mirror these
    └── before-flow/                  # Content for the "before" opener
```

## Stack

- Next.js (App Router) + TypeScript
- Tailwind, hand-rolled Azure-themed token palette
- Zustand for state
- All data mocked from local TS fixtures derived from `context/scale-kit-real-yaml/`
- No backend, no real auth, no real Azure calls

## Running it

```bash
npm install
npm run dev
# → http://localhost:3000 (or 3001 if 3000 is taken)
```

## Working on it

Open `DEMO.md` for the original vision, then `CONTEXT.md` for the working rules. Don't change anything in `context/scale-kit-real-yaml/` — those are frozen reference fixtures.
