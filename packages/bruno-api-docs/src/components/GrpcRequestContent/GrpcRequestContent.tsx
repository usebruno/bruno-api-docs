import React, { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type { GrpcRequest } from '@opencollection/types/requests/grpc';
import type { Auth } from '@opencollection/types/common/auth';
import {
  getItemName,
  getRequestUrl,
  getItemDocs,
  getRequestAuth,
  getGrpcMethod,
  getGrpcMethodType,
  getGrpcMetadata,
  getGrpcMessages,
  getGrpcProtoFileName,
  getGrpcProtoFilePath,
  countEnabled
} from '../../utils/schemaHelpers';
import { resolveInheritedAuth } from '../../utils/request';
import { generateGrpcurlCommand, generateGrpcJavaScriptCode } from '../../utils/grpcSnippets';
import { SnippetTabs, type Snippet } from '../SnippetTabs/SnippetTabs';
import { useMarkdownRenderer } from '../../hooks';
import { buildBreadcrumbSegments } from '../../utils/common';
import { AUTH_MODE_LABELS, GRPC_METHOD_TYPE_LABELS } from '../../constants';
import { Section } from '../Section/Section';
import { ContentTypeBadge } from '../ContentTypeBadge/ContentTypeBadge';
import { InheritedAuthBadge } from '../InheritedAuthBadge/InheritedAuthBadge';
import { AuthDetails } from '../AuthDetails/AuthDetails';
import { GrpcMethodTypeIcon } from './GrpcMethodTypeIcon/GrpcMethodTypeIcon';
import { GrpcMessages } from './GrpcMessages/GrpcMessages';
import { GrpcMetadataTable } from './GrpcMetadataTable/GrpcMetadataTable';
import { PageWrapper } from '../PageWrapper/PageWrapper';
import { Heading } from '../Heading/Heading';
import { ViewMore } from '../ViewMore/ViewMore';
import { Breadcrumb, type BreadcrumbSegment } from '../../ui/Breadcrumb/Breadcrumb';
import { EmptyState } from '../../ui/EmptyState/EmptyState';
import { RequestUrlBar } from '../Request/RequestUrlBar/RequestUrlBar';
import { StyledWrapper } from './StyledWrapper';
import { FileIcon } from '../../assets/icons';

interface GrpcRequestContentProps {
  item: GrpcRequest;
  collection?: OpenCollection | null;
  ancestry?: Item[];
  onBreadcrumbClick?: (uuid: string) => void;
  testId?: string;
}

export const GrpcRequestContent: React.FC<GrpcRequestContentProps> = ({
  item,
  ancestry = [],
  collection,
  onBreadcrumbClick,
  testId = 'grpc-request-page'
}) => {
  const name = getItemName(item) || 'Untitled Request';
  const url = getRequestUrl(item);

  const method = getGrpcMethod(item);
  const methodType = getGrpcMethodType(item);
  const protoFileName = getGrpcProtoFileName(item);
  const protoFilePath = getGrpcProtoFilePath(item);
  const methodTypeLabel = methodType ? GRPC_METHOD_TYPE_LABELS[methodType] : undefined;
  const messages = getGrpcMessages(item);
  const metadata = getGrpcMetadata(item);
  const enabledMetadataCount = countEnabled(metadata);

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
          testId="grpc-request-auth-inherited"
        />
      ) : (
        <ContentTypeBadge label="Inherited" />
      )
    ) : undefined;

  const hasLeftColumn
    = Boolean(protoFileName) || Boolean(method) || messages.length > 0 || metadata.length > 0 || showAuth;

  const snippets = useMemo<Snippet[]>(() => {
    if (!method) return [];
    const input = { url, method, methodType, protoFilePath, metadata, messages };
    const built: Snippet[] = [
      { id: 'grpcurl', label: 'grpcURL', language: 'bash', code: generateGrpcurlCommand(input) }
    ];

    const javaScript = generateGrpcJavaScriptCode(input);
    if (javaScript) {
      built.push({ id: 'javascript', label: 'JavaScript', language: 'javascript', code: javaScript });
    }

    return built;
  }, [url, method, methodType, protoFilePath, metadata, messages]);

  const md = useMarkdownRenderer();

  const descHtml = useMemo(() => {
    const docs = getItemDocs(item);
    return docs ? md.render(docs) : '';
  }, [item, md]);

  const segments = useMemo<BreadcrumbSegment[]>(
    () => buildBreadcrumbSegments(collection, ancestry),
    [collection, ancestry]
  );

  return (
    <PageWrapper>
      <StyledWrapper className="grpc-request" data-testid={testId}>
        <Breadcrumb
          segments={segments}
          current={name}
          onSegmentClick={onBreadcrumbClick}
          testId="grpc-request-breadcrumb"
        />

        <Heading size="md" style={{ marginTop: '0.25rem' }} testId="grpc-request-title">{name}</Heading>

        <RequestUrlBar method="gRPC" url={url} style={{ marginTop: '0.75rem' }} />
        {descHtml && (
          <ViewMore collapsedHeight="4.5rem" style={{ marginTop: '1.5rem' }} testId="grpc-request-description">
            <div className="markdown-documentation" dangerouslySetInnerHTML={{ __html: descHtml }} />
          </ViewMore>
        )}

        {hasLeftColumn ? (
          <div className="grpc-request-columns">
            <div className="grpc-request-col-left">
              {protoFileName && (
                <Section label="Proto file" testId="grpc-request-section-proto-file">
                  <div className="grpc-field" data-testid="grpc-request-proto-file">
                    <span className="grpc-field-icon">
                      <FileIcon />
                    </span>
                    <span className="grpc-field-text">{protoFileName}</span>
                  </div>
                </Section>
              )}

              {method && (
                <Section label="RPC method" testId="grpc-request-section-method">
                  <div className="grpc-field" data-testid="grpc-request-method">
                    <GrpcMethodTypeIcon methodType={methodType} className="grpc-field-icon" />
                    <span className="grpc-field-text">{method.replace(/^\//, '')}</span>
                    {methodTypeLabel && <span className="grpc-field-meta">{methodTypeLabel}</span>}
                  </div>
                </Section>
              )}

              {messages.length > 0 && (
                <Section
                  label="Messages"
                  testId="grpc-request-section-messages"
                  badge={
                    <ContentTypeBadge label={`${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`} />
                  }
                >
                  <GrpcMessages messages={messages} />
                </Section>
              )}

              {metadata.length > 0 && (
                <Section
                  label="Metadata"
                  testId="grpc-request-section-metadata"
                  badge={
                    enabledMetadataCount ? (
                      <ContentTypeBadge
                        label={`${enabledMetadataCount} ${enabledMetadataCount === 1 ? 'field' : 'fields'}`}
                      />
                    ) : undefined
                  }
                >
                  <GrpcMetadataTable metadata={metadata} testId="grpc-request-metadata" />
                </Section>
              )}

              {showAuth && (
                <Section
                  label="Auth"
                  testId="grpc-request-section-auth"
                  badge={authBadge}
                >
                  <AuthDetails
                    auth={effectiveAuth}
                    authModeLabels={AUTH_MODE_LABELS}
                    emptyMessage="No auth"
                    testId="grpc-request-auth"
                  />
                </Section>
              )}
            </div>

            {snippets.length > 0 && (
              <div className="grpc-request-col-right">
                <Section label="Code snippet" testId="grpc-request-section-code-snippet">
                  <SnippetTabs snippets={snippets} testId="grpc-request-code-snippet" />
                </Section>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            className="grpc-request-empty"
            testId="grpc-request-config-empty"
            icon={<FileIcon />}
            heading="No request configuration"
            subheading="This request has no method, messages, metadata, or authentication configured."
          />
        )}
      </StyledWrapper>
    </PageWrapper>
  );
};

export default GrpcRequestContent;
