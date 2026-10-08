import React, { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item, Folder as FolderItem } from '@opencollection/types/collection/item';
import { useMarkdownRenderer } from '@/hooks';
import { AUTH_MODE_LABELS } from '@/constants';
import { getItemName, getItemDocs, getItemDescription, getItemTags } from '@/utils/schemaHelpers';
import { buildBreadcrumbSegments } from '@/utils/common';
import {
  getFolderConfig,
  hasFolderExecutionContext,
  hasFolderRequestConfig,
  countFolderRequests,
  requestCountLabel
} from '@/utils/folder';
import { PageWrapper } from '../../components/PageWrapper/PageWrapper';
import { Heading } from '../../components/Heading/Heading';
import { Section } from '../../components/Section/Section';
import { Breadcrumb, type BreadcrumbSegment } from '@/ui/Breadcrumb/Breadcrumb';
import { ViewMore } from '../../components/ViewMore/ViewMore';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { FolderConfiguration } from '../../components/FolderConfiguration/FolderConfiguration';
import { Tags } from '@/components/Tags/Tags';
import { FolderIcon, RefreshIcon } from '@/assets/icons';
import { StyledWrapper } from './StyledWrapper';
import { MarkdownContent } from '@/components/MarkdownContent/MarkdownContent';

interface FolderProps {
  item: FolderItem;
  ancestry?: Item[];
  collection?: OpenCollection | null;
  onBreadcrumbClick?: (uuid: string) => void;
}

export const Folder: React.FC<FolderProps> = ({ item, ancestry = [], collection, onBreadcrumbClick }) => {
  const md = useMarkdownRenderer();

  const name = getItemName(item) || 'Untitled Folder';
  const tags = getItemTags(item);
  const requestCount = useMemo(() => countFolderRequests(item), [item]);
  const config = useMemo(() => getFolderConfig(collection, ancestry, item), [collection, ancestry, item]);
  const showRequestConfig = useMemo(() => hasFolderRequestConfig(config), [config]);
  const showExecutionContext = useMemo(() => hasFolderExecutionContext(config), [config]);

  const docsHtml = useMemo(() => {
    const content = getItemDocs(item) || getItemDescription(item);
    return content ? md.render(content) : '';
  }, [item, md]);

  const segments = useMemo<BreadcrumbSegment[]>(
    () => buildBreadcrumbSegments(collection, ancestry),
    [collection, ancestry]
  );

  return (
    <PageWrapper>
      <StyledWrapper className="folder" data-testid="folder-page">
        <Breadcrumb segments={segments} current={name} onSegmentClick={onBreadcrumbClick} testId="folder-breadcrumb" />

        <header className="folder-header">
          <span className="folder-header-icon" aria-hidden="true">
            <FolderIcon />
          </span>
          <div className="folder-header-text">
            <Heading size="md" testId="folder-title">{name}</Heading>
            <span className="folder-header-count" data-testid="folder-request-count">
              {requestCountLabel(requestCount)}
            </span>
          </div>
        </header>

        {tags.length > 0 && (
          <Section label="Tags" testId="folder-section-tags" className="folder-fullwidth">
            <Tags tags={tags} testId="folder-tags" />
          </Section>
        )}

        {docsHtml && (
          <Section label="Documentation" testId="folder-section-documentation" className="folder-fullwidth" labelClassName="section-label-muted">
            <ViewMore collapsedHeight="4.5rem" testId="folder-docs">
              <MarkdownContent
                className="markdown-documentation"
                navHeadings
                navLevel={2}
                html={docsHtml}
              />
            </ViewMore>
          </Section>
        )}

        {(showRequestConfig || !showExecutionContext) && (
          <Section label="Folder Configuration" testId="folder-section-configuration" className="folder-fullwidth" labelClassName="section-label-muted">
            {showRequestConfig ? (
              <FolderConfiguration
                config={config}
                sectionType="request"
                authModeLabels={AUTH_MODE_LABELS}
                onNavigate={onBreadcrumbClick}
                testId="folder-config"
              />
            ) : (
              <EmptyState
                testId="folder-config-empty"
                icon={<FolderIcon />}
                heading="No folder configuration"
                subheading="This folder has no headers or auth set. Requests inside it inherit configuration from the collection."
              />
            )}
          </Section>
        )}

        <Section
          label="Execution Context"
          testId="folder-section-execution-context"
          className="folder-fullwidth"
          labelClassName="section-label-muted"
          collapsible={showExecutionContext}
          storageKey="folder-execution-context"
        >
          {showExecutionContext ? (
            <FolderConfiguration
              config={config}
              sectionType="execution"
              authModeLabels={AUTH_MODE_LABELS}
              onNavigate={onBreadcrumbClick}
              testId="folder-execution-context"
            />
          ) : (
            <EmptyState
              testId="folder-execution-context-empty"
              icon={<RefreshIcon />}
              heading="No execution context"
              subheading="This folder has no scripts, variables, or tests configured."
            />
          )}
        </Section>
      </StyledWrapper>
    </PageWrapper>
  );
};

export default Folder;
