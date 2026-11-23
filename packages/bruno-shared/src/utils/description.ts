/**
 * Normalize a raw description value (a bare string, the legacy `{ content, type }` object form, or
 * null/undefined) to its display string, or `undefined` when there is no meaningful text. A
 * whitespace-only description is treated as absent.
 */
export const descriptionText = (desc: unknown): string | undefined => {
  if (typeof desc === 'string') return desc.trim() ? desc : undefined;
  if (desc && typeof desc === 'object' && 'content' in desc) {
    const content = (desc as { content?: unknown }).content;
    return typeof content === 'string' && content.trim() ? content : undefined;
  }
  return undefined;
};

/**
 * Resolve the description to persist from an editor row's text: a non-blank string is kept as-is, and
 * a blank/whitespace-only or non-string value is omitted (returns `undefined`). Matches how the app
 * stores a bare description string and omits blanks, and never coerces a stray object to
 * `"[object Object]"`.
 */
export const resolveDescription = (text: unknown): string | undefined => {
  const str = typeof text === 'string' ? text : '';
  return str.trim() ? str : undefined;
};
