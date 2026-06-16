/**
 * Single source of truth mapping HTTP methods to their theme-token CSS vars.
 * Used by every place that colours a method label (Item badge, drawer drag bar,
 * playground query bar) so the mapping can't drift between components.
 */
export const methodColorVars: Record<string, string> = {
  GET: 'var(--oc-request-methods-get)',
  POST: 'var(--oc-request-methods-post)',
  PUT: 'var(--oc-request-methods-put)',
  PATCH: 'var(--oc-request-methods-patch)',
  DELETE: 'var(--oc-request-methods-delete)',
  HEAD: 'var(--oc-request-methods-head)',
  OPTIONS: 'var(--oc-request-methods-options)',
};

/** Method colour var, case-insensitive, with a muted fallback for unknown methods. */
export const getMethodColorVar = (method?: string): string =>
  (method && methodColorVars[method.toUpperCase()]) || 'var(--oc-colors-text-muted)';
