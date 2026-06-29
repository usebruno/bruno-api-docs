import React from 'react';
import { Navigate } from 'react-router-dom';
import { useActiveResolution } from '../../routing/hooks';
import { useAppSelector } from '../../store/hooks';
import { selectDocsCollection } from '../../store/slices/docs';
import PrevNext from '../PrevNext/PrevNext';
import { PageWrapper } from '../PageWrapper/PageWrapper';
import { StyledWrapper } from './StyledWrapper';
import { Overview } from '../../pages/Overview/Overview';
import Request from '../../pages/Request/Request';
import Environments from '../../pages/Environments/Environments';
import type { PageProps } from '../../routing/types';

interface PageRouterProps {
  onOpenPlayground?: () => void;
}

const PageRouter: React.FC<PageRouterProps> = ({ onOpenPlayground }) => {
  const resolution = useActiveResolution();
  const collection = useAppSelector(selectDocsCollection);

  if (!resolution) return <Navigate to="/" replace />;
  if (!collection) return null;

  const { entry, prev, next } = resolution;
  const pageProps: PageProps = { node: entry, prev, next, collection, onOpenPlayground };

  const renderBody = () => {
    switch (entry.type) {
      case 'overview':
        return <Overview collection={collection} />;
      case 'environments':
        return <Environments {...pageProps} />;
      case 'request':
      case 'folder':
      case 'script':
      default:
        return <Request {...pageProps} />;
    }
  };

  return (
    <StyledWrapper data-testid="page" data-page-type={entry.type} data-page-slug={entry.slug}>
      <div className="page-body">{renderBody()}</div>
      <div className="page-footer">
        <PageWrapper>
          <PrevNext prev={prev} next={next} />
        </PageWrapper>
      </div>
    </StyledWrapper>
  );
};

export default PageRouter;
