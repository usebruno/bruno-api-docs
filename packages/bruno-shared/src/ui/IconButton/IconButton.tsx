import React from 'react';
import { StyledWrapper } from './StyledWrapper';
import Tooltip from '../Tooltip/Tooltip';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — icon buttons have no visible text. */
  label: string;
  /** Show the hover/focus tooltip carrying `label`. Defaults to `true`. */
  showTooltip?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, children, type = 'button', showTooltip = true, ...rest }, ref) => (
    <Tooltip content={label} disabled={!label || !showTooltip}>
      <StyledWrapper ref={ref} type={type} aria-label={label} {...rest}>
        {children}
      </StyledWrapper>
    </Tooltip>
  )
);

export default IconButton;
