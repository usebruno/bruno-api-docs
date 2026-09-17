// The browser half as the core serves it: shell.html stamped per mount, shell.js static, embed() body-only.

import fs from 'node:fs';
import path from 'node:path';
import { ConfigError, type RendererOptions, type ApiDocsOptions } from '../options';
import { etagOf, type HttpResponse, type Conditional } from '../http';

/** Hardcoded for the beta */
export const CDN = 'https://cdn.usebruno.com/api-docs';

const SHELL_DIR = path.join(__dirname, '..', '..', 'shell');
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

let template: string | undefined;
const templateHtml = (): string => (template ??= fs.readFileSync(path.join(SHELL_DIR, 'shell.html'), 'utf8'));

const stamp = (base: string, title: string, options: RendererOptions): string =>
  templateHtml()
    .replaceAll('{{CDN}}', CDN)
    .replaceAll('{{TITLE}}', escapeHtml(title))
    .replaceAll('{{BASE}}', escapeHtml(base))
    .replaceAll('{{CONFIG}}', escapeHtml(JSON.stringify(rendererConfig(options))));

export interface EmbedOptions extends RendererOptions {
  /** The docs mount the block loads shell.js and collection.yml from, e.g. `/docs`. */
  base: string;
}

/**
 * The docs block for a page of your own, body-only. Needs no collection: the mount serves that,
 * the block only has to know where the mount is and what the renderer may see.
 */
export function embed({ base, ...options }: EmbedOptions): string {
  if (!base) {
    throw new ConfigError('embed: `base` (the docs mount, e.g. "/docs") is required');
  }

  const stamped = stamp(base.endsWith('/') ? base : base + '/', DEFAULT_TITLE, options);

  return stamped.slice(stamped.indexOf(EMBED_START), stamped.indexOf(EMBED_END) + EMBED_END.length);
}

export interface Shell {
  html(base: string): HttpResponse;
  js(conditional: Conditional): HttpResponse;
}

export function loadShell(options: ApiDocsOptions): Shell {
  const script = fs.readFileSync(path.join(SHELL_DIR, 'shell.js'), 'utf8');
  const scriptEtag = etagOf(script);
  const title = options.pageTitle ?? DEFAULT_TITLE;

  return {
    html(base): HttpResponse {
      return {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
        body: stamp(base, title, options)
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
    }
  };
}
