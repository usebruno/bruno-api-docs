// Lint-fix staged changes on commit. eslint-plugin-diff limits eslint to the
// lines actually changed, so one root lint:fix covers every package.
//
// Staged unit specs also have to pass before the commit goes through. Only
// vitest specs run here — Playwright e2e is too slow for a hook.
export default {
  'packages/**/*.{ts,tsx}': () => 'npm run lint:fix',

  'packages/bruno-api-docs/src/**/*.{test,spec}.{ts,tsx}': ({ filenames }) =>
    `npm run test:run -w packages/bruno-api-docs -- ${filenames.map((f) => JSON.stringify(f)).join(' ')}`
};
