const SUPPORTED_TYPED_ARRAYS = [
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array'
];

const MAX_TYPED_ARRAY_LENGTH = 65536;

type SupportedTypedArray
  = | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array;

interface SerializedTypedArray {
  type: string;
  array: number[];
  length: number;
}

function serializeTypedArray(typedArray: SupportedTypedArray) {
  return {
    type: typedArray.constructor.name,
    array: Array.from(typedArray),
    length: typedArray.length
  };
}

function deserializeTypedArray(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('getRandomValues: Invalid typed array object');
  }
  const obj = input as SerializedTypedArray;

  if (typeof obj.type !== 'string' || !SUPPORTED_TYPED_ARRAYS.includes(obj.type)) {
    throw new TypeError(`getRandomValues: Invalid or unsupported typed array type: ${obj.type}`);
  }

  if (!Array.isArray(obj.array) || !Number.isInteger(obj.length) || obj.length < 0 || obj.length > obj.array.length) {
    throw new TypeError('getRandomValues: Invalid typed array properties');
  }

  if (obj.array.length > MAX_TYPED_ARRAY_LENGTH) {
    throw new Error('getRandomValues: ArrayBufferView byte length exceeds 65536');
  }

  const TypedArrayConstructor = (
    globalThis as unknown as Record<string, (new (...args: unknown[]) => SupportedTypedArray) | undefined>
  )[obj.type];
  if (typeof TypedArrayConstructor !== 'function') {
    throw new TypeError(`getRandomValues: Constructor ${obj.type} is not available`);
  }

  return new TypedArrayConstructor(obj.array, 0, obj.length);
}

export { serializeTypedArray, deserializeTypedArray, SUPPORTED_TYPED_ARRAYS };
