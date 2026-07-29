import React from 'react';
import type { HttpRequestParam } from '@opencollection/types/requests/http';
import { SubHeading } from '../../SubHeading/SubHeading';
import { PropertyTable, type PropertyRow } from '../../PropertyTable/PropertyTable';
import { getDescription } from '../../../utils/request';
import { cx } from '../../../utils/cx';
import { StyledWrapper } from './StyledWrapper';

const toRows = (params: HttpRequestParam[]): PropertyRow[] =>
  params.map((param) => ({
    label: param.name,
    value: param.value,
    disabled: param.disabled,
    description: getDescription(param)
  }));

interface RequestParamsProps {
  path?: HttpRequestParam[];
  query?: HttpRequestParam[];
  className?: string;
  hideRowBorders?: boolean;
}

export const RequestParams: React.FC<RequestParamsProps> = ({ path = [], query = [], className, hideRowBorders = false }) => {
  if (path.length === 0 && query.length === 0) return null;

  const headingClass = cx('request-params-heading', { 'request-params-heading--inset': hideRowBorders });

  return (
    <StyledWrapper className={cx('request-params', className)}>
      {path.length > 0 && (
        <div className="request-params-group">
          <SubHeading className={headingClass}>Path</SubHeading>
          <PropertyTable rows={toRows(path)} hideRowBorders={hideRowBorders} />
        </div>
      )}
      {query.length > 0 && (
        <div className="request-params-group">
          <SubHeading className={headingClass}>Query</SubHeading>
          <PropertyTable rows={toRows(query)} hideRowBorders={hideRowBorders} />
        </div>
      )}
    </StyledWrapper>
  );
};

export default RequestParams;
