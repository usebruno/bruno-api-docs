import React from 'react';
import CollectionRoot from '../CollectionRoot/CollectionRoot';
import Playground from '../Playground/Playground';
import playgroundReducer from '@/store/slices/playground';
import type { OpenCollectionProps } from '../OpenCollection/OpenCollection';

/** The playground alone, filling its host. No docs shell, no docs modules. */
const OpenCollectionPlayground: React.FC<Omit<OpenCollectionProps, 'logo'>> = ({
  collection,
  gitCollectionUrl
}) => (
  <CollectionRoot
    collection={collection}
    gitCollectionUrl={gitCollectionUrl}
    reducers={{ playground: playgroundReducer }}
  >
    <Playground standalone />
  </CollectionRoot>
);

export default OpenCollectionPlayground;
