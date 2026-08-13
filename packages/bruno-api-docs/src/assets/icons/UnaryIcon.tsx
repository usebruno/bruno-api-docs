import React from 'react';
import { baseIconProps } from './baseIconProps';

export const UnaryIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg {...baseIconProps} width={size} height={size}>
    <path d="M21 7H3M18 4L21 7L18 10M6 14L3 17L6 20M3 17H21" />
  </svg>
);

export default UnaryIcon;
