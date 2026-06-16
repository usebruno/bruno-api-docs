// Shared responsive scale. Consumable as CSS vars (via generator) and in JS/Emotion.
export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  large: '1024px',
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** min-width media query helper for Emotion template literals. */
export const up = (bp: Breakpoint) => `@media (min-width: ${breakpoints[bp]})`;
