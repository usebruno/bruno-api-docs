import { Controller, Get, Header } from '@nestjs/common';
import { embed } from '@usebruno/api-docs-nestjs';

@Controller()
export class PortalController {
  // the docs inside a page of your own. The module serves the collection and shell.js at /docs;
  // the block only has to know where that mount is.
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  portal(): string {
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Acme Developer Portal</title></head>
<body>
  <h1>Acme Developer Portal</h1>
  ${embed({ base: '/docs' })}
</body>
</html>`;
  }
}
