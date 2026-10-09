import React, { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type { WebSocketRequest } from '@opencollection/types/requests/websocket';
import type { Auth } from '@opencollection/types/common/auth';
import {
  getItemName,
  getRequestUrl,
  getItemDocs,
  getItemDescription,
  getRequestAuth,
  getRequestHeaders,
  getWebSocketMessages,
  getItemTags,
  getInheritedTags
} from '@/utils/schemaHelpers';
import {
  resolveInheritedAuth,
  collectInheritedConfig,
  enabledHeaderKeys,
  headerRows,
  inheritedCountLabel
} from '@/utils/request';
import { inheritedHeaderRows } from '@/components/PropertyTable/inheritedRows';
import { useMarkdownRenderer } from '@/hooks';
import { buildBreadcrumbSegments } from '@/utils/common';
import { AUTH_MODE_LABELS, PROTOCOL_BADGE_LABELS } from '@/constants';
import { Section } from '@/components/Section/Section';
import { ContentTypeBadge } from '@/components/ContentTypeBadge/ContentTypeBadge';
import { InheritedAuthBadge } from '@/components/InheritedAuthBadge/InheritedAuthBadge';
import { AuthDetails } from '@/components/AuthDetails/AuthDetails';
import { PropertyTable } from '@/components/PropertyTable/PropertyTable';
import { Tags } from '@/components/Tags/Tags';
import { PageWrapper } from '@/components/PageWrapper/PageWrapper';
import { Heading } from '@/components/Heading/Heading';
import { ViewMore } from '@/components/ViewMore/ViewMore';
import { Breadcrumb, type BreadcrumbSegment } from '@/ui/Breadcrumb/Breadcrumb';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { RequestUrlBar } from '@/components/Request/RequestUrlBar/RequestUrlBar';
import { MarkdownContent } from '@/components/MarkdownContent/MarkdownContent';
import { FileIcon } from '@/assets/icons';
import { WebsocketMessages } from './WebsocketMessages/WebsocketMessages';
import { StyledWrapper } from './StyledWrapper';

const NO_ANCESTRY: Item[] = [];
const NO_OWN_VARS = new Set<string>();

const NAV_GROUP = { configuration: 'Configuration' } as const;
const NAV_LEVEL = { section: 1, configItem: 2 } as const;

interface WebsocketRequestProps {
  item: WebSocketRequest;
  collection?: OpenCollection | null;
  ancestry?: Item[];
  onBreadcrumbClick?: (uuid: string) => void;
  testId?: string;
}

export const WebsocketRequest: React.FC<WebsocketRequestProps> = ({
  item,
  ancestry = NO_ANCESTRY,
  collection,
  onBreadcrumbClick,
  testId = 'websocket-request-page'
}) => {
  const name = getItemName(item) || 'Untitled Request';
  const url = getRequestUrl(item);
  const tags = useMemo(() => getItemTags(item), [item]);
  const inheritedTags = useMemo(() => getInheritedTags(ancestry, tags), [ancestry, tags]);
  const messages = useMemo(() => getWebSocketMessages(item), [item]);

  const headers = getRequestHeaders(item);
  const inheritedHeaders = useMemo(
    () =>
      collectInheritedConfig(collection, ancestry, {
        headers: enabledHeaderKeys(headers),
        preVars: NO_OWN_VARS,
        postVars: NO_OWN_VARS
      }).headers,
    [collection, ancestry, headers]
  );
  const headerTableRows = useMemo(
    () => [...headerRows(headers), ...inheritedHeaderRows(inheritedHeaders)],
    [headers, inheritedHeaders]
  );
  const hasHeaders = headerTableRows.length > 0;

  const ownAuth = getRequestAuth(item) as Auth | undefined;
  const resolvedAuth = useMemo(() => resolveInheritedAuth(collection, ancestry, item), [collection, ancestry, item]);
  const effectiveAuth = ownAuth === 'inherit' ? resolvedAuth.auth : ownAuth;
  const showAuth = ownAuth !== undefined;
  const authBadge
    = ownAuth === 'inherit' ? (
      resolvedAuth.source ? (
        <InheritedAuthBadge
          source={resolvedAuth.source}
          onNavigate={onBreadcrumbClick}
          testId="websocket-request-auth-inherited"
        />
      ) : (
        <ContentTypeBadge label="Inherited" />
      )
    ) : undefined;

  const hasMessages = messages.length > 0;
  const hasLeftColumn = hasHeaders || showAuth;
  const hasRightColumn = tags.length > 0 || inheritedTags.length > 0;
  const hasConfig = hasMessages || hasLeftColumn;

  const md = useMarkdownRenderer();

  const descHtml = useMemo(() => {
    const content = getItemDocs(item) || getItemDescription(item);
    return content ? md.render(content) : '';
  }, [item, md]);

  const segments = useMemo<BreadcrumbSegment[]>(
    () => buildBreadcrumbSegments(collection, ancestry),
    [collection, ancestry]
  );

  const configEmptyState = (
    <EmptyState
      className="websocket-request-empty"
      testId="websocket-request-config-empty"
      icon={<FileIcon />}
      heading="No request configuration"
      subheading="This request has no messages, headers, or authentication configured."
    />
  );

  return (
    <PageWrapper>
      <StyledWrapper className="websocket-request" data-testid={testId}>
        <Breadcrumb
          segments={segments}
          current={name}
          onSegmentClick={onBreadcrumbClick}
          testId="websocket-request-breadcrumb"
        />

        <Heading size="md" className="websocket-request-title" testId="websocket-request-title">{name}</Heading>

        <div className="websocket-request-url-sticky" data-testid="websocket-request-url-sticky">
          <RequestUrlBar method={PROTOCOL_BADGE_LABELS.WEBSOCKET} url={url} />
        </div>

        {descHtml && (
          <ViewMore className="websocket-request-description" collapsedHeight="4.5rem" testId="websocket-request-description">
            <MarkdownContent
              className="markdown-documentation"
              navHeadings
              navLevel={NAV_LEVEL.section}
              html={descHtml}
            />
          </ViewMore>
        )}

        {hasMessages && (
          <Section
            label="Messages"
            testId="websocket-request-section-messages"
            className="websocket-request-messages"
            navGroup={NAV_GROUP.configuration}
            navLevel={NAV_LEVEL.configItem}
            badge={<ContentTypeBadge label={`${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`} />}
          >
            <WebsocketMessages messages={messages} testId="websocket-request-messages" />
          </Section>
        )}

        {hasLeftColumn || hasRightColumn ? (
          <div className="websocket-request-columns">
            <div className="websocket-request-col-left">
              {!hasConfig && configEmptyState}

              {hasHeaders && (
                <Section
                  label="Headers"
                  testId="websocket-request-section-headers"
                  navGroup={NAV_GROUP.configuration}
                  navLevel={NAV_LEVEL.configItem}
                  badge={
                    inheritedHeaders.length > 0 ? (
                      <ContentTypeBadge label={inheritedCountLabel(inheritedHeaders.length, 'header')} />
                    ) : null
                  }
                >
                  <PropertyTable
                    rows={headerTableRows}
                    onNavigate={onBreadcrumbClick}
                    testId="websocket-request-headers"
                  />
                </Section>
              )}

              {showAuth && (
                <Section
                  label="Auth"
                  testId="websocket-request-section-auth"
                  navGroup={NAV_GROUP.configuration}
                  navLevel={NAV_LEVEL.configItem}
                  badge={authBadge}
                >
                  <AuthDetails
                    auth={effectiveAuth}
                    authModeLabels={AUTH_MODE_LABELS}
                    emptyMessage="No auth"
                    testId="websocket-request-auth"
                  />
                </Section>
              )}
            </div>

            {hasRightColumn && (
              <div className="websocket-request-col-right">
                <Section
                  label="Tags"
                  testId="websocket-request-section-tags"
                  hideFromNav
                  badge={
                    inheritedTags.length > 0 ? (
                      <ContentTypeBadge label={inheritedCountLabel(inheritedTags.length, 'tag')} />
                    ) : undefined
                  }
                >
                  <Tags tags={tags} inheritedTags={inheritedTags} testId="websocket-request-tags" />
                </Section>
              </div>
            )}
          </div>
        ) : (
          !hasMessages && configEmptyState
        )}
      </StyledWrapper>
    </PageWrapper>
  );
};

export default WebsocketRequest;
