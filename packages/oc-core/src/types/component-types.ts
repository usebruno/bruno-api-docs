import React from 'react';
import type { OpenCollection } from '@opencollection/types';

/**
 * Custom page configuration (oc-core specific, not part of OpenCollection schema)
 */
export interface CustomPage {
  name: string;
  content?: string;
  contentPath?: string;
}

/**
 * OpenCollection React component props
 */
export interface OpenCollectionProps {
  collection: OpenCollection | string | File;
  theme?: 'light' | 'dark' | 'auto';
  logo?: React.ReactNode;
  hideSidebar?: boolean;
  hideHeader?: boolean;
  onlyShow?: string[];
  proxyUrl?: string;
  customPages?: CustomPage[];
}

