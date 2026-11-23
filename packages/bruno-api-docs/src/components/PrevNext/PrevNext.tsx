import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { PageType, SeqNeighbor } from '@usebruno/api-shared/routing/types';
import { getMethodColorVar } from '@usebruno/api-shared/theme/methodColors';
import { getShortMethod } from '@usebruno/api-shared/utils/request';
import { ChevronLeftIcon, ChevronRightIcon } from '@usebruno/api-shared/assets/icons';
import { StyledWrapper } from './StyledWrapper';

const toPath = (slug: string) => `/${slug}`;

const MethodTag: React.FC<{ method?: string; type: PageType }> = ({ method, type }) =>
  method ? (
    <span className="prevnext-method" style={{ color: getMethodColorVar(method) }}>
      {getShortMethod(method)}
    </span>
  ) : type === 'script' ? (
    <span className="prevnext-method" style={{ color: 'var(--oc-primary-text)' }}>JS</span>
  ) : null;

const Card: React.FC<{ dir: 'prev' | 'next'; neighbor: SeqNeighbor; search: string }> = ({ dir, neighbor, search }) => (
  <Link
    to={{ pathname: toPath(neighbor.slug), search }}
    className={`prevnext-card prevnext-card--${dir}`}
    data-testid={`${dir}-link`}
  >
    {dir === 'prev' && (
      <span className="prevnext-chevron" aria-hidden>
        <ChevronLeftIcon />
      </span>
    )}
    <span className="prevnext-textcol">
      <span className="prevnext-label">{dir === 'prev' ? 'Previous' : 'Next'}</span>
      <span className="prevnext-name">
        <MethodTag method={neighbor.method} type={neighbor.type} />
        <span className="prevnext-name-text">{neighbor.name}</span>
      </span>
    </span>
    {dir === 'next' && (
      <span className="prevnext-chevron" aria-hidden>
        <ChevronRightIcon />
      </span>
    )}
  </Link>
);

export interface PrevNextProps {
  prev?: SeqNeighbor;
  next?: SeqNeighbor;
}

const PrevNext: React.FC<PrevNextProps> = ({ prev, next }) => {
  const { search } = useLocation();
  if (!prev && !next) return null;
  return (
    <StyledWrapper className="prevnext" aria-label="Pagination" data-testid="prevnext">
      <div className="prevnext-half">{prev && <Card dir="prev" neighbor={prev} search={search} />}</div>
      <div className="prevnext-half prevnext-half--next">
        {next && <Card dir="next" neighbor={next} search={search} />}
      </div>
    </StyledWrapper>
  );
};

export default PrevNext;
