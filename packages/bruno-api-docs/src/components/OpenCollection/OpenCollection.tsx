import React from 'react';
import { HashRouter } from 'react-router-dom';
import AppShell from '../AppShell/AppShell';
import CollectionShell, { type CollectionShellProps } from '@usebruno/api-shared/components/CollectionShell/CollectionShell';

export interface OpenCollectionProps extends Omit<CollectionShellProps, 'children'> {
  logo?: React.ReactNode;
  gitCollectionUrl?: string;
  hidePlayground?: boolean;
}

const OpenCollection: React.FC<OpenCollectionProps> = ({
  logo,
  gitCollectionUrl,
  hidePlayground = false,
  ...shell
}) => (
  <HashRouter useTransitions={false}>
    <CollectionShell {...shell}>
      {(sourceText) => (
        <div className="oc-playground">
          <AppShell
            logo={logo}
            hidePlayground={hidePlayground}
            hideThemeSwitcher={shell.hideThemeSwitcher}
            gitCollectionUrl={gitCollectionUrl}
            collectionSourceText={sourceText}
          />
        </div>
      )}
    </CollectionShell>
  </HashRouter>
);

export default OpenCollection;
