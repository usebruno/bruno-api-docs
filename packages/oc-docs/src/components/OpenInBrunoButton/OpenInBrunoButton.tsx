import React from 'react';
import { BrunoGlyph } from '../../assets/icons';
import { StyledWrapper } from './StyledWrapper';

export interface OpenInBrunoButtonProps {
  /** When provided, renders an `<a href>` to the Fetch-in-Bruno page (new tab). */
  href?: string;
  /** Click handler; used when no href is given (renders a `<button>`). */
  onClick?: () => void;
  /** Collapse to a square icon-only control. */
  iconOnly?: boolean;
  label?: string;
  testId?: string;
}

const OpenInBrunoButton: React.FC<OpenInBrunoButtonProps> = ({
  href,
  onClick,
  iconOnly = false,
  label = 'Open in Bruno',
  testId = 'open-in-bruno',
}) => {
  const className = iconOnly ? 'is-icon' : 'is-full';
  // With an href it renders an anchor opening the Fetch-in-Bruno page in a new
  // tab (keeps the docs open); without one it falls back to an onClick button.
  const tagProps = href
    ? ({ as: 'a' as const, href, target: '_blank' as const, rel: 'noopener noreferrer' })
    : ({ as: 'button' as const, type: 'button' as const, onClick });

  return (
    <StyledWrapper
      {...tagProps}
      className={className}
      aria-label={iconOnly ? label : undefined}
      title={label}
      data-testid={testId}
    >
      <BrunoGlyph />
      {!iconOnly && <span>{label}</span>}
    </StyledWrapper>
  );
};

export default OpenInBrunoButton;
