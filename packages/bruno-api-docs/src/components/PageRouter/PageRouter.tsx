import React, { useMemo, useRef } from 'react';
import type { ScriptFile, Folder as FolderItem, Item } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import { Navigate } from 'react-router-dom';
import { ItemVariableResolverProvider, useDocsNavigate } from '@/hooks';
import Environments from '@/pages/Environments/Environments';
import Folder from '@/pages/Folder/Folder';
import { Overview } from '@/pages/Overview/Overview';
import Request from '@/pages/Request/Request';
import Script from '@/pages/Script/Script';
import { useActiveResolution, useNavModel } from '@/routing/hooks';
import type { PageProps, PageType } from '@/routing/types';
import { useAppSelector } from '@/store/hooks';
import { getAncestorsByUuid } from '@/utils/fileUtils';
import { getItemUuid } from '@/utils/itemUtils';
import { selectDocsCollection } from '@slices/docs';
import { StyledWrapper } from './StyledWrapper';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { PageWrapper } from '../PageWrapper/PageWrapper';
import PoweredByFooter from '../PoweredByFooter/PoweredByFooter';
import PrevNext from '../PrevNext/PrevNext';
import SectionNav from '../SectionNav/SectionNav';

interface PageRouterProps {
  onOpenPlayground?: () => void;
  testId?: string;
}

const PAGES_WITHOUT_SECTION_NAV = new Set<PageType>(['environments']);

const PageRouter: React.FC<PageRouterProps> = ({ onOpenPlayground, testId = 'page' }) => {
  const resolution = useActiveResolution();
  const model = useNavModel();
  const collection = useAppSelector(selectDocsCollection);
  const docsNavigate = useDocsNavigate();
  const pageBodyRef = useRef<HTMLDivElement>(null);

  // Map each item's runtime uuid -> its stable slug so breadcrumb clicks
  // navigate by URL (the same mapping the sidebar uses).
  const uuidToSlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of model.ordered) {
      const uuid = getItemUuid(entry.item);
      if (uuid) map.set(uuid, entry.slug);
    }
    return map;
  }, [model]);

  const item = resolution?.entry?.item ?? null;
  const ancestry = useMemo(
    () => (item && collection ? getAncestorsByUuid(collection, getItemUuid(item) ?? '') : []),
    [collection, item]
  );

  if (!resolution) return <Navigate to="/" replace />;
  if (!collection) return null;

  const { entry, prev, next } = resolution;
  const pageProps: PageProps = { node: entry, prev, next, collection, onOpenPlayground };

  const showSectionNav = !PAGES_WITHOUT_SECTION_NAV.has(entry.type);
  const sectionNavTitle = entry.name;

  const goToUuid = (uuid: string) => {
    const slug = uuidToSlug.get(uuid);
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
          <ItemVariableResolverProvider collection={collection} ancestry={ancestry} item={item as Item}>
            <Folder item={item as FolderItem} ancestry={ancestry} collection={collection} onBreadcrumbClick={goToUuid} />
          </ItemVariableResolverProvider>
        ) : (
          <Overview collection={collection} />
        );
      case 'script':
        return item ? (
          <Script item={item as ScriptFile} ancestry={ancestry} collection={collection} onBreadcrumbClick={goToUuid} />
        ) : null;
      case 'request':
      default:
        return item ? (
          <ItemVariableResolverProvider collection={collection} ancestry={ancestry} item={item as Item}>
            <Request
              item={item as HttpRequest}
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
