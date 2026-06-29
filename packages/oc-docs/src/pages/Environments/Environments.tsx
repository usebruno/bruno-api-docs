import React from 'react';
import type { PageProps } from '../../routing/types';
import { PageWrapper } from '../../components/PageWrapper/PageWrapper';
import EnvironmentsView from '../../components/PlaygroundDrawer/DrawerContent/Views/EnvironmentsView/EnvironmentsView';

export const Environments: React.FC<PageProps> = ({ collection }) => (
  <PageWrapper>
    <EnvironmentsView collection={collection} />
  </PageWrapper>
);

export default Environments;
