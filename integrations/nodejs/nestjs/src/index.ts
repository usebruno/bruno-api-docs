import fs from 'node:fs';
import path from 'node:path';
import type { ServerResponse } from 'node:http';
import { Module, type DynamicModule, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { createDocs, embed, type ApiDocsOptions, type Request } from '@usebruno/api-docs-core';

export { createDocs, embed };
export type { ApiDocsOptions, CollectionOptions, CollectionFilters, Filter, RendererOptions, EmbedOptions }
  from '@usebruno/api-docs-core';

export interface ApiDocsModuleOptions extends ApiDocsOptions {
  /** Where the docs mount. Nest gives no way to mount a module from outside, so it is an option. */
  mountPath?: string;
}

const DEFAULT_MOUNT_PATH = '/docs';

/**
 * Nest 10 routes `/*` and its fastify adapter throws on `/*splat`; Nest 11 and 12 route both but log
 * a deprecation warning for `/*`. Read from the installed package, whose `exports` map on 12 no
 * longer lets `require('@nestjs/core/package.json')` through.
 */
export function wildcard(): string {
  let dir = path.dirname(require.resolve('@nestjs/core'));
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    dir = path.dirname(dir);
  }
  const major = Number(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version.split('.')[0]);

  return major >= 11 ? '*splat' : '*';
}

/** Searched for, not stripped: `setGlobalPrefix('api')` moves a `/docs` mount to `/api/docs`. */
export function subPathOf(fullUrl: string, mountPath: string): string {
  const at = fullUrl.indexOf(mountPath);
  if (at === -1) {
    return fullUrl;
  }

  return fullUrl.slice(at + mountPath.length) || '/';
}

/**
 * `ApiDocsModule.forRoot({ collection: '../api-collection', mountPath: '/docs' })`. The path counts
 * from the built entry file, `dist/main.js`, so a collection beside `src/` is one level up.
 */
export class ApiDocsModule {
  static forRoot(options: ApiDocsModuleOptions): DynamicModule {
    const { mountPath: mountOption, ...docsOptions } = options;
    const mountPath = (mountOption ?? DEFAULT_MOUNT_PATH).replace(/\/+$/, '');
    const handler = createDocs(docsOptions).handler();

    @Module({})
    class ApiDocsHostModule implements NestModule {
      configure(consumer: MiddlewareConsumer): void {
        consumer
          .apply((req: Request, res: ServerResponse) => {
            const originalUrl = req.originalUrl ?? req.url ?? '/';
            const url = subPathOf(originalUrl, mountPath);
            handler({ method: req.method, url, originalUrl, headers: req.headers }, res);
          })
          // the mount alone is enough on platform-express, which matches by prefix. On
          // platform-fastify it matches only the mount itself, so the wildcard is what serves
          // shell.js and every deep link
          .forRoutes(mountPath, `${mountPath}/${wildcard()}`);
      }
    }

    return { module: ApiDocsHostModule };
  }
}
