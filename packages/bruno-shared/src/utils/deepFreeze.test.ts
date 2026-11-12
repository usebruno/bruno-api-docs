import { describe, it, expect } from 'vitest';
import { deepFreeze } from './deepFreeze';

describe('deepFreeze', () => {
  it('freezes nested plain objects and arrays', () => {
    const value = deepFreeze({ info: { name: 'a' }, items: [{ http: { url: 'x' } }] });
    expect(Object.isFrozen(value.info)).toBe(true);
    expect(Object.isFrozen(value.items)).toBe(true);
    expect(Object.isFrozen(value.items[0].http)).toBe(true);
  });

  it('leaves typed arrays, class instances and already frozen branches alone', () => {
    class Box { open = true; }
    const frozen = Object.freeze({ inner: { touched: false } });
    const value = deepFreeze({ bytes: new Uint8Array([1]), box: new Box(), frozen });
    expect(Object.isFrozen(value.bytes)).toBe(false);
    expect(Object.isFrozen(value.box)).toBe(false);
    expect(Object.isFrozen(value.frozen.inner)).toBe(false);
  });
});
