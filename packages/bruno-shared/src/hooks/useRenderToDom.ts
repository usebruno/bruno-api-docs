import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import type { ReactElement } from 'react';

export const useRenderToDom = (ui: ReactElement) => {
  const root = parse(renderToStaticMarkup(ui), {
    blockTextElements: { script: true, noscript: true, style: true }
  });
  root.querySelectorAll('style').forEach((node) => node.remove());
  return root;
};
