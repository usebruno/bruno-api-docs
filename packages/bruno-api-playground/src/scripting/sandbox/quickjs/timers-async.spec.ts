import { describe, it, expect } from 'vitest';
import ScriptRuntime from '../../runtime/script-runtime';
import type { JsonValue } from '../../utils/bruno-response';

const runScript = async (script: string) => {
  const runtimeVariables: Record<string, JsonValue> = {};
  await new ScriptRuntime().runScript({ script, variables: { runtimeVariables } });
  return runtimeVariables;
};

describe('timers inside the quickjs sandbox', () => {
  it('setTimeout returns an awaitable promise that runs the callback first (diverges from desktop timer ids)', async () => {
    const vars = await runScript(`
      const order = [];
      order.push('before');
      const pending = setTimeout(() => { order.push('timer'); }, 5);
      bru.setVar('returnType', Object.prototype.toString.call(pending));
      await pending;
      order.push('after');
      bru.setVar('order', order.join(','));
    `);
    expect(vars.returnType).toBe('[object Promise]');
    expect(vars.order).toBe('before,timer,after');
  });

  it('does not expose clearTimeout or setInterval', async () => {
    const vars = await runScript(`
      bru.setVar('clearTimeoutType', typeof clearTimeout);
      bru.setVar('setIntervalType', typeof setInterval);
    `);
    expect(vars.clearTimeoutType).toBe('undefined');
    expect(vars.setIntervalType).toBe('undefined');
  });

  it('a zero-delay setTimeout still runs its callback', async () => {
    const vars = await runScript(`
      let fired = false;
      await setTimeout(() => { fired = true; }, 0);
      bru.setVar('fired', fired);
    `);
    expect(vars.fired).toBe(true);
  });

  it('an un-awaited setTimeout fires once a later await yields to the event loop', async () => {
    const vars = await runScript(`
      let fired = false;
      setTimeout(() => { fired = true; }, 5);
      await bru.sleep(30);
      bru.setVar('fired', fired);
    `);
    expect(vars.fired).toBe(true);
  });

  it('bru.sleep sequences code across the await boundary', async () => {
    const vars = await runScript(`
      const order = [];
      order.push('a');
      await bru.sleep(5);
      order.push('b');
      await bru.sleep(5);
      order.push('c');
      bru.setVar('order', order.join(','));
    `);
    expect(vars.order).toBe('a,b,c');
  });

  it('bru.sleep waits at least the requested duration', async () => {
    const startedAt = Date.now();
    await runScript(`await bru.sleep(30);`);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(25);
  });

  it('concurrent setTimeouts fire in delay order, not registration order', async () => {
    const vars = await runScript(`
      const fired = [];
      setTimeout(() => { fired.push('long'); }, 25);
      setTimeout(() => { fired.push('short'); }, 5);
      await bru.sleep(50);
      bru.setVar('fired', fired.join(','));
    `);
    expect(vars.fired).toBe('short,long');
  });

  it('does not wait for a dangling timer, which still fires against the live vm afterwards', async () => {
    const vars = await runScript(`
      setTimeout(() => { bru.setVar('late', true); }, 5);
      bru.setVar('atEnd', 'done');
    `);
    expect(vars.atEnd).toBe('done');
    expect(vars.late).toBeUndefined();
    await new Promise((resolve) => { setTimeout(resolve, 60); });
    expect(vars.late).toBe(true);
  });

  it('a throwing timer callback does not fail the run', async () => {
    const vars = await runScript(`
      setTimeout(() => { throw new Error('timer boom'); }, 5);
      await bru.sleep(30);
      bru.setVar('survived', true);
    `);
    expect(vars.survived).toBe(true);
  });

  it('a nested setTimeout with a bridged sleep inside runs to completion', async () => {
    const vars = await runScript(`
      const order = [];
      setTimeout(() => {
        order.push('outer');
        setTimeout(async () => {
          order.push('inner');
          await bru.sleep(5);
          order.push('bridged');
        }, 5);
      }, 5);
      await bru.sleep(40);
      bru.setVar('order', order.join(','));
    `);
    expect(vars.order).toBe('outer,inner,bridged');
  });

  it('runs microtasks before a zero-delay timer', async () => {
    const vars = await runScript(`
      const order = [];
      order.push('sync');
      Promise.resolve().then(() => { order.push('micro'); });
      setTimeout(() => { order.push('timer0'); }, 0);
      await bru.sleep(20);
      bru.setVar('order', order.join(','));
    `);
    expect(vars.order).toBe('sync,micro,timer0');
  });

  it('drops extra setTimeout arguments instead of forwarding them to the callback', async () => {
    const vars = await runScript(`
      await setTimeout((arg) => { bru.setVar('argType', typeof arg); }, 5, 'extra');
    `);
    expect(vars.argType).toBe('undefined');
  });
});

describe('async code inside the quickjs sandbox', () => {
  it('awaits a script-declared async function', async () => {
    const vars = await runScript(`
      async function compute() {
        await bru.sleep(1);
        return 41 + 1;
      }
      bru.setVar('value', await compute());
    `);
    expect(vars.value).toBe(42);
  });

  it('resolves a then chain', async () => {
    const vars = await runScript(`
      const value = await Promise.resolve(2)
        .then((n) => n * 3)
        .then((n) => n + 1);
      bru.setVar('value', value);
    `);
    expect(vars.value).toBe(7);
  });

  it('routes a rejection into catch', async () => {
    const vars = await runScript(`
      const value = await Promise.reject(new Error('boom'))
        .catch((e) => 'caught:' + e.message);
      bru.setVar('value', value);
    `);
    expect(vars.value).toBe('caught:boom');
  });

  it('try/catch around an awaited rejection works', async () => {
    const vars = await runScript(`
      let value = 'not-caught';
      try {
        await Promise.reject(new Error('kaput'));
      } catch (e) {
        value = 'caught:' + e.message;
      }
      bru.setVar('value', value);
    `);
    expect(vars.value).toBe('caught:kaput');
  });

  it('Promise.all resolves mixed promises together', async () => {
    const vars = await runScript(`
      async function delayed() {
        await bru.sleep(5);
        return 'delayed';
      }
      const [a, b, c] = await Promise.all([
        Promise.resolve('plain'),
        delayed(),
        bru.sleep(1).then(() => 'slept')
      ]);
      bru.setVar('value', [a, b, c].join(','));
    `);
    expect(vars.value).toBe('plain,delayed,slept');
  });

  it('Promise.allSettled reports fulfilled and rejected outcomes', async () => {
    const vars = await runScript(`
      const results = await Promise.allSettled([
        bru.sleep(1).then(() => 'ok'),
        Promise.reject(new Error('nope'))
      ]);
      bru.setVar('statuses', results.map((r) => r.status).join(','));
    `);
    expect(vars.statuses).toBe('fulfilled,rejected');
  });

  it('Promise.any resolves with the first fulfilled promise', async () => {
    const vars = await runScript(`
      const winner = await Promise.any([
        Promise.reject(new Error('a failed')),
        bru.sleep(1).then(() => 'b')
      ]);
      bru.setVar('winner', winner);
    `);
    expect(vars.winner).toBe('b');
  });

  it('Promise.race resolves with the faster promise', async () => {
    const vars = await runScript(`
      const winner = await Promise.race([
        bru.sleep(5).then(() => 'fast'),
        bru.sleep(50).then(() => 'slow')
      ]);
      bru.setVar('winner', winner);
    `);
    expect(vars.winner).toBe('fast');
  });

  it('an awaited rejection without a catch fails the script run', async () => {
    await expect(
      runScript(`await Promise.reject(new Error('unhandled boom'));`)
    ).rejects.toThrow('unhandled boom');
  });

  it('an error thrown inside an awaited async function fails the script run', async () => {
    await expect(
      runScript(`
        async function explode() {
          await bru.sleep(1);
          throw new Error('async boom');
        }
        await explode();
      `)
    ).rejects.toThrow('async boom');
  });
});
