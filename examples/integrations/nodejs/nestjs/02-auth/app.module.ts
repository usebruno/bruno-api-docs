import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { ApiDocsModule } from '@usebruno/api-docs-nestjs';

// stand-in for your real auth: a session check, a passport strategy, whatever the app already uses
function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (req.headers['x-api-key'] !== 'let-me-in') {
    res.status(401).end();
    return;
  }

  next();
}

@Module({
  imports: [
    ApiDocsModule.forRoot({ collectionPath: '../../api-collection' }),
    ApiDocsModule.forRoot({ mountPath: '/internal/docs', collectionPath: '../../api-collection' })
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // the root module's middleware runs before an imported module's, so the docs never see an
    // unauthenticated request. That includes collection.yml, the file that carries the
    // collection's own auth and variables. /docs stays open.
    consumer.apply(requireApiKey).forRoutes('internal/docs', 'internal/docs/*');
  }
}
