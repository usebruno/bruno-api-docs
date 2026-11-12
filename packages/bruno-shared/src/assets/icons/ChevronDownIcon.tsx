import React from 'react';
import { baseIconProps } from './baseIconProps';

/** Chevron down, the search palette's folder filter dropdown and expand toggles. */
export const ChevronDownIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg {...baseIconProps} width={size} height={size} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default ChevronDownIcon;
