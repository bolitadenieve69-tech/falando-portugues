# Domain Docs

## Layout: Single-context

This repository uses a single global context file.

| Artefact | Path | Purpose |
|----------|------|---------|
| Domain glossary & constraints | `CONTEXT.md` | Project domain language, key invariants, bounded contexts |
| Architecture Decision Records | `docs/adr/` | Past architectural decisions with rationale |

## How agents should read these files

1. **Always read `CONTEXT.md` first** before making architectural suggestions, writing tests, or diagnosing bugs. It defines the domain language and constraints that must be respected.
2. **Scan `docs/adr/`** for decisions that are already settled — do not re-litigate them unless explicitly asked.
3. If `CONTEXT.md` does not exist yet, ask the user to create it before proceeding with domain-sensitive tasks.

## Note

`CONTEXT.md` does not exist yet in this repo. When created, it should cover:
- The core domain concepts (voice session, tutor, transcript, correction, level, topic)
- Key invariants (Portugal Portuguese only, immutable state, max latency targets)
- External system boundaries (LiveKit, Deepgram, ElevenLabs, Anthropic)
