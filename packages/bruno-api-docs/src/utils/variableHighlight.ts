import { mockDataFunctions } from '@/runner/utils/faker-functions';
import { isPromptVariableToken } from '@/utils/promptVariables';

export type VariableTokenClass = 'variable-valid' | 'variable-invalid' | 'variable-prompt';

/**
 * Classify the raw inner text of a `{{...}}` token, mirroring Bruno's tokenizer
 * exactly (`utils/common/codemirror.js`). The word is NOT trimmed — `{{ foo }}`
 * is invalid even when `foo` exists, matching Bruno. Precedence:
 * 1. `?name` prompt variable → prompt.
 * 2. `$fn` where `fn` is a mock/dynamic function → valid.
 * 3. name found in the active variables map (any scope) → valid.
 * 4. otherwise → invalid (e.g. `{{randomUUID}}` without the `$`).
 */
export const classifyVariableToken = (word: string, isFound: (name: string) => boolean): VariableTokenClass => {
  if (isPromptVariableToken(word)) return 'variable-prompt';
  const isMock = word.startsWith('$') && Object.prototype.hasOwnProperty.call(mockDataFunctions, word.slice(1));
  if (isMock || isFound(word)) return 'variable-valid';
  return 'variable-invalid';
};
