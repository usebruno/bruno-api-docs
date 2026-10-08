import yaml from 'js-yaml';

/** A collection file is untrusted input: unparseable is a `null`, never a throw. */
export function safeLoad(text: string): Record<string, unknown> | null {
  try {
    const doc = yaml.load(text);
    return doc && typeof doc === 'object' ? (doc as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
