import { describe, it, expect } from 'vitest';
import { serializeTypedArray, deserializeTypedArray, SUPPORTED_TYPED_ARRAYS } from './utils';

describe('SUPPORTED_TYPED_ARRAYS', () => {
  it('lists only the integer typed arrays web crypto accepts', () => {
    expect(SUPPORTED_TYPED_ARRAYS).toEqual([
      'Int8Array',
      'Uint8Array',
      'Uint8ClampedArray',
      'Int16Array',
      'Uint16Array',
      'Int32Array',
      'Uint32Array'
    ]);
  });
});

describe('deserializeTypedArray', () => {
  it('round-trips a serialized Uint8Array', () => {
    const original = new Uint8Array([1, 2, 3]);
    const rebuilt = deserializeTypedArray(serializeTypedArray(original));
    expect(rebuilt).toBeInstanceOf(Uint8Array);
    expect(Array.from(rebuilt)).toEqual([1, 2, 3]);
  });

  it('accepts an array at exactly the 65536 cap', () => {
    const rebuilt = deserializeTypedArray({
      type: 'Uint8Array',
      array: new Array(65536).fill(0),
      length: 65536
    });
    expect(rebuilt.length).toBe(65536);
  });

  it('rejects a non-array faking a huge length before allocating', () => {
    expect(() => deserializeTypedArray({
      type: 'Uint8Array',
      array: { length: 50_000_000 },
      length: 5
    })).toThrow('getRandomValues: Invalid typed array properties');
  });

  it('rejects a real array over the cap', () => {
    expect(() => deserializeTypedArray({
      type: 'Uint8Array',
      array: new Array(65537).fill(0),
      length: 65537
    })).toThrow('getRandomValues: ArrayBufferView byte length exceeds 65536');
  });

  it('rejects a length larger than the array', () => {
    expect(() => deserializeTypedArray({
      type: 'Uint8Array',
      array: [1, 2],
      length: 9
    })).toThrow('getRandomValues: Invalid typed array properties');
  });

  it('rejects a non-integer length', () => {
    expect(() => deserializeTypedArray({
      type: 'Uint8Array',
      array: [1, 2],
      length: 1.5
    })).toThrow('getRandomValues: Invalid typed array properties');
  });

  it('rejects float typed arrays', () => {
    expect(() => deserializeTypedArray({
      type: 'Float32Array',
      array: [1],
      length: 1
    })).toThrow('getRandomValues: Invalid or unsupported typed array type: Float32Array');
  });

  it('rejects bigint typed arrays', () => {
    expect(() => deserializeTypedArray({
      type: 'BigInt64Array',
      array: [1],
      length: 1
    })).toThrow('getRandomValues: Invalid or unsupported typed array type: BigInt64Array');
  });

  it('rejects a non-object input', () => {
    expect(() => deserializeTypedArray('nope')).toThrow('getRandomValues: Invalid typed array object');
  });
});
