import type { PropertyRow } from './PropertyTable';
import type {
  PreRequestVarRow,
  PostResponseVarRow,
  InheritedHeaderRow,
  InheritedPreRequestVarRow,
  InheritedPostResponseVarRow
} from '../../utils/request';

// Plain-data row builders (no React dependency): each inherited row carries its `inheritedSource`,
// and PropertyTable renders the "go to source" link from it. Shared by the request page, the folder
// config and the Execution Context variables panel.

/** Inherited header rows for a PropertyTable, each tagged with the source it is inherited from. */
export const inheritedHeaderRows = (headers: InheritedHeaderRow[]): PropertyRow[] =>
  headers.map((header) => ({
    label: header.name,
    value: header.value,
    disabled: header.disabled,
    description: header.description,
    inheritedSource: header.source
  }));

/** Pre-request variable rows: the item's own vars first, then inherited ones (each tagged). */
export const preVarRows = (
  own: PreRequestVarRow[],
  inherited: InheritedPreRequestVarRow[] = []
): PropertyRow[] => [
  ...own.map((v) => ({ label: v.name, value: v.value, type: v.type, description: v.description, disabled: v.disabled })),
  ...inherited.map((v) => ({
    label: v.name,
    value: v.value,
    type: v.type,
    description: v.description,
    disabled: v.disabled,
    inheritedSource: v.source
  }))
];

/** Post-response variable rows: own first, then inherited ones (each tagged). */
export const postVarRows = (
  own: PostResponseVarRow[],
  inherited: InheritedPostResponseVarRow[] = []
): PropertyRow[] => [
  ...own.map((v) => ({ label: v.name, value: v.expression, description: v.description, disabled: v.disabled })),
  ...inherited.map((v) => ({
    label: v.name,
    value: v.expression,
    description: v.description,
    disabled: v.disabled,
    inheritedSource: v.source
  }))
];
