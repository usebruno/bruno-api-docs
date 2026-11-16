import React, { useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import type { GraphQLRequest } from '@opencollection/types/requests/graphql';
import type { ScriptFile, Folder as FolderItem } from '@opencollection/types/collection/item';
import type { RequestItem } from '@usebruno/api-shared/utils/schemaHelpers';
import { useActiveResolution } from '@/routing/hooks';
import { useDocument, useNavModel } from '@usebruno/api-shared/document/document';
import { getItemUuid } from '@usebruno/api-shared/utils/itemUtils';
import { getAncestorsByUuid } from '@usebruno/api-shared/utils/fileUtils';
import { ItemVariableResolverProvider } from '@usebruno/api-shared/hooks';
import PrevNext from '../PrevNext/PrevNext';
import SectionNav from '../SectionNav/SectionNav';
import PoweredByFooter from '../PoweredByFooter/PoweredByFooter';
import { PageWrapper } from '../PageWrapper/PageWrapper';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { StyledWrapper } from './StyledWrapper';
import { Overview } from '@/pages/Overview/Overview';
import Request from '@/pages/Request/Request';
import GraphqlRequest from '@/pages/GraphqlRequest/GraphqlRequest';
import Script from '@/pages/Script/Script';
import Folder from '@/pages/Folder/Folder';
import Environments from '@/pages/Environments/Environments';
import type { PageProps, PageType } from '@usebruno/api-shared/routing/types';
import { useDocsNavigate } from '@/hooks/useDocsNavigate';

interface PageRouterProps {
  onOpenPlayground?: () => void;
  testId?: string;
}

const PAGES_WITHOUT_SECTION_NAV = new Set<PageType>(['environments']);

const PageRouter: React.FC<PageRouterProps> = ({ onOpenPlayground, testId = 'page' }) => {
  const resolution = useActiveResolution();
  const model = useNavModel();
  const collection = useDocument();
  const docsNavigate = useDocsNavigate();
  const pageBodyRef = useRef<HTMLDivElement>(null);

  const item = resolution?.entry?.item ?? null;
  const itemUuid = getItemUuid(item) ?? '';
  const ancestry = useMemo(() => getAncestorsByUuid(collection, itemUuid), [collection, itemUuid]);

  if (!resolution) return <Navigate to="/" replace />;

  const { entry, prev, next } = resolution;
  const pageProps: PageProps = { node: entry, prev, next, collection, onOpenPlayground };

  const showSectionNav = !PAGES_WITHOUT_SECTION_NAV.has(entry.type);
  const sectionNavTitle = entry.name;

  const goToUuid = (uuid: string) => {
    const slug = model.slugByUuid.get(uuid);
    // A known item navigates to its slug; the leading collection crumb (and any
    // unknown uuid) falls back to the overview.
    docsNavigate(slug ?? '');
  };

  const renderBody = () => {
    switch (entry.type) {
      case 'overview':
        return <Overview collection={collection} />;
      case 'environments':
        return <Environments {...pageProps} />;
      case 'folder':
        return item ? (
          <ItemVariableResolverProvider collection={collection} ancestry={ancestry} item={item}>
            <Folder item={item as FolderItem} ancestry={ancestry} collection={collection} onBreadcrumbClick={goToUuid} />
          </ItemVariableResolverProvider>
        ) : (
          <Overview collection={collection} />
        );
      case 'script':
        return item ? (
          <Script item={item as ScriptFile} ancestry={ancestry} collection={collection} onBreadcrumbClick={goToUuid} />
        ) : null;
      case 'graphql':
        return item ? (
          <ItemVariableResolverProvider collection={collection} ancestry={ancestry} item={item}>
            <GraphqlRequest
              item={item as GraphQLRequest}
              ancestry={ancestry}
              collection={collection}
              onBreadcrumbClick={goToUuid}
            />
          </ItemVariableResolverProvider>
        ) : null;
      case 'request':
      default:
        return item ? (
          <ItemVariableResolverProvider collection={collection} ancestry={ancestry} item={item}>
            <Request
              item={item as RequestItem}
              ancestry={ancestry}
              collection={collection}
              onTryClick={onOpenPlayground}
              onBreadcrumbClick={goToUuid}
              highlightedExampleIndex={resolution.example?.index}
            />
          </ItemVariableResolverProvider>
        ) : null;
    }
  };

  return (
    <StyledWrapper data-testid={testId} data-page-type={entry.type} data-page-slug={entry.slug}>
      <div className="page-fill">
        <div className="page-body" ref={pageBodyRef}>
          <ErrorBoundary key={entry.slug}>{renderBody()}</ErrorBoundary>
        </div>
        <div className="page-footer">
          <PageWrapper>
            <PrevNext prev={prev} next={next} />
          </PageWrapper>
        </div>
      </div>
      <PoweredByFooter />
      {/* The rail manages its own layering and narrow-column visibility — see SectionNav. */}
      {showSectionNav && (
        <SectionNav rootRef={pageBodyRef} title={sectionNavTitle} navKey={entry.slug} />
      )}
    </StyledWrapper>
  );
};

export default PageRouter;
