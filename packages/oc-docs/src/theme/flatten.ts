const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Flatten a nested token object to a { '--oc-<path>': value } map. */
export function flattenTheme(obj: Record<string, unknown>, prefix = '--oc'): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const varName = `${prefix}-${camelToKebab(key)}`;
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenTheme(value as Record<string, unknown>, varName));
    } else if (typeof value === 'string' || typeof value === 'number') {
      out[varName] = String(value);
    }
  }
  return out;
}
