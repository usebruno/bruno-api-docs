import { describe, it, expect } from 'vitest';
import { flattenTheme } from '@/theme/flatten';
import { light } from './light';
import { dark } from './dark';
import { backstageLight, backstageDark } from './backstage';

const vars = (theme: object) => flattenTheme(theme as Record<string, unknown>);

describe('backstage tokens', () => {
  it('emits the same CSS variables as the base theme it extends', () => {
    expect(Object.keys(vars(backstageLight)).sort()).toEqual(Object.keys(vars(light)).sort());
    expect(Object.keys(vars(backstageDark)).sort()).toEqual(Object.keys(vars(dark)).sort());
  });

  it('keeps the Bruno brand and uses the @backstage/theme backgrounds', () => {
    expect(backstageLight.mode).toBe('light');
    expect(backstageLight.brand).toBe(light.brand);
    expect(backstageLight.primary).toEqual(light.primary);
    expect(backstageLight.background.base).toBe('#FFFFFF');
    expect(backstageLight.background.mantle).toBe('#F8F8F8');

    expect(backstageDark.mode).toBe('dark');
    expect(backstageDark.brand).toBe(dark.brand);
    expect(backstageDark.primary).toEqual(dark.primary);
    expect(backstageDark.background.base).toBe('#424242');
    expect(backstageDark.background.mantle).toBe('#333333');
  });

  it('does not mutate the base themes', () => {
    expect(light.mode).toBe('light');
    expect(light.background.base).toBe('#ffffff');
    expect(dark.mode).toBe('dark');
  });
});
