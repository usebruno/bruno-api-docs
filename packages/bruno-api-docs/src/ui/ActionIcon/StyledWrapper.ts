import styled from '@emotion/styled';
import { css } from '@emotion/react';

type ActionIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<ActionIconSize, number> = {
  xs: 1.25,
  sm: 1.375,
  md: 1.5,
  lg: 1.75,
  xl: 2
};

const variants = {
  subtle: css`
    color: var(--text-muted);
    background: transparent;
    &:hover:not(:disabled) {
      color: var(--oc-text);
      background: var(--oc-dropdown-hover-bg);
    }
  `
};

interface ActionIconStyleProps {
  $size?: ActionIconSize | number;
  $variant?: string;
  $color?: string;
  $colorOnHover?: string;
}

const StyledWrapper = styled.button<ActionIconStyleProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;

  width: ${(props) => sizeMap[props.$size as ActionIconSize] || props.$size}rem;
  height: ${(props) => sizeMap[props.$size as ActionIconSize] || props.$size}rem;

  ${(props) => variants[props.$variant as keyof typeof variants] || variants.subtle}

  ${(props) => props.$color && css`
    color: ${props.$color};
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${(props) => props.$colorOnHover && css`
    &:hover:not(:disabled) {
      color: ${props.$colorOnHover};
    }
  `}
`;

export default StyledWrapper;
