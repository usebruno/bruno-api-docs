import * as react from 'react';
import * as reactDom from 'react-dom';
import * as jsxRuntime from 'react/jsx-runtime';
import * as reactRouterDom from 'react-router-dom';
import * as session from '@usebruno/api-shared/session/session';
import * as documentModule from '@usebruno/api-shared/document/document';
import * as variableResolver from '@usebruno/api-shared/hooks/useVariableResolver';
import * as playgroundRuns from '@usebruno/api-shared/session/playgroundRuns';
import * as codeEditor from '@usebruno/api-shared/ui/CodeEditor/CodeEditor';
import * as prism from '@usebruno/api-shared/utils/prism';
import * as fakerFunctions from '@usebruno/api-shared/utils/fakerFunctions';
import * as dataFormatter from '@usebruno/api-shared/utils/dataFormatter';
import type * as Playground from '@usebruno/api-playground';

type PlaygroundModule = typeof Playground;

type CdnWindow = Window & {
  Bruno: Record<string, unknown>;
  __brunoApiPlayground?: PlaygroundModule['default'];
};

const bundleUrl = import.meta.url;
let loading: Promise<PlaygroundModule> | undefined;

export const loadPlayground = (): Promise<PlaygroundModule> =>
  (loading ??= new Promise((resolve, reject) => {
    const w = window as unknown as CdnWindow;
    w.Bruno.__rt = {
      react,
      reactDom,
      jsxRuntime,
      reactRouterDom,
      session,
      document: documentModule,
      variableResolver,
      playgroundRuns,
      codeEditor,
      prism,
      fakerFunctions,
      dataFormatter
    };
    const script = document.createElement('script');
    script.src = new URL(__API_PLAYGROUND_FILE__, bundleUrl).href;
    script.onload = () => resolve({ default: w.__brunoApiPlayground! });
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error(`Failed to load ${script.src}`));
    };
    document.head.appendChild(script);
  }));
