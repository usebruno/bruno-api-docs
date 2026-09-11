---
name: code-review
description: Review a Bruno API Docs diff, PR, or branch via focused reviewers run in parallel —
  correctness, conventions, React/styling, security, unit tests, e2e tests. Mirrors the
  CodeRabbit / CODING_STANDARDS review.
---

# Reviewing Bruno API Docs code

This skill mirrors the automated CodeRabbit review (`.coderabbit.yaml`) so you can run the same
review locally. Source-of-truth order: coding standards → `CODING_STANDARDS.md`; app behaviour and
conventions → `.claude/rules/*`. `.coderabbit.yaml` mirrors these for CI parity; read it for a
path instruction not summarised here, but the rules win if they ever disagree.

The review is **split into focused lenses that run in parallel**, so a large diff is covered
faster and each reviewer stays sharply scoped to one concern. Each lens lives in its own file
under `reviewers/`. You (the orchestrator) dispatch the reviewers, then merge and report.

## How to review (orchestration)

1. **Get the diff.** Review only what changed, never untouched code. Pick the mode:
   - **Committed range** (default): `git diff main...HEAD` against the base branch (`main` or
     `release/*`). Update the base first (`git fetch` and confirm the local base is current); a
     stale base inflates the diff with already-merged changes and wastes a full fan-out. Each
     reviewer re-runs this scoped to its own globs; the range is pinned to fixed commits so they
     all see identical bytes.
   - **Working tree / uncommitted changes**: the tree can shift mid-review, so capture the diff
     **once** to a scratch file and hand every reviewer that path. `git diff HEAD` covers staged
     and unstaged tracked changes; run `git add -N .` first (reversible with `git reset`) so new
     untracked files show up:
     ```bash
     git add -N . && git diff HEAD > "$SCRATCH/review.diff"
     ```
     `$SCRATCH` is your environment's scratchpad dir. Reviewers read this frozen diff for their
     globs plus the on-disk files for surrounding context.
2. **Enumerate changed files**: `git diff --name-only main...HEAD` (committed range) or
   `git diff --name-only HEAD` (working tree). Skip any lens whose file scope is not touched (no
   `packages/bruno-api-docs/e2e/**` change → skip `e2e-tests.md`; no `*.spec.*` change → skip
   `unit-tests.md`). Never skip the lenses scoped to all files.
3. **Fan out the reviewers in parallel.** In a *single message*, launch one `Agent`
   (subagent_type `Explore` or `general-purpose`) per in-scope reviewer below. Give each subagent
   this exact briefing:
   - The diff source (the committed range, e.g. `main...HEAD`, or the snapshot path
     `$SCRATCH/review.diff`) and the file globs it owns (from the reviewer file's "Scope" line).
     For a snapshot, tell the reviewer to read that file for its globs rather than re-run
     `git diff`.
   - "Read `.claude/skills/code-review/reviewers/_contract.md` for the shared persona and output
     contract, then read `.claude/skills/code-review/reviewers/<file>` and any rule or source file
     it points to (`CODING_STANDARDS.md`, `.claude/rules/*.md`), which hold the detailed
     checklist. Apply **only** that lens to the changed files in your scope, at the severities the
     reviewer specifies. Do not review outside your scope."
   Reviewers are read-only and independent; overlap between lenses is fine (you dedupe at merge).
4. **Merge and report.** Collect every reviewer's findings, drop exact duplicates, and when two
   lenses flag the same `file:line` keep the higher severity. Regroup **by file**, each finding
   tagged by severity (blocker / suggestion / nit) with `file:line`. If the review request carries
   a problem statement or acceptance criteria, reconcile its enumerated deliverables (a changeset,
   a test per new default or branch) against the diff and flag any that are absent. If nothing is
   wrong, say so briefly; do not manufacture nits.

## Reviewers

| Reviewer file | Lens | Scope |
|---|---|---|
| `reviewers/correctness.md` | Correctness & root-cause | all source (excl. specs and `e2e/**`) |
| `reviewers/conventions.md` | Coding standards, readability, hygiene | all files |
| `reviewers/react.md` | React / Redux / styling / format consumption | `packages/bruno-api-docs/src/**` |
| `reviewers/security.md` | Security & data safety | all source (excl. specs and `e2e/**`) |
| `reviewers/unit-tests.md` | Vitest specs & coverage mapping | `packages/bruno-api-docs/src/**/*.{spec,test}.{ts,tsx}` |
| `reviewers/e2e-tests.md` | Playwright E2E (class-based POM) | `packages/bruno-api-docs/e2e/**` |

## Shared reviewer persona & output contract

Defined once in `reviewers/_contract.md`, the small file every reviewer reads. Keep the persona
and the `<blocker|suggestion|nit> | <file>:<line> | <finding>` shape there, not duplicated here.
