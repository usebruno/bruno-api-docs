import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import ActionIconButton from './ActionIconButton';

describe('ActionIconButton', () => {
  it('renders a button with the accessible label and its child glyph', () => {
    const html = renderToStaticMarkup(
      <ActionIconButton label="Toggle sidebar">
        <svg data-testid="glyph" />
      </ActionIconButton>
    );
    expect(html).toContain('aria-label="Toggle sidebar"');
    expect(html).toContain('type="button"');
    expect(html).toContain('data-testid="glyph"');
  });

  it('forwards extra props (aria-expanded)', () => {
    const html = renderToStaticMarkup(
      <ActionIconButton label="More options" aria-expanded={true}>
        <svg />
      </ActionIconButton>
    );
    expect(html).toContain('aria-expanded="true"');
  });
});
