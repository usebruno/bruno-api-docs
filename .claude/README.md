# Claude Config

The [Claude Code](https://code.claude.com/docs) configuration for Bruno API Docs: project
context, path-scoped engineering rules, and review/test skills. Claude picks it up automatically
when launched from the repo root. It is committed so every contributor and CI reviewer works
from the same conventions.

<!-- This README is a human maintainer guide. It is NOT a memory file and is never imported into
     Claude's always-loaded context. Keep contributor/ownership guidance here, not in CLAUDE.md. -->

## How the pieces link

```
CODING_STANDARDS.md  (repo root)           ← single source of truth for how code is written
   ├── .coderabbit.yaml                     ingests it as review guidelines (knowledge_base)
   ├── .claude/CLAUDE.md                    pointer + the few rules worth holding every session
   ├── .claude/rules/*.md                   judgment layer + repo detail on top of it
   └── .claude/skills/code-review/          local mirror of the CodeRabbit review
packages/bruno-api-docs/e2e/README.md      ← canonical e2e guide; referenced by .coderabbit.yaml,
                                             rules/testing.md and the write-e2e-test skill
```

Change a standard in `CODING_STANDARDS.md` first. The other files reference it; they should not
restate it. If two files disagree, the rules win over `.coderabbit.yaml`, and the standards file
wins over both.

## What's inside

| Path | What it is | Loads |
|------|------------|-------|
| `CLAUDE.md` | Project overview: commands, architecture pointers, standards summary, gotchas, index of rules and skills. | Every session. |
| `rules/app-conventions.md` | Components, styling, state, format consumption, test ids for `packages/bruno-api-docs/src/**`. | When Claude touches a matching file. |
| `rules/conventions.md` | Readability, comment and diff hygiene for all packages, scripts, examples. | On match. |
| `rules/cross-os-compat.md` | Line endings, modifier keys, SSR safety for `src/**`. | On match. |
| `rules/unit-testing.md` | Vitest: `useRenderToDom`, unconditional assertions, coverage mapping. | On `*.spec.*` / `*.test.*`. |
| `rules/testing.md` | Playwright quick reference for `e2e/**`. | On match. |
| `skills/code-review/` | `/code-review`: parallel lenses in `reviewers/`; mirrors `.coderabbit.yaml`. | On invocation or when relevant. |
| `skills/write-e2e-test/` | `/write-e2e-test`: a spec in the class-based page-object style. | On invocation or when relevant. |
| `skills/new-component/` | `/new-component`: scaffold a component or page with the folder, styling, and spec conventions. | On invocation or when relevant. |
| `settings.json` | Shared settings. Denies `Read` on build output and Playwright artefacts so Claude works from `src/`. | At startup, from the launch directory. |
| `settings.local.json` | Per-machine overrides. Gitignored. | At startup, if present. |

## Install

Start Claude Code (`claude`) from the repo root and everything loads:

- `.claude/CLAUDE.md` is a first-class project-instruction location, so there is no root
  `CLAUDE.md` and no `@` import. `CLAUDE.local.md` at the root is gitignored for personal notes.
- Path-scoped rules attach when Claude reads a matching file. Launching from
  `packages/bruno-api-docs/` still loads this root `.claude/` from the ancestor directory.
- Skills are discovered from `.claude/skills/`: type `/code-review`, `/write-e2e-test`,
  `/new-component`.

Run `/context` in a session to confirm what loaded.

---

## Maintaining this config

For whoever edits the config. The goal is high instruction adherence at the lowest always-loaded
cost: put each instruction in the mechanism that loads it exactly when it is needed, and no
sooner. It follows the Claude Code docs; read them before structural changes:
[Write an effective CLAUDE.md](https://code.claude.com/docs/en/best-practices#write-an-effective-claude-md),
[Memory](https://code.claude.com/docs/en/memory) (loading order, `.claude/rules/`),
[Skills](https://code.claude.com/docs/en/skills).

### Where does a new instruction go?

| Mechanism | Lives in | Loads | Use it for |
|---|---|---|---|
| Coding standard | `CODING_STANDARDS.md` | Read on demand by Claude; ingested by CodeRabbit | Any rule about how code is written. Humans read it too. |
| Project instructions | `.claude/CLAUDE.md` | Every session (full file) | Facts true in nearly every session and not inferable from code: orientation, setup, global invariants, pointers. |
| Path-scoped rule | `.claude/rules/<topic>.md` with `paths:` | When Claude reads a matching file | Judgment calls and repo detail for one area. One topic per file. |
| Skill | `.claude/skills/<name>/SKILL.md` | On `/invoke` or when the description matches | A reusable multi-step procedure (review, scaffold, write a test). Not a fact. |
| Settings / hooks | `.claude/settings.json` | Startup / lifecycle events | Deterministic enforcement. Advisory guidance is not a hook. |
| CI review | `.coderabbit.yaml` | Every PR | Path scope, tone, and what the standards file cannot say. Never a restated standard. |

### Budgets

- `CLAUDE.md`: target ≤ 120 lines, hard cap 200. For every line ask "would removing this cause
  Claude to make a recurring project-specific mistake?" If not, cut or relocate it.
- Rules: one topic each. Keep `paths:` accurate against real repo paths.
- Skills: `SKILL.md` under 150 lines; descriptions under ~200 characters, leading with the words
  a triggering request would contain.
- Keep the skill catalogue small: names and descriptions cost discovery context even though
  bodies load lazily.

### Keep it consistent

- Before writing a fact, `grep -rn "<claim>" .claude CODING_STANDARDS.md .coderabbit.yaml`. If it
  already exists, point to it instead of repeating it.
- Verify every rule and example against the actual repo. Grep the source; do not assume.
- Do not hardcode volatile catalogues (component lists, slice names, fixture names beyond the
  ones the dev entry hard-wires). Describe the category and say where to read the current set.
- Team-wide requirements belong in these committed files, not only in a contributor's auto
  memory, which is machine-local.
- `Read`-deny rules are for build output, not dependencies. `node_modules/` is deliberately not
  denied; reading a dependency's types is legitimate.

### Validate a change

- `git diff --check`; `python3 -c "import json;json.load(open('.claude/settings.json'))"`.
- Every rule has `paths:` (an unscoped rule loads in every session):
  `grep -L "paths:" .claude/rules/*.md` prints nothing.
- Cross-references resolve: `grep -rno "[A-Za-z0-9_./-]*\.md" .claude CODING_STANDARDS.md`.
- Loading: `/context` in a session; open a file under `src/` and under `e2e/` and confirm the
  right rule attaches.
- Skill triggering: phrase a request the skill should catch ("review my changes", "add an e2e
  test for search") and confirm it is offered; phrase a near-miss and confirm it is not.

### When to revisit

After Claude repeats the same project-specific mistake, after a repo restructuring (packages
moved, build tooling changed), or after a Claude Code release that changes loading or skill
behaviour. Treat config edits like code: review them in PRs.
