const isPlain = (value: unknown): value is object => {
  if (Array.isArray(value)) return true;
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export const deepFreeze = <T>(value: T): T => {
  if (!isPlain(value) || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
};
