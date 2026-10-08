// eslint lints nothing above its config, so the workspace rules are applied from here
import { ignores, workspace } from '../../integrations/eslint.config.mjs';

export default [
  ignores,
  { ...workspace, files: ['**/*.{js,ts}'], rules: { ...workspace.rules, 'no-console': 'off' } }
];
