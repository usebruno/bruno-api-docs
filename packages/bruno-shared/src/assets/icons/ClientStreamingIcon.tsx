import React from 'react';
import { baseIconProps } from './baseIconProps';

export const ClientStreamingIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg {...baseIconProps} width={size} height={size}>
    <path d="M21 7H3H16.5M18 4L21 7L18 10M6 14L3 17L6 20M3 17H21H8M13.5 4L16.5 7L13.5 10" />
  </svg>
);

export default ClientStreamingIcon;
