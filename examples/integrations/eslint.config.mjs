// eslint lints nothing above its config, so the workspace rules are applied from here
import base from '../../integrations/eslint.config.mjs';

const [ignores, rules] = base;

export default [
  ignores,
  { ...rules, files: ['**/*.{js,ts}'], rules: { ...rules.rules, 'no-console': 'off' } }
];
