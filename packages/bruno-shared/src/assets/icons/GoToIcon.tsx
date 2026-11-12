import React from 'react';
import type { SVGProps } from 'react';

type GoToIconProps = Omit<SVGProps<SVGSVGElement>, 'color'> & {
  width?: number | string;
  height?: number | string;
  color?: string;
};

export const GoToIcon: React.FC<GoToIconProps> = ({ width = 18, height = 18, color = 'currentColor', ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={true}
    {...rest}
  >
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </svg>
);
