import React, { useMemo } from 'react';
import { PropertyTable, type PropertyRow } from '../../PropertyTable/PropertyTable';
import { SubHeading } from '../../SubHeading/SubHeading';
import { preVarRows, postVarRows } from '../../PropertyTable/inheritedRows';
import type {
  PreRequestVarRow,
  PostResponseVarRow,
  InheritedPreRequestVarRow,
  InheritedPostResponseVarRow
} from '../../../utils/request';
import { StyledWrapper } from './StyledWrapper';

interface VariablesPanelProps {
  preVars: PreRequestVarRow[];
  postVars: PostResponseVarRow[];
  inheritedPreVars?: InheritedPreRequestVarRow[];
  inheritedPostVars?: InheritedPostResponseVarRow[];
  onNavigate?: (uuid: string) => void;
  variant?: 'grid' | 'stacked';
}

const Field: React.FC<{ label: string; rows: PropertyRow[]; onNavigate?: (uuid: string) => void }> = ({
  label,
  rows,
  onNavigate
}) => (
  <div className="vars-field">
    <SubHeading as="h4" className="vars-field-label">{label}</SubHeading>
    <PropertyTable rows={rows} emptyMessage="None." className="vars-table" onNavigate={onNavigate} />
  </div>
);

export const VariablesPanel: React.FC<VariablesPanelProps> = ({
  preVars,
  postVars,
  inheritedPreVars = [],
  inheritedPostVars = [],
  onNavigate,
  variant = 'grid'
}) => {
  const preTableRows = useMemo(() => preVarRows(preVars, inheritedPreVars), [preVars, inheritedPreVars]);
  const postTableRows = useMemo(() => postVarRows(postVars, inheritedPostVars), [postVars, inheritedPostVars]);

  if (preTableRows.length === 0 && postTableRows.length === 0) return null;

  const stacked = variant === 'stacked';
  const showPre = !stacked || preTableRows.length > 0;
  const showPost = !stacked || postTableRows.length > 0;

  return (
    <StyledWrapper className={stacked ? 'vars-grid vars-stacked' : 'vars-grid'}>
      {showPre && <Field label="Pre-Request" rows={preTableRows} onNavigate={onNavigate} />}
      {showPost && <Field label="Post-Response" rows={postTableRows} onNavigate={onNavigate} />}
    </StyledWrapper>
  );
};

export default VariablesPanel;
