import { describe, it, expect } from 'vitest';
import { descriptionText, resolveDescription } from './description';

describe('descriptionText', () => {
  it('returns a non-empty string unchanged (surrounding spaces kept)', () => {
    expect(descriptionText('hello')).toBe('hello');
    expect(descriptionText(' hi ')).toBe(' hi ');
  });

  it('treats a whitespace-only string as absent', () => {
    expect(descriptionText('   ')).toBeUndefined();
  });

  it('extracts content from the legacy { content } object form', () => {
    expect(descriptionText({ content: 'from object', type: 'markdown' })).toBe('from object');
  });

  it('returns undefined for null, non-objects and content-less objects', () => {
    expect(descriptionText(null)).toBeUndefined();
    expect(descriptionText(undefined)).toBeUndefined();
    expect(descriptionText(42)).toBeUndefined();
    expect(descriptionText({ type: 'text' })).toBeUndefined();
  });
});

describe('resolveDescription', () => {
  it('omits a blank, whitespace-only or absent edit', () => {
    expect(resolveDescription('')).toBeUndefined();
    expect(resolveDescription('   ')).toBeUndefined();
    expect(resolveDescription(undefined)).toBeUndefined();
  });

  it('never coerces a non-string value to "[object Object]"', () => {
    expect(resolveDescription({ content: 'x' })).toBeUndefined();
  });

  it('keeps a non-blank string as-is', () => {
    expect(resolveDescription('brand new')).toBe('brand new');
  });
});
