import { Module } from '@nestjs/common';
import { ApiDocsModule } from '@usebruno/api-docs-nestjs';
import { PortalController } from './portal.controller';

@Module({
  controllers: [PortalController],
  imports: [ApiDocsModule.forRoot({ collectionPath: '../../api-collection' })]
})
export class AppModule {}
