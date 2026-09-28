import { Module } from '@nestjs/common';
import { ApiDocsModule } from '@usebruno/api-docs-nestjs';

@Module({
  imports: [ApiDocsModule.forRoot({ collectionPath: '../../api-collection' })]
})
export class AppModule {}
