import type { Auth } from '@opencollection/types/common/auth';
import type { HttpRequestBody } from '@opencollection/types/requests/http';
import type { ActionVariableScope } from '@opencollection/types/common/actions';
import type { Description } from '@opencollection/types/common/description';

export interface InheritedSource {
  level: 'collection' | 'folder';
  name: string;
  uuid: string;
}

export interface ResolvedAuth {
  auth?: Auth;
  source?: InheritedSource;
}

/** Display summary for an inheriting item: the parent it resolves from and that parent's mode. */
export interface InheritedAuthSummary {
  sourceName: string;
  modeLabel: string;
}

export interface BodyTableRow {
  name: string;
  value: string;
  partType?: 'text' | 'file';
  contentType?: string;
  disabled?: boolean;
  description?: string;
}

export interface FileBodyRow {
  filePath: string;
  contentType?: string;
  selected?: boolean;
  description?: string;
}

export type BodyView =
  | { render: 'code'; language: string; contentTypeLabel: string; code: string }
  | { render: 'table'; variant: 'urlencoded' | 'multipart'; contentTypeLabel: string; rows: BodyTableRow[] }
  | { render: 'file'; contentTypeLabel: string; files: FileBodyRow[] }
  | { render: 'none' };

export interface SelectedBody {
  body?: HttpRequestBody;
  variants?: { title: string; selected: boolean }[];
}

export type ScriptLevel = 'collection' | 'folder' | 'request';
export type ScriptPhase = 'before-request' | 'after-response';
export type ScriptFlow = 'sandwich' | 'sequential';

export interface ScriptChainStep {
  level: ScriptLevel;
  phase: ScriptPhase;
  label: string;
  sourceName?: string;
  sourceUuid?: string;
  code: string;
  order: number;
}

export interface PreRequestVarRow {
  name: string;
  value: string;
  type?: string;
  description?: string;
  disabled?: boolean;
}

export interface PostResponseVarRow {
  name: string;
  expression: string;
  scope?: string;
  description?: string;
  disabled?: boolean;
}

// Editable post-response variable used by VariablesTab (expr = capture expression).
export interface PostResponseVar {
  name?: string;
  expr?: string;
  disabled?: boolean;
  scope?: ActionVariableScope;
  description?: Description;
}

export interface PostResponseRowInput {
  name?: string;
  value?: string;
  enabled?: boolean;
  scope?: ActionVariableScope;
  description?: Description;
}

export interface InheritedHeaderRow {
  name: string;
  value?: string;
  disabled?: boolean;
  description?: string;
  source: InheritedSource;
}

export type InheritedPreRequestVarRow = PreRequestVarRow & { source: InheritedSource };
export type InheritedPostResponseVarRow = PostResponseVarRow & { source: InheritedSource };

export interface InheritedConfig {
  headers: InheritedHeaderRow[];
  preVars: InheritedPreRequestVarRow[];
  postVars: InheritedPostResponseVarRow[];
}

/** The item's own config keys that override inheritance. Only ENABLED entries override — a disabled
 *  own header/var is not sent, so it must not hide an enabled inherited one. Header keys are
 *  lower-cased (case-insensitive), variable keys are exact, matching the send-path merge. */
export interface OwnConfigKeys {
  headers: Set<string>;
  preVars: Set<string>;
  postVars: Set<string>;
}
