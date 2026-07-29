import React, { forwardRef } from 'react';
import StyledWrapper from './StyledWrapper';

interface ActionIconProps {
  children: React.ReactNode;
  variant?: 'subtle' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  component?: React.ElementType;
  label: string;
  title?: string;
  'aria-label'?: string;
  colorOnHover?: string;
  color?: string;
  style?: React.CSSProperties;
  [key: string]: any; // Allow additional props
}

const ActionIcon = forwardRef<HTMLElement, ActionIconProps>(({
  children,
  variant = 'subtle',
  size = 'md',
  disabled = false,
  className = '',
  component: Component = 'button',
  label,
  'aria-label': ariaLabel,
  colorOnHover,
  color,
  style,
  ...rest
}, ref) => {
  // Build className array and filter out empty strings
  const classNames = ['action-icon', className].filter(Boolean).join(' ');

  return (
    <StyledWrapper
      ref={ref}
      as={Component}
      $variant={variant}
      $size={size}
      $colorOnHover={colorOnHover}
      $color={color}
      disabled={disabled}
      className={classNames}
      title={label}
      aria-label={ariaLabel}
      style={style}
      {...rest}
    >
      {children}
    </StyledWrapper>
  );
});

ActionIcon.displayName = 'ActionIcon';

export default ActionIcon;
