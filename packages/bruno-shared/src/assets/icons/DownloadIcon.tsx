import React from 'react';
import type { SVGProps } from 'react';

type DownloadIconProps = Omit<SVGProps<SVGSVGElement>, 'color'> & {
  width?: number | string;
  height?: number | string;
  color?: string;
};

export const DownloadIcon: React.FC<DownloadIconProps> = ({ width = 18, height = 18, color = 'currentColor', ...rest }) => (
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
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);
