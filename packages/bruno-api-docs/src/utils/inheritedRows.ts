import { createElement, type ReactNode } from 'react';
import type { PropertyRow } from '../components/PropertyTable/PropertyTable';
import { InheritedSourceLink } from '../components/InheritedSourceLink/InheritedSourceLink';
import type {
  PreRequestVarRow,
  PostResponseVarRow,
  InheritedSource,
  InheritedHeaderRow,
  InheritedPreRequestVarRow,
  InheritedPostResponseVarRow
} from './request';

type OnNavigate = ((uuid: string) => void) | undefined;

// The "go to source" affordance placed in a PropertyTable row's trailing slot. `itemName` (the
// header / variable name) gives each link in a table a distinct accessible name.
const gotoLink = (source: InheritedSource, itemName: string, onNavigate: OnNavigate): ReactNode =>
  createElement(InheritedSourceLink, { source, itemName, onNavigate });

/** Inherited header rows for a PropertyTable — each carries a "go to source" link. */
export const inheritedHeaderRows = (headers: InheritedHeaderRow[], onNavigate?: OnNavigate): PropertyRow[] =>
  headers.map((header) => ({
    label: header.name,
    value: header.value,
    disabled: header.disabled,
    description: header.description,
    action: gotoLink(header.source, header.name, onNavigate)
  }));

/** Pre-request variable rows: the item's own vars first, then inherited ones (each with a link).
 *  Shared by the request Execution Context and the folder config. */
export const preVarRows = (
  own: PreRequestVarRow[],
  inherited: InheritedPreRequestVarRow[] = [],
  onNavigate?: OnNavigate
): PropertyRow[] => [
  ...own.map((v) => ({ label: v.name, value: v.value, type: v.type, description: v.description, disabled: v.disabled })),
  ...inherited.map((v) => ({
    label: v.name,
    value: v.value,
    type: v.type,
    description: v.description,
    disabled: v.disabled,
    action: gotoLink(v.source, v.name, onNavigate)
  }))
];

/** Post-response variable rows: own first, then inherited ones (each with a link). */
export const postVarRows = (
  own: PostResponseVarRow[],
  inherited: InheritedPostResponseVarRow[] = [],
  onNavigate?: OnNavigate
): PropertyRow[] => [
  ...own.map((v) => ({ label: v.name, value: v.expression, description: v.description, disabled: v.disabled })),
  ...inherited.map((v) => ({
    label: v.name,
    value: v.expression,
    description: v.description,
    disabled: v.disabled,
    action: gotoLink(v.source, v.name, onNavigate)
  }))
];
