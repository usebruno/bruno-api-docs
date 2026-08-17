import React, { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type { GraphQLRequest } from '@opencollection/types/requests/graphql';
import {
  getGraphqlMethod,
  getGraphqlQuery,
  getGraphqlVariables
} from '@/utils/schemaHelpers';
import { buildGraphqlSnippetBody } from '@/utils/graphql';
import { Section } from '@/components/Section/Section';
import { Code } from '@/components/Code/Code';
import { useRequestPageData } from '@/hooks/useRequestPageData';
import { RequestPageLayout, NAV_GROUP, NAV_LEVEL } from '@/components/RequestPageLayout/RequestPageLayout';

interface GraphqlRequestProps {
  item: GraphQLRequest;
  ancestry?: Item[];
  collection?: OpenCollection | null;
  onBreadcrumbClick?: (uuid: string) => void;
  testId?: string;
}

export const GraphqlRequest: React.FC<GraphqlRequestProps> = ({
  item,
  ancestry = [],
  collection,
  onBreadcrumbClick,
  testId = 'graphql-request-page'
}) => {
  const data = useRequestPageData(collection, ancestry, item);
  const method = getGraphqlMethod(item);
  const query = getGraphqlQuery(item);
  const variables = getGraphqlVariables(item);
  const hasQuery = query.trim().length > 0;
  const hasVariables = variables.trim().length > 0;

  const snippetBody = useMemo(() => buildGraphqlSnippetBody(query, variables), [query, variables]);

  return (
    <RequestPageLayout
      data={data}
      method={method}
      requestLabel="GQL"
      hasConfigContent={hasQuery || hasVariables}
      emptyConfigSubheading="This request has no query, variables, headers, or authentication configured. These may be inherited from the collection or folder."
      snippetBody={snippetBody}
      onBreadcrumbClick={onBreadcrumbClick}
      testId={testId}
    >
      {hasQuery && (
        <Section label="Query" testId="request-section-query" navGroup={NAV_GROUP.configuration} navLevel={NAV_LEVEL.configItem} labelClassName="section-label-lower">
          <Code code={query} language="graphql" showLineNumbers variableAware testId="request-graphql-query" />
        </Section>
      )}
      {hasVariables && (
        <Section label="Variables" testId="request-section-variables" navGroup={NAV_GROUP.configuration} navLevel={NAV_LEVEL.configItem} labelClassName="section-label-lower">
          <Code code={variables} language="json" showLineNumbers variableAware testId="request-graphql-variables" />
        </Section>
      )}
    </RequestPageLayout>
  );
};

export default GraphqlRequest;
