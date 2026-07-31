import React from 'react';
import { StyledWrapper } from './StyledWrapper';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — icon buttons have no visible text. */
  label: string;
}

/**
 * Icon-only button primitive (aria-label required, no text). Shared across the
 * app — used for the Topbar hamburger, search toggle, overflow ⋯, etc. Extra
 * ARIA / button props (aria-expanded, aria-haspopup, onClick…) pass through.
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, children, type = 'button', ...rest }, ref) => (
    <StyledWrapper ref={ref} type={type} aria-label={label} {...rest}>
      {children}
    </StyledWrapper>
  )
);

IconButton.displayName = 'IconButton';

export default IconButton;
