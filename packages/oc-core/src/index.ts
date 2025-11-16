import OpenCollection from './core/OpenCollection';
import FileCollectionLoader from './core/FileCollectionLoader';

import './styles/index.css';

export {
  OpenCollection,
  FileCollectionLoader,
};

// Re-export types from @opencollection/types
export type {
  OpenCollection as OpenCollectionCollection,
  Item as OpenCollectionItem,
  HttpRequest,
  Folder,
  Script,
  Environment,
  RequestDefaults as BaseConfiguration,
  Auth,
  Scripts,
  Variable,
  Assertion,
  HttpHeader as RequestHeader,
  HttpRequestParam as RequestParam,
  RawBody,
  FormUrlEncodedBody,
  MultipartFormBody,
  FileBody,
  HttpRequestBody as RequestBody,
} from '@opencollection/types';

// Re-export component-specific types
export type { OpenCollectionProps, CustomPage } from './types/component-types';

export * from './hooks';
export { 
  CodeEditor, 
  RequestRunner, 
  RequestHeader as RequestHeaderComponent,
  RequestPane,
  ResponsePane 
} from './ui';
export { 
  requestRunner, 
  RequestRunner as RequestRunnerClass,
  getGlobalVariables,
  clearGlobalVariables 
} from './runner';
