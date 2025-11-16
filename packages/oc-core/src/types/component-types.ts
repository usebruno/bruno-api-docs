import React from 'react';
import type { OpenCollection } from '@opencollection/types';

/**
 * OpenCollection React component props
 */
export interface OpenCollectionProps {
  collection: OpenCollection | string | File;
  theme?: 'light' | 'dark' | 'auto';
  logo?: React.ReactNode;
  hideHeader?: boolean;
}

