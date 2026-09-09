import React from 'react';
import type { OpenCollection as IOpenCollection } from '@opencollection/types';
import CollectionRoot from '../CollectionRoot/CollectionRoot';
import AppShell from '../AppShell/AppShell';
import Playground from '../Playground/Playground';
import playgroundReducer from '@/store/slices/playground';

export interface OpenCollectionProps {
  collection: IOpenCollection | string | File;
  logo?: React.ReactNode;
  gitCollectionUrl?: string;
}

/** Docs with the playground available behind Try. Both surfaces in one mount. */
const OpenCollection: React.FC<OpenCollectionProps> = ({ collection, logo, gitCollectionUrl }) => (
  <CollectionRoot
    collection={collection}
    gitCollectionUrl={gitCollectionUrl}
    reducers={{ playground: playgroundReducer }}
  >
    <AppShell logo={logo} renderPlayground={(openNonce) => <Playground openNonce={openNonce} />} />
  </CollectionRoot>
);

export default OpenCollection;
