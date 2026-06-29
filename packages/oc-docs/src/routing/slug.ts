/** Convert a single item/folder name into a kebab-case URL segment; falls back to 'unnamed'. */
export const slugifySegment = (name: string): string => {
  const slug = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'unnamed';
};

/** Append -2, -3, … to duplicate sibling segments; input must be pre-sorted for deterministic output. */
export const dedupeSiblingSlugs = (segments: string[]): string[] => {
  const used = new Set<string>();

  return segments.map((segment) => {
    if (!used.has(segment)) {
      used.add(segment);
      return segment;
    }

    let n = 2;
    let candidate = `${segment}-${n}`;
    while (used.has(candidate)) {
      n += 1;
      candidate = `${segment}-${n}`;
    }
    used.add(candidate);
    return candidate;
  });
};
