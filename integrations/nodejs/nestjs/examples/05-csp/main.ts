import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // what the docs page needs from a strict CSP. 'self' covers shell.js; the renderer itself comes
  // from cdn.usebruno.com and runs a wasm sandbox, which is what 'wasm-unsafe-eval' and data: are for.
  // Without these the page still loads and looks fine, and the errors are only in the console.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", 'https://cdn.usebruno.com', "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.usebruno.com', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'data:']
      }
    }
  }));

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
