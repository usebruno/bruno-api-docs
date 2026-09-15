// The browser half as the core serves it: shell.html stamped per mount, shell.js static, embed() body-only.

import fs from 'node:fs';
import path from 'node:path';
import type { RendererOptions, ApiDocsOptions } from './options';
import type { HttpResponse, Conditional } from './http';
import { etagOf } from './collection/providers';

/** Hardcoded for the beta */
export const CDN = 'https://cdn.usebruno.com/api-docs';

const SHELL_DIR = path.join(__dirname, '..', 'shell');
const EMBED_START = '<!-- embed:start -->';
const EMBED_END = '<!-- embed:end -->';
const DEFAULT_TITLE = 'API Documentation';

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const stripGitCredentials = (url: string): string => {
  try {
    const parsed = new URL(url);
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || (!parsed.username && !parsed.password)) {
      return url;
    }
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url;
  }
};

/** What the browser is allowed to see. Built from named fields, never copied from the input. */
export function rendererConfig(options: RendererOptions): RendererOptions {
  const config: RendererOptions = {};
  if (options.logo) {
    config.logo = options.logo;
  }
  if (options.gitCollectionUrl) {
    config.gitCollectionUrl = stripGitCredentials(options.gitCollectionUrl);
  }

  return config;
}

export interface Shell {
  html(base: string): HttpResponse;
  js(conditional: Conditional): HttpResponse;
  embed(base: string): string;
}

export function loadShell(options: ApiDocsOptions): Shell {
  const template = fs.readFileSync(path.join(SHELL_DIR, 'shell.html'), 'utf8');
  const script = fs.readFileSync(path.join(SHELL_DIR, 'shell.js'), 'utf8');
  const scriptEtag = etagOf(script);
  const config = escapeHtml(JSON.stringify(rendererConfig(options)));
  const title = escapeHtml(options.pageTitle ?? DEFAULT_TITLE);

  const stamp = (base: string): string =>
    template
      .replaceAll('{{CDN}}', CDN)
      .replaceAll('{{TITLE}}', title)
      .replaceAll('{{BASE}}', escapeHtml(base))
      .replaceAll('{{CONFIG}}', config);

  return {
    html(base): HttpResponse {
      return {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
        body: stamp(base)
      };
    },

    js({ ifNoneMatch }): HttpResponse {
      if (ifNoneMatch === scriptEtag) {
        return { status: 304, headers: {}, body: null };
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'ETag': scriptEtag
        },
        body: script
      };
    },

    embed(base): string {
      const stamped = stamp(base);
      return stamped.slice(stamped.indexOf(EMBED_START), stamped.indexOf(EMBED_END) + EMBED_END.length);
    }
  };
}
