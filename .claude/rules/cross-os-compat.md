---
paths:
  - "packages/bruno-api-docs/src/**"
---

# Cross-OS Browser Compatibility

The app runs in the reader's browser on macOS, Windows, and Linux, renders to static markup in
unit tests, and ships as a standalone bundle. The reader's OS changes what they type or paste and
which modifier key they press, so the same code can behave differently per platform. Handle these
explicitly. (This is about browser behaviour across the reader's OS, not desktop packaging.)

## Line endings (CRLF vs LF)

- Text from a Windows reader arrives with `\r\n`; macOS, Linux, and the Monaco editor default to
  `\n`. When you split multiline text to process it (bulk editors, parsers), split on `/\r?\n/`,
  never `'\n'`; a bare `'\n'` split leaves a trailing `\r` on every line. See
  `utils/bulkKeyValue.ts`.
- `.trim()` on each field happens to mask a stray `\r`; do not rely on it. Normalise at the split
  so the `\r` never enters the pipeline (it also breaks prefix checks like `startsWith('//')`).
- Pure line counting (`code.split('\n').length`) gives the same answer for CRLF, so it is not a
  bug where it exists, but prefer `/\r?\n/` for consistency.
- Emit multiline text joined with `\n` as the canonical in-memory form.

## Keyboard shortcuts and modifier keys

- The primary modifier is `event.metaKey` on macOS and `event.ctrlKey` on Windows/Linux. A
  shortcut gated on only one is dead on the other. Accept `event.metaKey || event.ctrlKey`.
- Detect the platform with `isMacPlatform()` from `utils/platform.ts` (SSR-safe, reads
  `navigator.platform` with a `userAgent` fallback). Do not hand-roll the check or hardcode `⌘`
  / `Ctrl` in shortcut hints; derive the label.
- Bare keys (Escape, arrows, Home/End, Enter) are cross-platform. See `ui/Tabs`, `ui/Modal`,
  `ui/Dropdown` for the pattern.

## SSR and environment safety

- Unit specs render components through `useRenderToDom` (`src/hooks/useRenderToDom.ts`), which
  runs a server render in Vitest's `node` environment: `window`, `document`, and `navigator` are
  undefined. Never read them at module top level or during render; do it inside an effect or a
  guarded helper (`typeof window !== 'undefined'`).
- Storage reads go through `useStorage` / `useLocalStorage` / `useSessionStorage` (`src/hooks/`),
  which already handle the missing-storage case.
- No Node-only APIs (`fs`, `path`, `process`, `Buffer`) in runtime code under `src/`.
