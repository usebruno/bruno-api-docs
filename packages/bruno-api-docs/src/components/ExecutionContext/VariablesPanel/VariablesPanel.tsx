import React from 'react';
import { PropertyTable, type PropertyRow } from '../../PropertyTable/PropertyTable';
import { SubHeading } from '../../SubHeading/SubHeading';
import { preVarRows, postVarRows } from '../../../utils/inheritedRows';
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

const Field: React.FC<{ label: string; rows: PropertyRow[] }> = ({ label, rows }) => (
  <div className="vars-field">
    <SubHeading as="h4" className="vars-field-label">{label}</SubHeading>
    <PropertyTable rows={rows} emptyMessage="None." className="vars-table" />
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
  const preTableRows = preVarRows(preVars, inheritedPreVars, onNavigate);
  const postTableRows = postVarRows(postVars, inheritedPostVars, onNavigate);

  if (preTableRows.length === 0 && postTableRows.length === 0) return null;

  const stacked = variant === 'stacked';
  const showPre = !stacked || preTableRows.length > 0;
  const showPost = !stacked || postTableRows.length > 0;

  return (
    <StyledWrapper className={stacked ? 'vars-grid vars-stacked' : 'vars-grid'}>
      {showPre && <Field label="Pre-Request" rows={preTableRows} />}
      {showPost && <Field label="Post-Response" rows={postTableRows} />}
    </StyledWrapper>
  );
};

export default VariablesPanel;
