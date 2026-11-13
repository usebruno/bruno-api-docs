import { describe, it, expect } from 'vitest';
import { reconcileScriptVariables, coerceScriptVarValue } from './scriptVariables';
import { applyScriptEnvVars, envVariableToRow } from './environments';
import { unwrapVariableTyped } from './variableResolution';
import { toDataType } from './variableDataType';
import type { Environment } from '@opencollection/types/config/environments';
import type { Variable } from '@opencollection/types/common/variables';

describe('reconcileScriptVariables', () => {
  it('updates and adds the variables in upserts', () => {
    const out = reconcileScriptVariables(
      [{ name: 'a', value: '1' }, { name: 'b', value: '2' }],
      { a: '1x', c: '3' }
    );
    expect(out).toEqual([{ name: 'a', value: '1x' }, { name: 'b', value: '2' }, { name: 'c', value: '3' }]);
  });

  it('leaves a variable the upserts never mention untouched (upsert-only, no blind delete)', () => {
    const out = reconcileScriptVariables([{ name: 'a', value: '1' }, { name: 'b', value: '2' }], { a: '1x' });
    expect(out).toEqual([{ name: 'a', value: '1x' }, { name: 'b', value: '2' }]);
  });

  it('removes only the variables listed as deleted', () => {
    const out = reconcileScriptVariables(
      [{ name: 'a', value: '1' }, { name: 'b', value: '2' }],
      {},
      { deleted: new Set(['b']) }
    );
    expect(out).toEqual([{ name: 'a', value: '1' }]);
  });

  it('applies upserts and deletes in one pass', () => {
    const out = reconcileScriptVariables(
      [{ name: 'a', value: '1' }, { name: 'b', value: '2' }, { name: 'c', value: '3' }],
      { a: '1x', d: '4' },
      { deleted: new Set(['c']) }
    );
    expect(out).toEqual([{ name: 'a', value: '1x' }, { name: 'b', value: '2' }, { name: 'd', value: '4' }]);
  });

  it('leaves disabled variables untouched, even when deleted names them', () => {
    const out = reconcileScriptVariables([{ name: 'a', value: '1', disabled: true }], {}, { deleted: new Set(['a']) });
    expect(out).toEqual([{ name: 'a', value: '1', disabled: true }]);
  });

  it('creates a new enabled variable when the upsert name matches only a disabled one', () => {
    const out = reconcileScriptVariables([{ name: 'a', value: '1', disabled: true }], { a: '2' });
    expect(out).toEqual([{ name: 'a', value: '1', disabled: true }, { name: 'a', value: '2' }]);
  });

  it('keeps the other fields when updating a variable', () => {
    const out = reconcileScriptVariables([{ name: 'a', value: '1', secret: true }], { a: '2' });
    expect(out).toEqual([{ name: 'a', value: '2', secret: true }]);
  });

  it('writes a same-name plain/secret pair only once, into the last (resolver-visible) entry', () => {
    const out = reconcileScriptVariables(
      [{ name: 'token', value: 'plain' }, { name: 'token', value: 'old', secret: true }],
      { token: 'new' }
    );
    expect(out).toEqual([{ name: 'token', value: 'plain' }, { name: 'token', value: 'new', secret: true }]);
  });

  it('writes to the secret entry even when it is listed before the plain one (matches the resolver)', () => {
    const out = reconcileScriptVariables(
      [{ name: 'token', value: 'old', secret: true }, { name: 'token', value: 'plain' }],
      { token: 'new' }
    );
    expect(out).toEqual([{ name: 'token', value: 'new', secret: true }, { name: 'token', value: 'plain' }]);
  });

  it('never adds a variable whose name is in the skip list', () => {
    const out = reconcileScriptVariables([], { sec: 'x', b: '2' }, { skip: new Set(['sec']) });
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

describe('reconcileScriptVariables keeps the data type and value shape of each variable', () => {
  it('leaves a typed variable alone when the script changes a different one', () => {
    const out = reconcileScriptVariables(
      [{ name: 'count', value: { type: 'number', data: '8842' } }, { name: 'a', value: '1' }],
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
      [{ name: 'region', value: variant }, { name: 'a', value: '1' }],
      { region: 'eu-1', a: '2' }
    );
    expect(out[0]).toEqual({ name: 'region', value: variant });
  });

  it('updates the selected variant when a script changes a multi-value variable, keeping the array', () => {
    const variant = [{ title: 'us', value: 'us-1' }, { title: 'eu', value: 'eu-1', selected: true }];
    const out = reconcileScriptVariables([{ name: 'region', value: variant }], { region: 'us-1' });
    expect(out).toEqual([{ name: 'region', value: [
      { title: 'us', value: 'us-1' },
      { title: 'eu', value: 'us-1', selected: true }
    ] }]);
  });

  it('flattens an empty variants array to the script value instead of dropping the write', () => {
    const out = reconcileScriptVariables([{ name: 'region', value: [] }], { region: 'us-1' });
    expect(out).toEqual([{ name: 'region', value: 'us-1' }]);
  });

  it('keeps a number typed as a number when the script changes its value', () => {
    const out = reconcileScriptVariables(
      [{ name: 'count', value: { type: 'number', data: '8842' } }],
      { count: 100 }
    );
    expect(out).toEqual([{ name: 'count', value: { type: 'number', data: '100' } }]);
  });
});

describe('reconcileScriptVariables sets the data type from the value', () => {
  it('stores a number, boolean, and object with its own type and keeps a string plain', () => {
    const out = reconcileScriptVariables([], {
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
    const out = reconcileScriptVariables([], { retryCount: 3, featureFlags: { darkMode: true } });
    expect(out).toEqual([
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
  const storedVariables: Variable[] = CASES.map((c) => ({ name: c.name, value: c.stored }));
  const tableRows = CASES.map((c) => ({ name: c.name, dataType: c.dataType, display: c.display }));
  const collectionRows = storedVariables.map((variable) => {
    const { value, dataType } = unwrapVariableTyped(variable.value);
    return { name: variable.name, dataType: toDataType(dataType), display: value };
  });
  const environmentRows = storedVariables.map((variable, index) => {
    const row = envVariableToRow(variable, index);
    return { name: row.name, dataType: row.dataType, display: row.value };
  });

  it('setCollectionVar stores each type so the collection variables table shows it correctly', () => {
    const out = reconcileScriptVariables([], finalVars);
    expect(out).toEqual(storedVariables);
    expect(collectionRows).toEqual(tableRows);
  });

  it('setEnvVar stores each type so the environment variables table shows it correctly', () => {
    const out = applyScriptEnvVars({ name: 'Dev', variables: [] } as Environment, finalVars);
    expect(out).toEqual(storedVariables);
    expect(environmentRows).toEqual(tableRows);
  });
});

describe('reconcileScriptVariables keeps secret variables in their own shape', () => {
  it('leaves a typed secret untouched when a different variable changes', () => {
    const out = reconcileScriptVariables(
      [{ name: 'apiKey', value: '5', type: 'number', secret: true }, { name: 'a', value: '1' }],
      { apiKey: 5, a: '2' }
    );
    expect(out).toEqual([
      { name: 'apiKey', value: '5', type: 'number', secret: true },
      { name: 'a', value: '2' }
    ]);
  });

  it('updates a secret without wrapping its value, keeping the type beside it', () => {
    const out = reconcileScriptVariables(
      [{ name: 'apiKey', value: '5', type: 'number', secret: true }],
      { apiKey: 10 }
    );
    expect(out).toEqual([{ name: 'apiKey', value: '10', type: 'number', secret: true }]);
  });

  it('drops the type when a secret becomes a plain string', () => {
    const out = reconcileScriptVariables(
      [{ name: 'apiKey', value: '5', type: 'number', secret: true }],
      { apiKey: 'abc' }
    );
    expect(out).toEqual([{ name: 'apiKey', value: 'abc', secret: true }]);
  });
});
