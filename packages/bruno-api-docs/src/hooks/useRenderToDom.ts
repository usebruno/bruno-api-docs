import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';

export const useRenderToDom = (ui: ReactElement) => {
  const root = parse(renderToStaticMarkup(ui));
  root.querySelectorAll('style').forEach((node) => node.remove());
  return root;
};
