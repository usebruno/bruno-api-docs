import React, { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { StructuredText } from '@opencollection/types/common/description';
import { useMarkdownRenderer } from '@/hooks';
import {
  getCollectionStats,
  hasCollectionExecutionContext,
  hasCollectionRequestConfig
} from '@/utils/collectionOverview';
import { scriptsArrayToObject } from '@/utils/schemaHelpers';
import { getCollectionVariables } from '@/utils/request';
import { AUTH_MODE_LABELS } from '@/constants';
import { CollectionStats } from '../../components/CollectionStats/CollectionStats';
import { CollectionConfiguration } from '../../components/OverviewCollectionConfiguration/CollectionConfiguration';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { PageWrapper } from '../../components/PageWrapper/PageWrapper';
import { Heading } from '../../components/Heading/Heading';
import { Section } from '../../components/Section/Section';
import { ViewMore } from '../../components/ViewMore/ViewMore';
import { BookIcon, RefreshIcon } from '@/assets/icons';
import { StyledWrapper } from './StyledWrapper';

const getDocsContent = (docs: OpenCollection['docs']): string => {
  if (!docs) return '';
  return typeof docs === 'string' ? docs : (docs as StructuredText)?.content || '';
};

interface OverviewProps {
  collection: OpenCollection;
  testId?: string;
}

export const Overview: React.FC<OverviewProps> = ({ collection, testId = 'overview' }) => {
  const md = useMarkdownRenderer();

  const counts = useMemo(() => getCollectionStats(collection), [collection]);
  const stats = useMemo(
    () => [
      { label: 'Requests', value: counts.requestCount },
      { label: 'Folders', value: counts.folderCount },
      { label: 'Environments', value: counts.environmentCount }
    ],
    [counts]
  );
  const scripts = useMemo(() => scriptsArrayToObject(collection.request?.scripts), [collection.request]);
  const { preVars, postVars } = useMemo(() => getCollectionVariables(collection), [collection]);
  const version = collection.info?.version;
  const name = collection.info?.name || 'Untitled Collection';

  const docsHtml = useMemo(() => {
    const content = getDocsContent(collection.docs);
    return content ? md.render(content) : '';
  }, [collection.docs, md]);

  const hasOverview = Boolean(docsHtml);
  const hasRequestConfig = useMemo(
    () => hasCollectionRequestConfig(collection.request?.headers, collection.request?.auth),
    [collection.request]
  );
  const hasExecutionContext = useMemo(
    () => hasCollectionExecutionContext(scripts, preVars.length > 0 || postVars.length > 0),
    [scripts, preVars, postVars]
  );

  return (
    <PageWrapper>
      <StyledWrapper className="overview" data-testid={testId}>
        <header className="overview-headline">
          <div>
            {version ? (
              <div className="overview-version" data-testid="overview-collection-version">{`Version : ${version}`}</div>
            ) : null}
            <Heading testId="overview-collection-name">{name}</Heading>
          </div>
        </header>

        <div className="overview-stats-row">
          <CollectionStats stats={stats} />
        </div>

        <div className="overview-body">
          <div className="overview-col-left">
            <Section label="Overview" testId="overview-section-label">
              {hasOverview ? (
                <ViewMore testId="overview-markdown-view-more">
                  <div
                    className="overview-markdown markdown-documentation"
                    data-testid="overview-markdown-documentation"
                    data-nav-headings
                    data-nav-level={2}
                    dangerouslySetInnerHTML={{ __html: docsHtml }}
                  />
                </ViewMore>
              ) : (
                <EmptyState
                  testId="overview-empty"
                  icon={<BookIcon />}
                  heading="No overview content yet"
                  subheading="This collection has no description or readme. Add one in Bruno to introduce your API to readers: what it does, who it's for, and how to authenticate."
                />
              )}
            </Section>
          </div>

          <div className="overview-col-right">
            {(hasRequestConfig || !hasExecutionContext) && (
              <Section label="Collection Configuration" testId="overview-section-label">
                {hasRequestConfig ? (
                  <CollectionConfiguration
                    headers={collection.request?.headers}
                    auth={collection.request?.auth}
                    sectionType="request"
                    authModeLabels={AUTH_MODE_LABELS}
                  />
                ) : (
                  <EmptyState
                    testId="overview-empty"
                    icon={<BookIcon />}
                    heading="No configuration set"
                    subheading="This collection has no shared headers or auth. Configure them in Bruno and they'll appear here."
                  />
                )}
              </Section>
            )}

            <Section
              label="Execution Context"
              testId="overview-section-label"
              collapsible={hasExecutionContext}
              storageKey="collection-execution-context"
            >
              {hasExecutionContext ? (
                <CollectionConfiguration
                  scripts={scripts}
                  preVars={preVars}
                  postVars={postVars}
                  sectionType="execution"
                  authModeLabels={AUTH_MODE_LABELS}
                  testId="collection-execution-context"
                />
              ) : (
                <EmptyState
                  testId="collection-execution-context-empty"
                  icon={<RefreshIcon />}
                  heading="No execution context"
                  subheading="This collection has no shared scripts, variables, or tests."
                />
              )}
            </Section>
          </div>
        </div>
      </StyledWrapper>
    </PageWrapper>
  );
};

export default Overview;
