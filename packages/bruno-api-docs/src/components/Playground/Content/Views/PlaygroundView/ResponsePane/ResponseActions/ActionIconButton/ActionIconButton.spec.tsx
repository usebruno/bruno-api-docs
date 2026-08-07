import { describe, it, expect } from 'vitest';
import ActionIconButton from './ActionIconButton';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, query } from '@/test-utils/dom';

describe('ActionIconButton', () => {
  it('renders a button with the accessible label and its child glyph', () => {
    const root = useRenderToDom(
      <ActionIconButton label="Toggle sidebar">
        <svg data-testid="glyph" />
      </ActionIconButton>
    );
    expect(getByTestId(root, 'glyph')).toBeDefined();
    expect(query(root, 'button').getAttribute('aria-label')).toBe('Toggle sidebar');
  });

  it('forwards extra props (aria-expanded)', () => {
    const root = useRenderToDom(
      <ActionIconButton label="More options" aria-expanded={true}>
        <svg />
      </ActionIconButton>
    );
    expect(query(root, 'button').getAttribute('aria-expanded')).toBe('true');
  });
});
