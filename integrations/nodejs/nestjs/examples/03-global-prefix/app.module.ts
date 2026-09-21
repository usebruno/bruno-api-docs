import { Module } from '@nestjs/common';
import { ApiDocsModule } from '@usebruno/api-docs-nestjs';

@Module({
  imports: [ApiDocsModule.forRoot({ collection: '../../api-collection' })]
})
export class AppModule {}
