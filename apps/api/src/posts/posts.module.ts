import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from '../audit/audit.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { BulkImportController } from './bulk-import.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'post-publish' }), AuditModule],
  controllers: [PostsController, BulkImportController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
