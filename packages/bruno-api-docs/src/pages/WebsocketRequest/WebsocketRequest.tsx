import React, { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type { WebSocketRequest } from '@opencollection/types/requests/websocket';
import { getWebSocketMessages } from '@/utils/schemaHelpers';
import { PROTOCOL_BADGE_LABELS } from '@/constants';
import { Section } from '@/components/Section/Section';
import { ContentTypeBadge } from '@/components/ContentTypeBadge/ContentTypeBadge';
import { useRequestPageData } from '@/hooks/useRequestPageData';
import { RequestPageLayout, NAV_GROUP, NAV_LEVEL } from '@/components/RequestPageLayout/RequestPageLayout';
import { WebsocketMessages } from './WebsocketMessages/WebsocketMessages';

const NO_ANCESTRY: Item[] = [];

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
  const data = useRequestPageData(collection, ancestry, item);
  const messages = useMemo(() => getWebSocketMessages(item), [item]);
  const hasMessages = messages.length > 0;

  const messagesSection = hasMessages ? (
    <Section
      label="Messages"
      testId="request-section-messages"
      navGroup={NAV_GROUP.configuration}
      navLevel={NAV_LEVEL.configItem}
      labelClassName="section-label-lower"
      badge={<ContentTypeBadge label={`${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`} />}
    >
      <WebsocketMessages messages={messages} testId="websocket-request-messages" />
    </Section>
  ) : null;

  return (
    <RequestPageLayout
      data={data}
      method={PROTOCOL_BADGE_LABELS.WEBSOCKET}
      hasConfigContent={false}
      emptyConfigSubheading="This request has no messages, headers, or authentication configured."
      showCodeSnippet={false}
      showExecutionContext={false}
      beforeColumns={messagesSection}
      onBreadcrumbClick={onBreadcrumbClick}
      testId={testId}
    />
  );
};

export default WebsocketRequest;
