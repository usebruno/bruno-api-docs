import React, { forwardRef } from 'react';
import StyledWrapper from './StyledWrapper';
import { cx } from '@/utils/cx';

interface ActionIconProps {
  children: React.ReactNode;
  variant?: 'subtle' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  component?: React.ElementType;
  label: string;
  title?: string;
  ariaLabel?: string;
  colorOnHover?: string;
  color?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const ActionIcon = forwardRef<HTMLButtonElement, ActionIconProps>(({
  children,
  variant = 'subtle',
  size = 'md',
  disabled = false,
  className = '',
  component: Component = 'button',
  label,
  ariaLabel,
  colorOnHover,
  color,
  style,
  ...rest
}, ref) => {
  return (
    <StyledWrapper
      ref={ref}
      as={Component}
      $variant={variant}
      $size={size}
      $colorOnHover={colorOnHover}
      $color={color}
      disabled={disabled}
      className={cx('action-icon', className)}
      title={label}
      aria-label={ariaLabel}
      style={style}
      {...rest}
    >
      {children}
    </StyledWrapper>
  );
});

export default ActionIcon;
