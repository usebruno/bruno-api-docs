import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HttpResponse, Conditional } from '../http';

export interface Routes {
  shell(base: string): HttpResponse;
  shellJs(conditional: Conditional): HttpResponse;
  collection(conditional: Conditional): HttpResponse;
}

/**
 * `url` is the path within the mount and `originalUrl`, when the framework sets it, is the
 * full path. Express gives both. A framework that gives neither has to strip the mount itself
 * before calling this, which is what `mountPath` is for in the NestJS package.
 */
export type Request = IncomingMessage & { originalUrl?: string };

export type Handler = (req: Request, res: ServerResponse) => void;

const header = (req: Request, name: string): string | undefined => req.headers[name] as string | undefined;

const pathOnly = (url: string): string => url.split('?')[0];

export function createHandler(routes: Routes): Handler {
  return (req, res) => {
    const method = (req.method ?? 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();

      return;
    }

    const original = pathOnly(req.originalUrl || req.url || '/');
    const sub = pathOnly(req.url || '/');

    const write = (response: HttpResponse): void => {
      res.writeHead(response.status, response.headers);
      res.end(method === 'HEAD' ? undefined : response.body ?? undefined);
    };

    if (sub === '/shell.js') {
      write(routes.shellJs({ ifNoneMatch: header(req, 'if-none-match') }));

      return;
    }

    if (sub === '/collection.yml') {
      write(routes.collection({ ifNoneMatch: header(req, 'if-none-match') }));

      return;
    }

    // a relative Location survives a reverse proxy that rewrites the prefix
    if (!original.endsWith('/')) {
      const lastSegment = original.split('/').filter(Boolean).pop();
      res.writeHead(301, { Location: lastSegment + '/' });
      res.end();

      return;
    }

    // only meaningful once we know `original` ends in '/', so `sub` is its tail
    const mount = original.slice(0, original.length - sub.length);
    write(routes.shell(mount + '/'));
  };
}
