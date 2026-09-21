import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // what the docs page needs from a strict CSP. 'self' covers shell.js; the renderer itself comes
  // from cdn.usebruno.com and runs a wasm sandbox, which is what 'wasm-unsafe-eval' and data: are for.
  // The response viewer is Monaco, loaded from cdn.jsdelivr.net when "try it" opens, with its workers.
  // Without these the page still loads and looks fine, and the errors are only in the console.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", 'https://cdn.usebruno.com', 'https://cdn.jsdelivr.net', "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.usebruno.com', 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        workerSrc: ["'self'", 'blob:', 'https://cdn.jsdelivr.net'],
        connectSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net']
      }
    }
  }));

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
