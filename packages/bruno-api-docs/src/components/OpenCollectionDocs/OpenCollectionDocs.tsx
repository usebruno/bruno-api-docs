import React from 'react';
import CollectionRoot from '../CollectionRoot/CollectionRoot';
import AppShell from '../AppShell/AppShell';
import type { OpenCollectionProps } from '../OpenCollection/OpenCollection';

/**
 * Docs alone. Passing no playground is what keeps it out: the Try affordance and
 * every playground module disappear from the build, not just from the render.
 */
const OpenCollectionDocs: React.FC<OpenCollectionProps> = ({ collection, logo, gitCollectionUrl }) => (
  <CollectionRoot collection={collection} gitCollectionUrl={gitCollectionUrl}>
    <AppShell logo={logo} />
  </CollectionRoot>
);

export default OpenCollectionDocs;
