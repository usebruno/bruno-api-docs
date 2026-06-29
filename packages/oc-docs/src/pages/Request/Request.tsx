import React from 'react';
import { useNavigate } from 'react-router-dom';
import Item from '../../components/Docs/Item/Item';
import type { PageProps } from '../../routing/types';
import { OVERVIEW_SLUG } from '../../routing/navModel';

// Breadcrumb segments carry the target slug in `uuid` so onBreadcrumbClick
// navigates directly without a uuid→slug lookup.
export const Request: React.FC<PageProps> = ({ node, collection, onOpenPlayground }) => {
  const navigate = useNavigate();
  const collectionName = collection?.info?.name || 'Overview';

  const breadcrumb = [
    { name: collectionName, uuid: OVERVIEW_SLUG },
    ...node.ancestors.map((a) => ({ name: a.name, uuid: a.slug })),
  ];

  return (
    <Item
      item={node.item}
      collection={collection}
      breadcrumb={breadcrumb}
      onBreadcrumbClick={(slug: string) => navigate(`/${slug}`)}
      onTryClick={onOpenPlayground}
    />
  );
};

export default Request;
