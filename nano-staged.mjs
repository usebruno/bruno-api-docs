// Lint-fix staged changes on commit. eslint-plugin-diff limits eslint to the
// lines actually changed, so one root lint:fix covers every package.
export default {
  'packages/**/*.{ts,tsx}': () => 'npm run lint:fix'
};
