import React, { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { GrpcRequest } from '@opencollection/types/requests/grpc';
import type { WebSocketRequest } from '@opencollection/types/requests/websocket';
import {
  getHttpMethod,
  getHttpBody,
  getRequestExamples,
  isUnsupportedRequest
} from '../../utils/schemaHelpers';
import { getBodyView } from '../../utils/request';
import { EyeOffIcon } from '../../assets/icons';
import { Section } from '../../components/Section/Section';
import { RequestBody } from '../../components/Request/RequestBody/RequestBody';
import { ContentTypeBadge } from '../../components/ContentTypeBadge/ContentTypeBadge';
import { Examples } from '../../components/Examples/Examples';
import { PageWrapper } from '../../components/PageWrapper/PageWrapper';
import { UnsupportedRequest } from '../../components/UnsupportedRequest/UnsupportedRequest';
import { useRequestPageData } from './useRequestPageData';
import { RequestPageLayout, NAV_GROUP, NAV_LEVEL } from './RequestPageLayout';

interface RequestProps {
  item: HttpRequest | WebSocketRequest | GrpcRequest;
  ancestry?: Item[];
  collection?: OpenCollection | null;
  onTryClick?: () => void;
  onBreadcrumbClick?: (uuid: string) => void;
  highlightedExampleIndex?: number;
  testId?: string;
}

type RequestContentProps = Omit<RequestProps, 'item'> & { item: HttpRequest };

const RequestContent: React.FC<RequestContentProps> = ({
  item,
  ancestry = [],
  collection,
  onTryClick,
  onBreadcrumbClick,
  highlightedExampleIndex,
  testId = 'request-page'
}) => {
  const data = useRequestPageData(collection, ancestry, item);
  const method = getHttpMethod(item);
  const body = getHttpBody(item);
  const examples = getRequestExamples(item);

  const bodyView = useMemo(() => getBodyView(body), [body]);
  const hasBody = bodyView.render !== 'none';
  const bodyContentType = hasBody ? bodyView.contentTypeLabel : undefined;

  const examplesSection = examples.length > 0 ? (
    <Section label="Examples" testId="request-section-examples" className="request-fullwidth">
      <Examples examples={examples} method={method} url={data.url} highlightedIndex={highlightedExampleIndex} />
    </Section>
  ) : undefined;

  return (
    <RequestPageLayout
      data={data}
      method={method}
      badgeLabel={method}
      hasConfigContent={hasBody}
      emptyConfigSubheading="This request has no parameters, body, headers, or authentication configured. These may be inherited from the collection or folder."
      snippetBody={body}
      afterColumns={examplesSection}
      onTryClick={onTryClick}
      onBreadcrumbClick={onBreadcrumbClick}
      testId={testId}
    >
      {hasBody && (
        <Section
          label="Body"
          testId="request-section-body"
          navGroup={NAV_GROUP.configuration}
          navLevel={NAV_LEVEL.configItem}
          labelClassName="section-label-lower"
          badge={bodyContentType ? <ContentTypeBadge label={bodyContentType} /> : null}
        >
          <RequestBody body={body} showContentType={false} />
        </Section>
      )}
    </RequestPageLayout>
  );
};

export const Request: React.FC<RequestProps> = ({
  item,
  ancestry = [],
  collection,
  onTryClick,
  onBreadcrumbClick,
  highlightedExampleIndex
}) => {
  if (isUnsupportedRequest(item)) {
    return (
      <PageWrapper>
        <UnsupportedRequest
          item={item}
          breadcrumbs={{ collection, ancestry, onBreadcrumbClick }}
          showRequestDocs
          emptyStateProps={{
            icon: <EyeOffIcon />,
            heading: 'Preview not available',
            subheadingSuffix: 'documentation isn\'t supported in this viewer.'
          }}
        />
      </PageWrapper>
    );
  }

  return (
    <RequestContent
      item={item}
      ancestry={ancestry}
      collection={collection}
      onTryClick={onTryClick}
      onBreadcrumbClick={onBreadcrumbClick}
      highlightedExampleIndex={highlightedExampleIndex}
    />
  );
};

export default Request;
