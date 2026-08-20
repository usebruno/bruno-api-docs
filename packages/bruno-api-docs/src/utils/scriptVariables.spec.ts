import { describe, it, expect } from 'vitest';
import { reconcileScriptVariables, applyScriptCollectionVarsToCollection, coerceScriptVarValue } from './scriptVariables';
import { applyScriptEnvVarsToCollection, envVariableToRow } from './environments';
import { unwrapVariableTyped } from './variableResolution';
import { toDataType } from './variableDataType';

describe('reconcileScriptVariables', () => {
  it('updates, adds, and removes variables to match what the script set', () => {
    const out = reconcileScriptVariables(
      [{ name: 'a', value: '1' }, { name: 'b', value: '2' }] as any,
      { a: '1x', c: '3' }
    );
    expect(out).toEqual([{ name: 'a', value: '1x' }, { name: 'c', value: '3' }]);
  });

  it('removes every enabled variable when the script sets none', () => {
    expect(reconcileScriptVariables([{ name: 'a', value: '1' }] as any, {})).toEqual([]);
  });

  it('leaves disabled variables untouched', () => {
    const out = reconcileScriptVariables([{ name: 'a', value: '1', disabled: true }] as any, {});
    expect(out).toEqual([{ name: 'a', value: '1', disabled: true }]);
  });

  it('keeps the other fields when updating a variable', () => {
    const out = reconcileScriptVariables([{ name: 'a', value: '1', secret: true }] as any, { a: '2' });
    expect(out).toEqual([{ name: 'a', value: '2', secret: true }]);
  });

  it('never adds a variable whose name is in the skip list', () => {
    const out = reconcileScriptVariables([] as any, { sec: 'x', b: '2' }, new Set(['sec']));
    expect(out).toEqual([{ name: 'b', value: '2' }]);
  });
});

describe('coerceScriptVarValue', () => {
  it('turns any value into a string, and null or undefined into an empty string', () => {
    expect(coerceScriptVarValue('s')).toBe('s');
    expect(coerceScriptVarValue(42)).toBe('42');
    expect(coerceScriptVarValue(true)).toBe('true');
    expect(coerceScriptVarValue({ a: 1 })).toBe('{"a":1}');
    expect(coerceScriptVarValue(null)).toBe('');
    expect(coerceScriptVarValue(undefined)).toBe('');
  });
});

describe('applyScriptCollectionVarsToCollection', () => {
  it('returns null for a null collection', () => {
    expect(applyScriptCollectionVarsToCollection(null, { a: '1' })).toBeNull();
  });

  it('updates, adds, and removes the collection variables', () => {
    const collection = { request: { variables: [{ name: 'a', value: '1' }, { name: 'gone', value: 'x' }] } } as any;
    const out = applyScriptCollectionVarsToCollection(collection, { a: '2', b: '3' });
    expect(out?.request?.variables).toEqual([{ name: 'a', value: '2' }, { name: 'b', value: '3' }]);
  });

  it('creates the variables list when the collection has none', () => {
    const out = applyScriptCollectionVarsToCollection({} as any, { a: '1' });
    expect(out?.request?.variables).toEqual([{ name: 'a', value: '1' }]);
  });

  it('keeps the other request and collection fields', () => {
    const collection = { info: { name: 'C' }, request: { auth: { mode: 'none' }, variables: [] } } as any;
    const out = applyScriptCollectionVarsToCollection(collection, { a: '1' });
    expect(out?.request?.auth).toEqual({ mode: 'none' });
    expect(out?.info).toEqual({ name: 'C' });
  });
});

describe('reconcileScriptVariables keeps the data type and value shape of each variable', () => {
  it('leaves a typed variable alone when the script changes a different one', () => {
    const out = reconcileScriptVariables(
      [{ name: 'count', value: { type: 'number', data: '8842' } }, { name: 'a', value: '1' }] as any,
      { count: 8842, a: '2' }
    );
    expect(out).toEqual([
      { name: 'count', value: { type: 'number', data: '8842' } },
      { name: 'a', value: '2' }
    ]);
  });

  it('keeps all the values of a multi-value variable, not just the selected one', () => {
    const variant = [{ title: 'us', value: 'us-1' }, { title: 'eu', value: 'eu-1', selected: true }];
    const out = reconcileScriptVariables(
      [{ name: 'region', value: variant }, { name: 'a', value: '1' }] as any,
      { region: 'eu-1', a: '2' }
    );
    expect(out[0].value).toEqual(variant);
  });

  it('keeps a number typed as a number when the script changes its value', () => {
    const out = reconcileScriptVariables(
      [{ name: 'count', value: { type: 'number', data: '8842' } }] as any,
      { count: 100 }
    );
    expect(out).toEqual([{ name: 'count', value: { type: 'number', data: '100' } }]);
  });
});

describe('env and collection variable changes apply together without overwriting each other', () => {
  it('applies an env change and then a collection change and keeps both', () => {
    const collection: any = {
      config: { environments: [{ name: 'Dev', variables: [{ name: 'e', value: 'old' }] }] },
      request: { variables: [{ name: 'c', value: 'old' }] }
    };
    const afterEnv = applyScriptEnvVarsToCollection(collection, 'Dev', { e: 'newE' });
    const afterBoth = applyScriptCollectionVarsToCollection(afterEnv, { c: 'newC' });
    expect(afterBoth?.config?.environments?.[0].variables).toEqual([{ name: 'e', value: 'newE' }]);
    expect(afterBoth?.request?.variables).toEqual([{ name: 'c', value: 'newC' }]);
  });
});

describe('reconcileScriptVariables sets the data type from the value', () => {
  it('stores a number, boolean, and object with its own type and keeps a string plain', () => {
    const out = reconcileScriptVariables([] as any, {
      retryCount: 3,
      featureFlags: { darkMode: true },
      isEnabled: true,
      label: 'prod'
    });
    expect(out).toEqual([
      { name: 'retryCount', value: { type: 'number', data: '3' } },
      { name: 'featureFlags', value: { type: 'object', data: '{"darkMode":true}' } },
      { name: 'isEnabled', value: { type: 'boolean', data: 'true' } },
      { name: 'label', value: 'prod' }
    ]);
  });

  it('gives a script-set collection variable the type of its value', () => {
    const out = applyScriptCollectionVarsToCollection({ request: { variables: [] } } as any, {
      retryCount: 3,
      featureFlags: { darkMode: true }
    });
    expect(out?.request?.variables).toEqual([
      { name: 'retryCount', value: { type: 'number', data: '3' } },
      { name: 'featureFlags', value: { type: 'object', data: '{"darkMode":true}' } }
    ]);
  });
});

describe('the data type a script sets is the type shown in the variables table', () => {
  const CASES = [
    { name: 's', raw: 'prod', dataType: 'string', stored: 'prod', display: 'prod' },
    { name: 'n', raw: 3, dataType: 'number', stored: { type: 'number', data: '3' }, display: '3' },
    { name: 'b', raw: true, dataType: 'boolean', stored: { type: 'boolean', data: 'true' }, display: 'true' },
    { name: 'o', raw: { darkMode: true }, dataType: 'object', stored: { type: 'object', data: '{"darkMode":true}' }, display: '{"darkMode":true}' }
  ] as const;
  const finalVars = Object.fromEntries(CASES.map((c) => [c.name, c.raw]));
  const byName = (vars: { name?: string }[]): Record<string, any> =>
    Object.fromEntries(vars.map((v) => [v.name ?? '', v]));

  it('setCollectionVar stores each type so the collection variables table shows it correctly', () => {
    const out = applyScriptCollectionVarsToCollection({ request: { variables: [] } } as any, finalVars);
    const vars = byName((out?.request?.variables ?? []) as { name?: string }[]);
    for (const c of CASES) {
      expect(vars[c.name].value).toEqual(c.stored);
      const { value, dataType } = unwrapVariableTyped(vars[c.name].value);
      expect(toDataType(dataType)).toBe(c.dataType);
      expect(value).toBe(c.display);
    }
  });

  it('setEnvVar stores each type so the environment variables table shows it correctly', () => {
    const out = applyScriptEnvVarsToCollection(
      { config: { environments: [{ name: 'Dev', variables: [] }] } } as any,
      'Dev',
      finalVars
    );
    const vars = byName((out?.config?.environments?.[0].variables ?? []) as { name?: string }[]);
    for (const c of CASES) {
      expect(vars[c.name].value).toEqual(c.stored);
      const row = envVariableToRow(vars[c.name], 0);
      expect(row.dataType).toBe(c.dataType);
      expect(row.value).toBe(c.display);
    }
  });
});
