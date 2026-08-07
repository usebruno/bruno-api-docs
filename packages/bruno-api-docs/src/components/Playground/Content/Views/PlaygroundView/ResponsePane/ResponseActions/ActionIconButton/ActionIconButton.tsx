import React from 'react';
import { StyledWrapper } from './StyledWrapper';
import Tooltip from '@/ui/Tooltip/Tooltip';

export interface ActionIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — icon buttons have no visible text. */
  label: string;
  /** Show the hover/focus tooltip carrying `label`. Defaults to `true`. */
  showTooltip?: boolean;
}

const ActionIconButton = React.forwardRef<HTMLButtonElement, ActionIconButtonProps>(
  ({ label, children, type = 'button', showTooltip = true, ...rest }, ref) => (
    <Tooltip content={label} disabled={!label || !showTooltip}>
      <StyledWrapper ref={ref} type={type} aria-label={label} {...rest}>
        {children}
      </StyledWrapper>
    </Tooltip>
  )
);

export default ActionIconButton;
