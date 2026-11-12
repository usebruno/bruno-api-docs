// Lint-fix staged changes on commit. eslint-plugin-diff limits eslint to the
// lines actually changed, so one root lint:fix covers every package.
//
// Staged unit specs also have to pass before the commit goes through. Only
// vitest specs run here — Playwright e2e is too slow for a hook.
export default {
  'packages/**/*.{ts,tsx}': () => 'npm run lint:fix',

  'packages/*/src/**/*.{test,spec}.{ts,tsx}': ({ filenames }) =>
    Object.entries(Object.groupBy(filenames, (f) => f.match(/packages\/[^/]+/)[0])).map(([pkg, files]) =>
      `npm run test:run -w ${pkg} -- ${files.map((f) => JSON.stringify(f)).join(' ')}`)
};
