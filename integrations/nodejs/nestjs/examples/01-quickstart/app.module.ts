import { Module } from '@nestjs/common';
import { ApiDocsModule } from '@usebruno/api-docs-nestjs';

@Module({
  imports: [
    // relative to the compiled entry file, dist/01-quickstart/main.js, not to this source file
    // and not to the cwd. From there, examples/api-collection is two levels up.
    ApiDocsModule.forRoot({ collectionPath: '../../api-collection' })
  ]
})
export class AppModule {}
