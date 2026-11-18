const PROMPT_VARIABLE_NAME_PATTERN = /[^{}\s](?:[^{}]*[^{}\s])?/;

const PROMPT_VARIABLE_TEXT_PATTERN = new RegExp(`^\\?(${PROMPT_VARIABLE_NAME_PATTERN.source})$`);

const promptVariableTemplatePattern = (): RegExp =>
  new RegExp(`{{\\?(${PROMPT_VARIABLE_NAME_PATTERN.source})}}`, 'g');

export const toPromptVariableKey = (name: string): string => `?${name}`;

export const isPromptVariableToken = (word: string): boolean => PROMPT_VARIABLE_TEXT_PATTERN.test(word);

export const promptVariableName = (word: string): string | null => PROMPT_VARIABLE_TEXT_PATTERN.exec(word)?.[1] ?? null;

export const extractPromptVariablesFromString = (str: string): string[] => {
  if (typeof str !== 'string' || !str) return [];
  return Array.from(new Set(Array.from(str.matchAll(promptVariableTemplatePattern()), (match) => match[1])));
};

export const extractPromptVariables = (value: unknown): string[] => {
  const names = new Set<string>();
  const seen = new WeakSet<object>();

  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      for (const name of extractPromptVariablesFromString(node)) names.add(name);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const entry of node) walk(entry);
      return;
    }
    for (const key of Object.keys(node)) {
      try {
        walk((node as Record<string, unknown>)[key]);
      } catch (error) {
        console.error('Error extracting prompt variables:', error);
      }
    }
  };

  try {
    walk(value);
  } catch (error) {
    console.error('Error extracting prompt variables:', error);
  }
  return Array.from(names);
};

export const buildPromptVariableMap = (names: string[], values: Record<string, string>): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const name of names) {
    map[toPromptVariableKey(name)] = Object.prototype.hasOwnProperty.call(values, name) ? values[name] : '';
  }
  return map;
};
